import { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { BellOff, UserPlus } from 'lucide-react-native';

import { SAGE, getNotificationMeta } from '@/lib/constants';
import { goBackOrReplace } from '@/lib/navigation';
import { notificationHref } from '@/lib/push';
import { type AppNotification, useNotificationStore } from '@/lib/notificationStore';
import { PushToggle } from '@/components/PushToggle';
import { useAppStore } from '@/lib/store';

const POLL_INTERVAL_MS = 15_000;

function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-TW');
}

function openTarget(item: AppNotification) {
  const href = notificationHref(item.link_type, item.link_id);
  if (href) router.push(href);
}

export default function NotificationsScreen() {
  const userId = useAppStore((state) => state.userId);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const load = useNotificationStore((state) => state.load);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  const refresh = useCallback(() => {
    if (!userId) return;
    void load();
  }, [userId, load]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  if (!userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ title: '通知中心' }} />
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={30} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">通知需要註冊帳號</Text>
          <Text className="text-muted mt-2 text-center text-[13px] leading-5">
            註冊後才會收到出價、私訊、審核結果與檢舉處理的通知。
          </Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊 / 登入</Button.Label>
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="bg-canvas flex-1">
      <Stack.Screen options={{ title: '通知中心' }} />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={refresh}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <PushToggle />
            <View className="mb-1 flex-row items-center justify-between px-1">
              <Text className="text-muted text-[11px]">
                {unreadCount > 0 ? `${unreadCount} 則未讀通知` : '沒有未讀通知'}
              </Text>
              {unreadCount > 0 ? (
                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => {
                    void markAllRead();
                  }}
                >
                  <Button.Label>全部標記已讀</Button.Label>
                </Button>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-8 py-16">
            <BellOff size={30} color={SAGE} strokeWidth={1.6} />
            <Text className="text-foreground mt-4 text-base font-bold">還沒有通知</Text>
            <Text className="text-muted mt-2 text-center text-[13px] leading-5">
              收到出價、私訊、審核結果、檢舉處理、客服回覆或每日 EcoCoins 入帳時，都會出現在這裡。
            </Text>
            <Button className="mt-4" variant="secondary" onPress={() => goBackOrReplace('/')}>
              <Button.Label>回到探索首頁</Button.Label>
            </Button>
          </View>
        }
        renderItem={({ item }) => {
          const meta = getNotificationMeta(item.kind);
          const isUnread = item.read_at === null;

          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void markRead(item.id);
                openTarget(item);
              }}
              className={`flex-row rounded-2xl border p-3.5 ${
                isUnread ? 'border-sage/40 bg-mint' : 'bg-background border-neutral-200'
              }`}
            >
              <Text className="mt-0.5 text-[16px]">{meta.emoji}</Text>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-[13px] font-bold ${
                      isUnread ? 'text-sage-deep' : 'text-foreground'
                    }`}
                  >
                    {item.title}
                  </Text>
                  <Text className="text-muted text-[10px]">{relativeTime(item.created_at)}</Text>
                </View>
                {item.body ? (
                  <Text className="text-muted mt-1 text-[12px] leading-4">{item.body}</Text>
                ) : null}
                <Text className="text-muted mt-1.5 text-[10px] font-medium">{meta.label}</Text>
              </View>
              {isUnread ? <View className="bg-sage mt-1.5 ml-2 h-2 w-2 rounded-full" /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
