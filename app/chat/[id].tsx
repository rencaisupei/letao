import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Send, ShieldCheck } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import { type Message, useChatStore } from '@/lib/chatStore';
import { useLetaoStore } from '@/lib/store';

const POLL_INTERVAL_MS = 3000;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useLetaoStore((state) => state.userId);

  const conversations = useChatStore((state) => state.conversations);
  const messagesMap = useChatStore((state) => state.messages);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const loadConversations = useChatStore((state) => state.loadConversations);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const markRead = useChatStore((state) => state.markRead);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const conversation = useMemo(
    () => conversations.find((item) => item.id === id) ?? null,
    [conversations, id],
  );
  const messages = useMemo(() => (id ? (messagesMap[id] ?? []) : []), [messagesMap, id]);

  const isSeller = conversation?.seller_id === userId;
  const counterpart = conversation
    ? isSeller
      ? (conversation.buyer_username ?? '樂淘買家')
      : (conversation.seller_username ?? '樂淘賣家')
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
    if (!id || !userId || draft.trim() === '') return;
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
      <Stack.Screen options={{ title: counterpart }} />

      {conversation ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/listing/[id]', params: { id: conversation.listing_id } })
          }
          className="bg-background flex-row items-center border-b border-neutral-200 px-4 py-2.5"
        >
          <View className="flex-1">
            <Text numberOfLines={1} className="text-foreground text-[12px] font-semibold">
              {conversation.listing_title}
            </Text>
            <Text className="text-sage-deep mt-0.5 text-[11px] font-bold">
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
        contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: 20 }}
        ListHeaderComponent={
          <View className="bg-mint mb-2 flex-row items-start gap-2 rounded-xl p-3">
            <ShieldCheck size={15} color={SAGE} strokeWidth={2} />
            <Text className="text-sage-deep flex-1 text-[11px] leading-4">
              樂淘安全提醒：請勿在對話中提供銀行帳號、驗證碼或私人證件。面交請約在人潮眾多、設有監視器的公共場所。
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-6 py-10">
            <Text className="text-muted text-center text-[13px] leading-5">
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
                <Text
                  className={`text-[13px] leading-5 ${isMine ? 'text-white' : 'text-foreground'}`}
                >
                  {item.body}
                </Text>
              </View>
              <Text className="text-muted mt-1 text-[10px]">
                {item.pending ? '傳送中...' : timeLabel(item.created_at)}
              </Text>
            </View>
          );
        }}
      />

      <View className="bg-background pb-safe-offset-2.5 flex-row items-end gap-2 border-t border-neutral-200 px-3 pt-2.5">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="輸入訊息..."
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-canvas text-foreground max-h-24 min-h-11 flex-1 rounded-2xl border border-neutral-200 px-4 py-2.5 text-[13px]"
        />
        <Button
          size="sm"
          className="h-11 w-11 rounded-full"
          isDisabled={isSending || draft.trim() === ''}
          onPress={() => {
            void handleSend();
          }}
        >
          <Send size={16} color="#FFFFFF" strokeWidth={2.2} />
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
