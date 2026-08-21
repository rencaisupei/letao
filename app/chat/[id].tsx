import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Send, ShieldAlert, ShieldCheck } from 'lucide-react-native';

import { Text, TextInput } from '@/components/ui/primitives/Text';
import { UserActionsSheet } from '@/components/UserActionsSheet';
import { SAGE } from '@/lib/constants';
import { SCREEN_PADDING } from '@/lib/layout';
import { type BlockState, blockNotice, fetchBlockState } from '@/lib/moderation';
import { type Message, useChatStore } from '@/lib/chatStore';
import { useAppStore } from '@/lib/store';

const POLL_INTERVAL_MS = 3000;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAppStore((state) => state.userId);

  const conversations = useChatStore((state) => state.conversations);
  const messagesMap = useChatStore((state) => state.messages);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const loadConversations = useChatStore((state) => state.loadConversations);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const markRead = useChatStore((state) => state.markRead);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [blockState, setBlockState] = useState<BlockState>('none');
  const listRef = useRef<FlatList<Message>>(null);

  const conversation = useMemo(
    () => conversations.find((item) => item.id === id) ?? null,
    [conversations, id],
  );
  const messages = useMemo(() => (id ? (messagesMap[id] ?? []) : []), [messagesMap, id]);

  const isSeller = conversation?.seller_id === userId;
  const counterpartId = conversation
    ? isSeller
      ? conversation.buyer_id
      : conversation.seller_id
    : null;
  const counterpart = conversation
    ? isSeller
      ? (conversation.buyer_username ?? '易拍通買家')
      : (conversation.seller_username ?? '易拍通賣家')
    : '對話';

  const sync = useCallback(() => {
    if (!id) return;
    void loadMessages(id);
  }, [id, loadMessages]);

  useEffect(() => {
    if (conversations.length === 0) {
      void loadConversations();
    }
  }, [conversations.length, loadConversations]);

  // Blocks can come from either side, and only the server knows about the
  // incoming direction, so re-check whenever the thread is opened.
  const syncBlockState = useCallback(() => {
    if (!counterpartId) return;
    void fetchBlockState(counterpartId).then(setBlockState);
  }, [counterpartId]);

  const notice = blockNotice(blockState);

  useEffect(() => {
    syncBlockState();
  }, [syncBlockState]);

  useFocusEffect(
    useCallback(() => {
      sync();
      if (id) void markRead(id);
      const timer = setInterval(sync, POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [sync, markRead, id]),
  );

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [messages.length]);

  const handleSend = async () => {
    if (!id || !userId || draft.trim() === '' || notice !== null) return;
    const body = draft;
    setDraft('');
    setIsSending(true);
    await sendMessage(id, userId, body);
    setIsSending(false);
    void loadConversations();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-canvas flex-1"
    >
      <Stack.Screen
        options={{
          title: counterpart,
          headerRight: counterpartId
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="安全與檢舉"
                  onPress={() => setIsSheetVisible(true)}
                  className="min-h-9 flex-row items-center gap-1 px-2"
                >
                  <ShieldAlert size={17} color={SAGE} strokeWidth={2} />
                  <Text className="text-sage-deep text-xs font-semibold">安全</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      {conversation ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/listing/[id]', params: { id: conversation.listing_id } })
          }
          className="bg-background flex-row items-center border-b border-neutral-200 px-4 py-2.5"
        >
          <View className="flex-1">
            <Text numberOfLines={1} className="text-foreground text-xs font-semibold">
              {conversation.listing_title}
            </Text>
            <Text className="text-sage-deep text-2xs mt-0.5 font-bold">
              NT$ {Number(conversation.listing_price).toLocaleString('en-US')}
            </Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" strokeWidth={2} />
        </Pressable>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SCREEN_PADDING, gap: 8, paddingBottom: 20 }}
        ListHeaderComponent={
          <View className="bg-mint mb-2 flex-row items-start gap-2 rounded-xl p-3.5">
            <ShieldCheck size={15} color={SAGE} strokeWidth={2} />
            <Text className="text-sage-deep text-2xs flex-1 leading-4">
              易拍通安全提醒：請勿在對話中提供銀行帳號、驗證碼或私人證件。面交請約在人潮眾多、設有監視器的公共場所。
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-6 py-10">
            <Text className="text-muted text-center text-sm leading-5">
              還沒有訊息。可以先問商品狀況、可否面交，或確認運送方式。
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMine = item.sender_id === userId;
          return (
            <View className={isMine ? 'items-end' : 'items-start'}>
              <View
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  isMine ? 'bg-sage' : 'bg-background border border-neutral-200'
                }`}
              >
                <Text className={`text-sm leading-5 ${isMine ? 'text-white' : 'text-foreground'}`}>
                  {item.body}
                </Text>
              </View>
              <Text className="text-muted text-2xs mt-1">
                {item.pending ? '傳送中...' : timeLabel(item.created_at)}
              </Text>
            </View>
          );
        }}
      />

      <View className="bg-background pb-safe-offset-2.5 border-t border-neutral-200 px-4 pt-2.5">
        {notice ? (
          <View className="mb-2 flex-row items-start gap-2 rounded-xl bg-red-50 p-3">
            <ShieldAlert size={15} color="#B91C1C" strokeWidth={2} />
            <Text className="text-2xs flex-1 leading-4 text-red-700">{notice}</Text>
          </View>
        ) : null}
        <View className="flex-row items-end gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={notice === null}
            placeholder={notice === null ? '輸入訊息...' : '已封鎖，無法傳送訊息'}
            placeholderTextColorClassName="accent-neutral-400"
            className="bg-canvas text-foreground max-h-24 min-h-11 flex-1 rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm"
          />
          <Button
            size="sm"
            className="h-11 w-11 rounded-full"
            isDisabled={isSending || draft.trim() === '' || notice !== null}
            onPress={() => {
              void handleSend();
            }}
          >
            <Send size={16} color="#FFFFFF" strokeWidth={2.2} />
          </Button>
        </View>
      </View>

      {counterpartId ? (
        <UserActionsSheet
          isVisible={isSheetVisible}
          onClose={() => setIsSheetVisible(false)}
          targetUserId={counterpartId}
          targetName={counterpart}
          conversationId={id ?? null}
          onBlockChange={syncBlockState}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
