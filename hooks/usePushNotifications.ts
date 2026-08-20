// 掛在 root layout：註冊裝置、把待推播的通知推出去、處理點擊推播後的導頁。
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import {
  configurePushRuntime,
  dispatchPendingPush,
  enablePush,
  getPushPreference,
  hrefFromPushData,
  releasePushToken,
} from '@/lib/push';
import { useNotificationStore } from '@/lib/notificationStore';
import { useAppStore } from '@/lib/store';

const FLUSH_INTERVAL_MS = 45_000;

export function usePushNotifications() {
  const userId = useAppStore((state) => state.userId);
  const previousUserId = useRef<string | null>(null);
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    void configurePushRuntime();
  }, []);

  // Register once the account is known; release the token when the account signs out.
  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;

    if (!userId) {
      if (previous) void releasePushToken();
      return;
    }

    void (async () => {
      const preference = await getPushPreference();
      if (preference === 'off') return;
      await enablePush();
      dispatchPendingPush(0);
    })();
  }, [userId]);

  // Someone else's action wrote the notification row, so keep flushing the queue while we are open.
  useEffect(() => {
    if (!userId) return undefined;

    dispatchPendingPush(0);
    const timer = setInterval(() => dispatchPendingPush(0), FLUSH_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      dispatchPendingPush(0);
      void useNotificationStore.getState().load();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [userId]);

  // Tapping a push (or a foreground banner) opens the linked screen.
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const openFrom = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledResponseId.current === id) return;
      handledResponseId.current = id;

      const href = hrefFromPushData(response.notification.request.content.data);
      void useNotificationStore.getState().load();
      router.push(href ?? '/notifications');
    };

    void Notifications.getLastNotificationResponseAsync().then(openFrom);

    const received = Notifications.addNotificationReceivedListener(() => {
      void useNotificationStore.getState().load();
    });
    const responded = Notifications.addNotificationResponseReceivedListener(openFrom);

    return () => {
      received.remove();
      responded.remove();
    };
  }, []);
}
