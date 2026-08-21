import { useCallback, useEffect, useMemo } from 'react';
import { FlatList, Image, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { Button } from 'heroui-native';
import { router, useFocusEffect } from 'expo-router';
import { Leaf, MessageCircle, UserPlus } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import { listContent, screenContent } from '@/lib/layout';
import { resolveListingImage } from '@/lib/demoImages';
import { useChatStore } from '@/lib/chatStore';
import { useAppStore } from '@/lib/store';

const POLL_INTERVAL_MS = 6000;

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-TW');
}

export default function ChatScreen() {
  const userId = useAppStore((state) => state.userId);
  const blockedUsers = useAppStore((state) => state.blockedUsers);
  const conversations = useChatStore((state) => state.conversations);
  const isLoadingList = useChatStore((state) => state.isLoadingList);
  const loadConversations = useChatStore((state) => state.loadConversations);

  // Blocking hides the thread from this side; the row itself stays on the server
  // so an unblock brings the history back.
  const visibleConversations = useMemo(
    () =>
      conversations.filter((item) => {
        const counterpartId = item.seller_id === userId ? item.buyer_id : item.seller_id;
        return !blockedUsers[counterpartId];
      }),
    [conversations, blockedUsers, userId],
  );

  const refreshList = useCallback(() => {
    if (!userId) return;
    void loadConversations();
  }, [userId, loadConversations]);

  useFocusEffect(
    useCallback(() => {
      refreshList();
      const timer = setInterval(refreshList, POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [refreshList]),
  );

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  if (!userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={32} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">私訊需要註冊帳號</Text>
          <Text className="text-muted mt-2 text-center text-sm leading-5">
            買賣雙方都註冊後，對話才會綁定在帳號上，交易紀錄與評價也才有依據。瀏覽商品不需要註冊。
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
      <FlatList
        data={visibleConversations}
        keyExtractor={(item) => item.id}
        refreshing={isLoadingList}
        onRefresh={refreshList}
        contentContainerStyle={listContent}
        ListEmptyComponent={
          <View className="items-center px-6 py-14">
            <MessageCircle size={32} color={SAGE} strokeWidth={1.6} />
            <Text className="text-foreground mt-4 text-base font-bold">還沒有對話</Text>
            <Text className="text-muted mt-2 text-center text-sm leading-5">
              在商品詳情頁按「私訊賣家」就會開啟一條對話，出價媒合成功後也可以直接接續聊面交細節。
            </Text>
            <Button className="mt-4" variant="secondary" onPress={() => router.push('/(tabs)')}>
              <Button.Label>去探索首頁找好物</Button.Label>
            </Button>
          </View>
        }
        renderItem={({ item }) => {
          const isSeller = item.seller_id === userId;
          const counterpart = isSeller
            ? (item.buyer_username ?? '易拍通買家')
            : (item.seller_username ?? '易拍通賣家');
          const source = resolveListingImage(item.listing_images?.[0]);

          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
              className="bg-background flex-row items-center rounded-2xl border border-neutral-200 p-3.5"
            >
              <View className="bg-mint h-14 w-14 items-center justify-center overflow-hidden rounded-xl">
                {source ? (
                  <Image source={source} style={{ width: 56, height: 56 }} resizeMode="cover" />
                ) : (
                  <Leaf size={20} color={SAGE} strokeWidth={1.7} />
                )}
              </View>

              <View className="ml-3 flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground text-sm font-bold">
                    {counterpart}
                    <Text className="text-muted text-2xs font-medium">
                      {isSeller ? ' ∙ 買家詢問' : ' ∙ 我是買家'}
                    </Text>
                  </Text>
                  <Text className="text-muted text-2xs">
                    {relativeTime(item.last_at ?? item.created_at)}
                  </Text>
                </View>
                <Text numberOfLines={1} className="text-sage-deep text-2xs mt-0.5 font-medium">
                  {item.listing_title}
                </Text>
                <Text numberOfLines={1} className="text-muted mt-1 text-xs">
                  {item.last_body ?? '尚未有訊息，先打個招呼吧。'}
                </Text>
              </View>

              {item.unread_count > 0 ? (
                <View className="bg-sage ml-2 min-h-5 min-w-5 items-center justify-center rounded-full px-1.5">
                  <Text className="text-2xs font-bold text-white">{item.unread_count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
