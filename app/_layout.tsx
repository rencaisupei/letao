// oxlint-disable-next-line eslint-plugin-import/no-unassigned-import
import '../global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import * as DevClient from 'expo-dev-client';
import { HeroUINativeProvider } from 'heroui-native';
import { Uniwind } from 'uniwind';
import {
  ErrorBoundary as ExpoErrorBoundary,
  type ErrorBoundaryProps,
  SplashScreen,
  Stack,
} from 'expo-router';

import { initPostHog } from '@/lib/posthog';
import { registerServiceWorker } from '@/lib/registerServiceWorker';
import { reportErrorToParent } from '@/lib/reportPreviewError';
import { InstallPrompt } from '@/components/InstallPrompt';
import { AlertHost } from '@/components/AlertHost';
import { useAppStore } from '@/lib/store';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Custom ErrorBoundary that reports React render errors to the parent window (Bilt preview iframe)
 * and then renders the default Expo error UI.
 */
function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    if (Platform.OS === 'web' && error) {
      const message = [error.message, error.stack].filter(Boolean).join('\n');
      reportErrorToParent(message);
    }
  }, [error]);
  return <ExpoErrorBoundary error={error} retry={retry} />;
}

export { ErrorBoundary };

// Starter is light-only by default. Remove this when implementing requested dark mode.
Uniwind.setTheme('light');

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initStore = useAppStore((state) => state.init);

  useEffect(() => {
    initStore();
  }, [initStore]);

  usePushNotifications();

  // Report uncaught JS errors and unhandled promise rejections to parent (Bilt preview iframe)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const handleError = (event: ErrorEvent) => {
      const message = event.error?.stack ?? event.message ?? 'Unknown error';
      reportErrorToParent(message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const message =
        err instanceof Error ? [err.message, err.stack].filter(Boolean).join('\n') : String(err);
      reportErrorToParent(message);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (__DEV__ && Platform.OS !== 'web' && !isExpoGo) {
      const timer = setTimeout(() => {
        DevClient.closeMenu();
        DevClient.hideMenu();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      initPostHog();
    }
  }, []);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  /*
   * No web font is loaded on purpose. The UI is Traditional Chinese, and Latin
   * webfonts (Inter and friends) carry no CJK glyphs — forcing one as the
   * default family makes Android draw tofu boxes for 中文 instead of falling
   * back. Every screen therefore uses the platform UI font (SF Pro on iOS,
   * Roboto + Noto Sans CJK on Android), which is also what the web preview
   * renders, so device and browser now match.
   */
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        {/* App-wide: the canvas is always light, so status bar content stays dark on
            every screen (tabs, stack screens and native modals alike). */}
        {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar's `style` prop is a string enum ("dark"/"light"/"auto"), not a React Native style object */}
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#111827',
            headerTitleStyle: { fontSize: 17, fontWeight: '600' },
            contentStyle: { backgroundColor: '#F8F9FA' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ title: '易拍通', headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="listing/[id]" options={{ title: '商品詳情' }} />
          <Stack.Screen name="seller/[id]" options={{ title: '賣家主頁' }} />
          <Stack.Screen name="chat/[id]" options={{ title: '對話' }} />
          <Stack.Screen name="favorites" options={{ title: '我的收藏' }} />
          <Stack.Screen name="orders" options={{ title: '我的交易' }} />
          <Stack.Screen name="order/[id]" options={{ title: '交易詳情' }} />
          <Stack.Screen name="notifications" options={{ title: '通知中心' }} />
          <Stack.Screen name="account" options={{ title: '編輯個人資料' }} />
          <Stack.Screen name="privacy" options={{ title: '隱私權政策' }} />
          <Stack.Screen name="contact" options={{ title: '聯絡我們' }} />
          <Stack.Screen name="faq" options={{ title: '常見問題' }} />
        </Stack>
        <AlertHost />
        <InstallPrompt />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
