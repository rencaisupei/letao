import { create } from 'zustand';

import { bilt } from '@/lib/bilt';

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_type: string | null;
  link_id: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationState = {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
};

function asRows<T>(value: unknown): T[] {
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting untyped API rows to the caller-supplied shape
  return Array.isArray(value) ? (value as T[]) : [];
}

function countUnread(rows: AppNotification[]): number {
  return rows.filter((row) => row.read_at === null).length;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    const { data } = await bilt
      .from('notifications')
      .select('id, kind, title, body, link_type, link_id, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(120);

    const rows = asRows<AppNotification>(data);
    set({ notifications: rows, unreadCount: countUnread(rows), isLoading: false });
  },

  markRead: async (id) => {
    const target = get().notifications.find((item) => item.id === id);
    if (!target || target.read_at !== null) return;

    const readAt = new Date().toISOString();
    const next = get().notifications.map((item) =>
      item.id === id ? { ...item, read_at: readAt } : item,
    );
    set({ notifications: next, unreadCount: countUnread(next) });

    await bilt.from('notifications').update({ read_at: readAt }).eq('id', id);
  },

  markAllRead: async () => {
    const readAt = new Date().toISOString();
    const next = get().notifications.map((item) =>
      item.read_at === null ? { ...item, read_at: readAt } : item,
    );
    set({ notifications: next, unreadCount: 0 });

    await bilt.from('notifications').update({ read_at: readAt }).is('read_at', null);
  },

  reset: () => set({ notifications: [], unreadCount: 0 }),
}));
