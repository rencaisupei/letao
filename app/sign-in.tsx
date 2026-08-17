import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { Redirect } from 'expo-router';
import { Leaf } from 'lucide-react-native';

import { bilt } from '@/lib/bilt';
import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import { useLetaoStore } from '@/lib/store';

export default function SignInScreen() {
  const status = useLetaoStore((state) => state.status);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  if (status === 'ready') {
    return <Redirect href="/" />;
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
      <View className="flex-1 justify-center px-6">
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
              <Text className="text-foreground text-[13px] font-semibold">Email</Text>
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
                我們會寄送 6 位數驗證碼，登入後即可管理商品、EcoCoins 錢包與置頂曝光。
              </Text>
              <Button
                className="mt-4"
                isDisabled={isBusy}
                onPress={() => {
                  void sendCode();
                }}
              >
                <Button.Label>{isBusy ? '寄送中...' : '寄送驗證碼'}</Button.Label>
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
                <Button.Label>{isBusy ? '驗證中...' : '登入樂淘'}</Button.Label>
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
      </View>
    </KeyboardAvoidingView>
  );
}
