import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { Redirect, Stack } from 'expo-router';

import { BrandLockup } from '@/components/BrandHeader';
import { PasswordField } from '@/components/PasswordField';
import { SelectChip } from '@/components/SelectChip';
import { bilt } from '@/lib/bilt';
import { showAlert } from '@/lib/alert';
import {
  MIN_PASSWORD_LENGTH,
  describePasswordSignInError,
  describePasswordUpdateError,
  describeSendError,
  describeSignUpError,
  describeVerifyError,
} from '@/lib/authErrors';
import { ROLE_OPTIONS, type UserRole } from '@/lib/constants';
import { goBackOrReplace } from '@/lib/navigation';
import { useAppStore } from '@/lib/store';

type Mode = 'password' | 'signup' | 'code' | 'reset';
type Stage = 'input' | 'verify';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MODE_TITLE: Record<Mode, string> = {
  password: '用密碼登入',
  signup: '註冊新帳號',
  code: '用驗證碼登入',
  reset: '重設密碼',
};

function FieldLabel({ children, className }: { children: string; className?: string }) {
  return (
    <Text className={`text-foreground text-[13px] font-semibold ${className ?? ''}`}>
      {children}
    </Text>
  );
}

export default function SignInScreen() {
  const status = useAppStore((state) => state.status);
  const setPendingRole = useAppStore((state) => state.setPendingRole);

  const [mode, setMode] = useState<Mode>('password');
  const [stage, setStage] = useState<Stage>('input');
  const [role, setRole] = useState<UserRole>('both');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (status === 'ready') {
    return <Redirect href="/(tabs)" />;
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setStage('input');
    setCode('');
    setPassword('');
    setConfirmPassword('');
  };

  const readEmail = () => {
    const target = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(target)) {
      showAlert({
        title: '請輸入有效的 Email',
        tone: 'danger',
        message: '例如 you@example.com，請確認有 @ 與網域。',
      });
      return null;
    }
    return target;
  };

  const readNewPassword = () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      showAlert({
        title: '密碼太短',
        tone: 'danger',
        message: `請設定至少 ${MIN_PASSWORD_LENGTH} 個字的密碼，建議混合英文與數字。`,
      });
      return null;
    }
    if (password !== confirmPassword) {
      showAlert({
        title: '兩次密碼不一致',
        tone: 'danger',
        message: '請確認「密碼」與「再次輸入密碼」相同。',
      });
      return null;
    }
    return password;
  };

  const signInWithPassword = async () => {
    const target = readEmail();
    if (!target) return;
    if (password.length === 0) {
      showAlert({ title: '請輸入密碼', tone: 'danger', message: '密碼欄位還是空的。' });
      return;
    }

    setIsBusy(true);
    const { error } = await bilt.auth.signInWithPassword({ email: target, password });
    setIsBusy(false);

    if (error) {
      const info = describePasswordSignInError(error);
      if (info.retryAfterSeconds) setCooldown(info.retryAfterSeconds);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
    }
  };

  const signUpWithPassword = async () => {
    const target = readEmail();
    if (!target) return;
    const nextPassword = readNewPassword();
    if (!nextPassword) return;

    setPendingRole(role);
    setIsBusy(true);
    const { data, error } = await bilt.auth.signUp({ email: target, password: nextPassword });
    setIsBusy(false);

    if (error) {
      const info = describeSignUpError(error);
      if (info.retryAfterSeconds) setCooldown(info.retryAfterSeconds);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
      return;
    }

    // Already-registered addresses come back as a user with no identities and no
    // email, so the code never arrives. Send them to the password form instead.
    if (data.user && (data.user.identities?.length ?? 0) === 0 && !data.session) {
      showAlert({
        title: '這個 Email 已經註冊過',
        tone: 'danger',
        message: '請改用密碼登入。忘記密碼的話按「忘記密碼」重設一組。',
      });
      switchMode('password');
      return;
    }

    if (data.session) return;

    setCode('');
    setCooldown(60);
    setStage('verify');
  };

  const sendCode = async () => {
    const target = readEmail();
    if (!target) return;

    setIsBusy(true);
    const { error } = await bilt.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: mode !== 'reset' },
    });
    setIsBusy(false);

    if (error) {
      const info = describeSendError(error);
      if (info.retryAfterSeconds) setCooldown(info.retryAfterSeconds);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
      return;
    }

    setCode('');
    setCooldown(60);
    setStage('verify');
  };

  const sendResetCode = async () => {
    const target = readEmail();
    if (!target) return;

    setIsBusy(true);
    const { error } = await bilt.auth.resetPasswordForEmail(target);
    setIsBusy(false);

    if (error) {
      const info = describeSendError(error);
      if (info.retryAfterSeconds) setCooldown(info.retryAfterSeconds);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
      return;
    }

    setCode('');
    setPassword('');
    setConfirmPassword('');
    setCooldown(60);
    setStage('verify');
  };

  const readCode = () => {
    const token = code.trim();
    if (token.length < 6) {
      showAlert({ title: '驗證碼不完整', tone: 'danger', message: '請輸入信件中的 6 位數字。' });
      return null;
    }
    return token;
  };

  const verifySignUp = async () => {
    const target = readEmail();
    const token = readCode();
    if (!target || !token) return;

    setPendingRole(role);
    setIsBusy(true);
    const first = await bilt.auth.verifyOtp({ email: target, token, type: 'signup' });
    // A resent code arrives as a plain email OTP, so accept that type as well.
    const result = first.error
      ? await bilt.auth.verifyOtp({ email: target, token, type: 'email' })
      : first;
    setIsBusy(false);

    if (result.error) {
      const info = describeVerifyError(first.error ?? result.error);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
    }
  };

  const verifyCode = async () => {
    const target = readEmail();
    const token = readCode();
    if (!target || !token) return;

    setPendingRole(role);
    setIsBusy(true);
    const { error } = await bilt.auth.verifyOtp({ email: target, token, type: 'email' });
    setIsBusy(false);

    if (error) {
      const info = describeVerifyError(error);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
    }
  };

  const applyNewPassword = async () => {
    const target = readEmail();
    const token = readCode();
    if (!target || !token) return;
    const nextPassword = readNewPassword();
    if (!nextPassword) return;

    setIsBusy(true);
    const verified = await bilt.auth.verifyOtp({ email: target, token, type: 'recovery' });
    if (verified.error) {
      setIsBusy(false);
      const info = describeVerifyError(verified.error);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
      return;
    }

    const { error } = await bilt.auth.updateUser({ password: nextPassword });
    setIsBusy(false);

    if (error) {
      const info = describePasswordUpdateError(error);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
      return;
    }

    showAlert({
      title: '密碼已更新',
      tone: 'success',
      message: '下次可以直接用這組密碼登入。',
    });
  };

  const emailField = (
    <>
      <FieldLabel>Email</FieldLabel>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColorClassName="accent-neutral-400"
        className="bg-canvas text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
      />
    </>
  );

  const codeField = (
    <>
      <FieldLabel>驗證碼</FieldLabel>
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
      <Text className="text-muted mt-1 text-[11px] leading-4">
        信件可能被歸到垃圾信匣，主旨會包含驗證碼。若同時寄了多封，只有最新一封有效。
      </Text>
    </>
  );

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
          <BrandLockup layout="stacked" />
        </View>

        <View className="bg-background mt-8 rounded-2xl border border-neutral-200 p-5">
          <Text className="text-foreground text-[15px] font-bold">{MODE_TITLE[mode]}</Text>

          {mode === 'password' ? (
            <>
              <Text className="text-muted mt-1 text-[11px] leading-4">
                已經有帳號就直接輸入 Email 與密碼，不用等驗證碼。
              </Text>
              <View className="mt-4">{emailField}</View>
              <FieldLabel className="mt-4">密碼</FieldLabel>
              <PasswordField value={password} onChangeText={setPassword} placeholder="輸入密碼" />
              <Button
                className="mt-4"
                isDisabled={isBusy}
                onPress={() => {
                  void signInWithPassword();
                }}
              >
                <Button.Label>{isBusy ? '登入中...' : '登入'}</Button.Label>
              </Button>
              <View className="mt-2 flex-row">
                <Button variant="tertiary" className="flex-1" onPress={() => switchMode('reset')}>
                  <Button.Label>忘記密碼</Button.Label>
                </Button>
                <Button variant="tertiary" className="flex-1" onPress={() => switchMode('code')}>
                  <Button.Label>改用驗證碼登入</Button.Label>
                </Button>
              </View>
            </>
          ) : null}

          {mode === 'signup' ? (
            stage === 'input' ? (
              <>
                <Text className="text-muted mt-1 text-[11px] leading-4">
                  設定一組密碼，之後就能直接登入。首次註冊仍需一次 Email 驗證碼確認信箱。
                </Text>

                <FieldLabel className="mt-4">您想以什麼身分使用易拍通？</FieldLabel>
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

                <View className="mt-4">{emailField}</View>
                <FieldLabel className="mt-4">密碼</FieldLabel>
                <PasswordField
                  value={password}
                  onChangeText={setPassword}
                  placeholder={`至少 ${MIN_PASSWORD_LENGTH} 個字`}
                />
                <FieldLabel className="mt-4">再次輸入密碼</FieldLabel>
                <PasswordField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="再輸入一次"
                />
                <Text className="text-muted mt-2 text-[11px] leading-4">
                  驗證完成即開通帳號，並自動建立 EcoCoins 錢包。
                </Text>
                <Button
                  className="mt-4"
                  isDisabled={isBusy || cooldown > 0}
                  onPress={() => {
                    void signUpWithPassword();
                  }}
                >
                  <Button.Label>
                    {isBusy ? '建立中...' : cooldown > 0 ? `請等 ${cooldown} 秒` : '建立帳號'}
                  </Button.Label>
                </Button>
              </>
            ) : (
              <>
                <Text className="text-muted mt-1 text-[11px] leading-4">
                  最後一步：輸入信件中的驗證碼，密碼就會生效。
                </Text>
                <View className="mt-4">{codeField}</View>
                <Button
                  className="mt-4"
                  isDisabled={isBusy}
                  onPress={() => {
                    void verifySignUp();
                  }}
                >
                  <Button.Label>{isBusy ? '驗證中...' : '完成註冊'}</Button.Label>
                </Button>
                <Button
                  variant="secondary"
                  className="mt-2"
                  isDisabled={isBusy || cooldown > 0}
                  onPress={() => {
                    void sendCode();
                  }}
                >
                  <Button.Label>
                    {cooldown > 0 ? `重新寄送（${cooldown} 秒）` : '重新寄送驗證碼'}
                  </Button.Label>
                </Button>
                <Button variant="tertiary" className="mt-2" onPress={() => setStage('input')}>
                  <Button.Label>回上一步</Button.Label>
                </Button>
              </>
            )
          ) : null}

          {mode === 'code' ? (
            stage === 'input' ? (
              <>
                <Text className="text-muted mt-1 text-[11px] leading-4">
                  不想記密碼就用這個方式，驗證碼會寄到你的信箱。沒有帳號也會直接建立。
                </Text>

                <FieldLabel className="mt-4">您想以什麼身分使用易拍通？</FieldLabel>
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

                <View className="mt-4">{emailField}</View>
                <Button
                  className="mt-4"
                  isDisabled={isBusy || cooldown > 0}
                  onPress={() => {
                    void sendCode();
                  }}
                >
                  <Button.Label>
                    {isBusy ? '寄送中...' : cooldown > 0 ? `請等 ${cooldown} 秒` : '寄送驗證碼'}
                  </Button.Label>
                </Button>
                <Button variant="tertiary" className="mt-2" onPress={() => switchMode('password')}>
                  <Button.Label>改用密碼登入</Button.Label>
                </Button>
              </>
            ) : (
              <>
                <View className="mt-4">{codeField}</View>
                <Button
                  className="mt-4"
                  isDisabled={isBusy}
                  onPress={() => {
                    void verifyCode();
                  }}
                >
                  <Button.Label>{isBusy ? '驗證中...' : '登入'}</Button.Label>
                </Button>
                <Button
                  variant="secondary"
                  className="mt-2"
                  isDisabled={isBusy || cooldown > 0}
                  onPress={() => {
                    void sendCode();
                  }}
                >
                  <Button.Label>
                    {cooldown > 0 ? `重新寄送（${cooldown} 秒）` : '重新寄送驗證碼'}
                  </Button.Label>
                </Button>
                <Button variant="tertiary" className="mt-2" onPress={() => setStage('input')}>
                  <Button.Label>換一個 Email</Button.Label>
                </Button>
              </>
            )
          ) : null}

          {mode === 'reset' ? (
            stage === 'input' ? (
              <>
                <Text className="text-muted mt-1 text-[11px] leading-4">
                  輸入註冊時的
                  Email，我們會寄一組驗證碼讓你設定新密碼。之前用驗證碼註冊、還沒有密碼的帳號也可以用這個方式設定。
                </Text>
                <View className="mt-4">{emailField}</View>
                <Button
                  className="mt-4"
                  isDisabled={isBusy || cooldown > 0}
                  onPress={() => {
                    void sendResetCode();
                  }}
                >
                  <Button.Label>
                    {isBusy ? '寄送中...' : cooldown > 0 ? `請等 ${cooldown} 秒` : '寄送重設驗證碼'}
                  </Button.Label>
                </Button>
                <Button variant="tertiary" className="mt-2" onPress={() => switchMode('password')}>
                  <Button.Label>回登入</Button.Label>
                </Button>
              </>
            ) : (
              <>
                <View className="mt-4">{codeField}</View>
                <FieldLabel className="mt-4">新密碼</FieldLabel>
                <PasswordField
                  value={password}
                  onChangeText={setPassword}
                  placeholder={`至少 ${MIN_PASSWORD_LENGTH} 個字`}
                />
                <FieldLabel className="mt-4">再次輸入新密碼</FieldLabel>
                <PasswordField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="再輸入一次"
                />
                <Button
                  className="mt-4"
                  isDisabled={isBusy}
                  onPress={() => {
                    void applyNewPassword();
                  }}
                >
                  <Button.Label>{isBusy ? '設定中...' : '設定新密碼並登入'}</Button.Label>
                </Button>
                <Button
                  variant="secondary"
                  className="mt-2"
                  isDisabled={isBusy || cooldown > 0}
                  onPress={() => {
                    void sendResetCode();
                  }}
                >
                  <Button.Label>
                    {cooldown > 0 ? `重新寄送（${cooldown} 秒）` : '重新寄送驗證碼'}
                  </Button.Label>
                </Button>
                <Button variant="tertiary" className="mt-2" onPress={() => switchMode('password')}>
                  <Button.Label>取消重設</Button.Label>
                </Button>
              </>
            )
          ) : null}
        </View>

        {mode === 'signup' ? (
          <Button variant="secondary" className="mt-3" onPress={() => switchMode('password')}>
            <Button.Label>已經有帳號了，改用密碼登入</Button.Label>
          </Button>
        ) : (
          <Button variant="secondary" className="mt-3" onPress={() => switchMode('signup')}>
            <Button.Label>還沒有帳號？註冊新帳號</Button.Label>
          </Button>
        )}

        <Button variant="tertiary" className="mt-2" onPress={() => goBackOrReplace('/(tabs)')}>
          <Button.Label>先繼續逛逛，不註冊</Button.Label>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
