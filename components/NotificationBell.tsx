import { useCallback, useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import { useNotificationStore } from '@/lib/notificationStore';
import { useAppStore } from '@/lib/store';

const POLL_INTERVAL_MS = 20_000;

/** Header bell with the unread badge. Keeps polling while any tab is mounted. */
export function NotificationBell() {
  const userId = useAppStore((state) => state.userId);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const load = useNotificationStore((state) => state.load);
  const reset = useNotificationStore((state) => state.reset);

  const refresh = useCallback(() => {
    if (!userId) {
      reset();
      return;
    }
    void load();
  }, [userId, load, reset]);

  useEffect(() => {
    refresh();
    if (!userId) return undefined;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh, userId]);

  if (!userId) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`通知中心，${unreadCount} 則未讀`}
      onPress={() => router.push('/notifications')}
      className="h-9 w-9 items-center justify-center"
    >
      <Bell size={20} color={SAGE} strokeWidth={2} />
      {unreadCount > 0 ? (
        <View className="absolute top-1 right-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1">
          <Text className="text-2xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
