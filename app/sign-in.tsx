import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { Redirect, Stack } from 'expo-router';
import { Leaf } from 'lucide-react-native';

import { SelectChip } from '@/components/SelectChip';
import { bilt } from '@/lib/bilt';
import { showAlert } from '@/lib/alert';
import { ROLE_OPTIONS, SAGE, type UserRole } from '@/lib/constants';
import { goBackOrReplace } from '@/lib/navigation';
import { useLetaoStore } from '@/lib/store';

export default function SignInScreen() {
  const status = useLetaoStore((state) => state.status);
  const setPendingRole = useLetaoStore((state) => state.setPendingRole);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [role, setRole] = useState<UserRole>('both');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  if (status === 'ready') {
    return <Redirect href="/(tabs)" />;
  }

  const sendCode = async () => {
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      showAlert({ title: '請輸入有效的 Email', tone: 'danger', message: '驗證碼會寄到這個信箱。' });
      return;
    }

    setIsBusy(true);
    const { error } = await bilt.auth.signInWithOtp({ email: target });
    setIsBusy(false);

    if (error) {
      showAlert({ title: '寄送失敗', tone: 'danger', message: '驗證碼沒有寄出，請稍後再試。' });
      return;
    }

    setStep('code');
  };

  const verifyCode = async () => {
    const token = code.trim();
    if (token.length < 6) {
      showAlert({ title: '驗證碼不完整', tone: 'danger', message: '請輸入信件中的 6 位數字。' });
      return;
    }

    setPendingRole(role);
    setIsBusy(true);
    const { error } = await bilt.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
    });
    setIsBusy(false);

    if (error) {
      showAlert({
        title: '驗證碼不正確',
        tone: 'danger',
        message: '請確認信件中的號碼後再試一次。',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-canvas p-safe flex-1"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <View className="bg-mint h-14 w-14 items-center justify-center rounded-2xl">
            <Leaf size={28} color={SAGE} strokeWidth={1.8} />
          </View>
          <Text className="text-foreground mt-4 text-[22px] font-bold">樂淘拍賣 Letao</Text>
          <Text className="text-sage-deep mt-1 text-[11px] font-semibold tracking-[3px]">
            新 歡 舊 愛 ∙ 皆 可 樂 淘
          </Text>
        </View>

        <View className="bg-background mt-8 rounded-2xl border border-neutral-200 p-5">
          {step === 'email' ? (
            <>
              <Text className="text-foreground text-[13px] font-semibold">
                您想以什麼身分使用樂淘？
              </Text>
              <View className="mt-2 gap-1.5">
                {ROLE_OPTIONS.map((option) => (
                  <SelectChip
                    key={option.code}
                    label={`${option.label} ｜ ${option.hint}`}
                    isSelected={role === option.code}
                    onPress={() => setRole(option.code)}
                    className="h-11 w-full items-start justify-center rounded-xl px-4"
                  />
                ))}
              </View>
              <Text className="text-muted mt-2 text-[11px] leading-4">
                買家與賣家共用同一組帳號，之後可以隨時切換身分使用全部功能。
              </Text>

              <Text className="text-foreground mt-4 text-[13px] font-semibold">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColorClassName="accent-neutral-400"
                className="bg-canvas text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
              />
              <Text className="text-muted mt-2 text-[11px] leading-4">
                按下按鈕後才會寄出 6 位數驗證碼。首次驗證即完成註冊，並自動建立 EcoCoins 錢包。
              </Text>
              <Button
                className="mt-4"
                isDisabled={isBusy}
                onPress={() => {
                  void sendCode();
                }}
              >
                <Button.Label>{isBusy ? '寄送中...' : '寄送驗證碼並註冊'}</Button.Label>
              </Button>
            </>
          ) : (
            <>
              <Text className="text-foreground text-[13px] font-semibold">驗證碼</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="6 位數字"
                placeholderTextColorClassName="accent-neutral-400"
                className="bg-canvas text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-center text-base tracking-[6px]"
              />
              <Text className="text-muted mt-2 text-[11px]">已寄送至 {email.trim()}</Text>
              <Button
                className="mt-4"
                isDisabled={isBusy}
                onPress={() => {
                  void verifyCode();
                }}
              >
                <Button.Label>{isBusy ? '驗證中...' : '完成註冊 / 登入'}</Button.Label>
              </Button>
              <Button
                variant="tertiary"
                className="mt-2"
                onPress={() => {
                  setCode('');
                  setStep('email');
                }}
              >
                <Button.Label>換一個 Email</Button.Label>
              </Button>
            </>
          )}
        </View>

        <Button variant="tertiary" className="mt-3" onPress={() => goBackOrReplace('/(tabs)')}>
          <Button.Label>先繼續逛逛，不註冊</Button.Label>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
