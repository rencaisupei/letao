import { create } from 'zustand';

import { bilt } from '@/lib/bilt';
import { dispatchPendingPush } from '@/lib/push';

export type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  listing_title: string;
  listing_price: number | string;
  listing_images: string[] | null;
  buyer_username: string | null;
  seller_username: string | null;
  last_body: string | null;
  last_at: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** true while an optimistic message waits for the server row */
  pending?: boolean;
};

type ChatState = {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  isLoadingList: boolean;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, senderId: string, body: string) => Promise<boolean>;
  startConversation: (listingId: string) => Promise<string | null>;
  markRead: (conversationId: string) => Promise<void>;
  reset: () => void;
};

function asRows<T>(value: unknown): T[] {
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting untyped API rows to the caller-supplied shape
  return Array.isArray(value) ? (value as T[]) : [];
}

// eslint-disable-next-line typescript/no-unnecessary-type-parameters -- T is set explicitly by callers to shape untyped API rows
function asRow<T>(value: unknown): T | null {
  const first = Array.isArray(value) ? value[0] : value;
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting an untyped API row to the caller-supplied shape
  return (first ?? null) as T | null;
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of existing) {
    byId.set(message.id, message);
  }
  for (const message of incoming) {
    byId.set(message.id, message);
  }

  const serverBodies = new Set(incoming.map((message) => `${message.sender_id}|${message.body}`));
  const merged = [...byId.values()].filter(
    (message) => !message.pending || !serverBodies.has(`${message.sender_id}|${message.body}`),
  );

  return merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  isLoadingList: false,

  loadConversations: async () => {
    set({ isLoadingList: true });
    const { data } = await bilt
      .from('conversation_overview')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const rows = asRows<Conversation>(data).sort((a, b) => {
      const aTime = a.last_at ?? a.created_at;
      const bTime = b.last_at ?? b.created_at;
      return bTime.localeCompare(aTime);
    });

    set({ conversations: rows, isLoadingList: false });
  },

  loadMessages: async (conversationId) => {
    const known = get().messages[conversationId] ?? [];
    // The thread polls every few seconds. After the first load only ask for rows
    // newer than the newest one we already hold, instead of refetching the whole
    // history each tick.
    const latest = known.reduce<string | null>(
      (newest, message) =>
        message.pending || (newest !== null && message.created_at <= newest)
          ? newest
          : message.created_at,
      null,
    );

    let query = bilt
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at')
      .eq('conversation_id', conversationId);

    query =
      latest === null
        ? // First open: newest 100 rows, reversed by mergeMessages below.
          query.order('created_at', { ascending: false }).limit(100)
        : query.gt('created_at', latest).order('created_at', { ascending: true }).limit(100);

    const { data } = await query;

    const incoming = asRows<Message>(data);
    if (incoming.length === 0 && known.length > 0) return;

    set({
      messages: {
        ...get().messages,
        [conversationId]: mergeMessages(known, incoming),
      },
    });
  },

  sendMessage: async (conversationId, senderId, body) => {
    const trimmed = body.trim();
    if (trimmed === '') return false;

    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: senderId,
      body: trimmed,
      created_at: new Date().toISOString(),
      pending: true,
    };

    set({
      messages: {
        ...get().messages,
        [conversationId]: [...(get().messages[conversationId] ?? []), optimistic],
      },
    });

    const { data, error } = await bilt.rpc('send_message', {
      p_conversation_id: conversationId,
      p_body: trimmed,
    });
    const result = asRow<{ ok: boolean; message_id: string | null }>(data);

    if (error || !result?.ok) {
      set({
        messages: {
          ...get().messages,
          [conversationId]: (get().messages[conversationId] ?? []).filter(
            (message) => message.id !== optimistic.id,
          ),
        },
      });
      return false;
    }

    await get().loadMessages(conversationId);
    dispatchPendingPush();
    return true;
  },

  startConversation: async (listingId) => {
    const { data, error } = await bilt.rpc('start_conversation', { p_listing_id: listingId });
    if (error) return null;
    const row = asRow<{ conversation_id: string | null }>(data);
    return row?.conversation_id ?? null;
  },

  markRead: async (conversationId) => {
    await bilt.rpc('mark_conversation_read', { p_conversation_id: conversationId });
    set({
      conversations: get().conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unread_count: 0 } : conversation,
      ),
    });
  },

  reset: () => {
    set({ conversations: [], messages: {} });
  },
}));
