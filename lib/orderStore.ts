import { create } from 'zustand';

import { bilt } from '@/lib/bilt';
import { type OrderStatus, type PaymentCode, getPayment } from '@/lib/constants';

export type Order = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  /** Units ordered. offer_price is per unit. */
  quantity: number;
  status: OrderStatus;
  /** The single delivery method the buyer picked when placing the offer. */
  logistics: string | null;
  /** Fee for that method at the time of the offer, NT$. */
  shipping_fee: number;
  /** City the buyer asked it to be shipped to, null for meetup / legacy rows. */
  dest_region: string | null;
  /** How the buyer pays, chosen from the methods the seller accepts. */
  payment_method: PaymentCode | null;
  meetup_location: string | null;
  completed_at: string | null;
  created_at: string;
  listing_title: string;
  listing_images: string[] | null;
  listing_price: number;
  counterpartName: string | null;
};

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      logistics: string | null;
      shippingFee: number;
      paymentMethod: PaymentCode | null;
      quantity: number;
    }
  | {
      ok: false;
      reason:
        | 'lowball'
        | 'sold'
        | 'stock'
        | 'own'
        | 'unavailable'
        | 'logistics'
        | 'shipping'
        | 'payment'
        | 'error';
      minPrice: number;
      /** Units still buyable, from the server's own count. */
      remaining: number;
    };

type OrderRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number | string;
  quantity: number | string | null;
  status: OrderStatus;
  logistics: string | null;
  shipping_fee: number | string | null;
  dest_region: string | null;
  payment_method: string | null;
  meetup_location: string | null;
  completed_at: string | null;
  created_at: string;
  listings: {
    title: string | null;
    images: string[] | null;
    price: number | string | null;
  } | null;
};

type CreateRow = {
  ok: boolean;
  order_id: string | null;
  reason: string | null;
  min_price: number | string | null;
  shipping_fee: number | string | null;
  logistics: string | null;
  payment_method: string | null;
  quantity: number | string | null;
  remaining: number | string | null;
};

type OrderState = {
  orders: Order[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  createOrder: (
    listingId: string,
    offerPrice: number,
    logistics: string,
    destRegion: string | null,
    paymentMethod: PaymentCode | null,
    quantity: number,
  ) => Promise<CreateOrderResult>;
  completeOrder: (orderId: string) => Promise<boolean>;
  cancelOrder: (orderId: string) => Promise<boolean>;
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

function normalizeReason(reason: string | null): string {
  return reason ?? 'error';
}

function toPaymentCode(value: string | null): PaymentCode | null {
  return getPayment(value)?.code ?? null;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,

  load: async (userId) => {
    set({ isLoading: true });

    const { data } = await bilt
      .from('orders')
      .select(
        'id, listing_id, buyer_id, seller_id, offer_price, quantity, status, logistics, shipping_fee, dest_region, payment_method, meetup_location, completed_at, created_at, listings(title, images, price)',
      )
      .order('created_at', { ascending: false })
      .limit(200);

    const rows = asRows<OrderRow>(data);
    const counterpartIds = [
      ...new Set(rows.map((row) => (row.buyer_id === userId ? row.seller_id : row.buyer_id))),
    ];

    const names = new Map<string, string | null>();
    if (counterpartIds.length > 0) {
      const { data: profiles } = await bilt
        .from('profiles')
        .select('id, username')
        .in('id', counterpartIds);
      for (const profile of asRows<{ id: string; username: string | null }>(profiles)) {
        names.set(profile.id, profile.username);
      }
    }

    const orders: Order[] = rows.map((row) => {
      const counterpartId = row.buyer_id === userId ? row.seller_id : row.buyer_id;
      return {
        id: row.id,
        listing_id: row.listing_id,
        buyer_id: row.buyer_id,
        seller_id: row.seller_id,
        offer_price: Number(row.offer_price),
        quantity: Math.max(1, Math.round(Number(row.quantity ?? 1)) || 1),
        status: row.status,
        logistics: row.logistics,
        shipping_fee: Number(row.shipping_fee ?? 0),
        dest_region: row.dest_region,
        payment_method: toPaymentCode(row.payment_method),
        meetup_location: row.meetup_location,
        completed_at: row.completed_at,
        created_at: row.created_at,
        listing_title: row.listings?.title ?? '已刪除的商品',
        listing_images: row.listings?.images ?? null,
        listing_price: Number(row.listings?.price ?? 0),
        counterpartName: names.get(counterpartId) ?? null,
      };
    });

    set({ orders, isLoading: false });
  },

  createOrder: async (listingId, offerPrice, logistics, destRegion, paymentMethod, quantity) => {
    const { data, error } = await bilt.rpc('create_order', {
      p_listing_id: listingId,
      p_offer_price: offerPrice,
      p_logistics: logistics,
      p_dest_region: destRegion,
      p_payment_method: paymentMethod,
      p_quantity: quantity,
    });

    if (error) return { ok: false, reason: 'error', minPrice: 0, remaining: 0 };

    const row = asRow<CreateRow>(data);
    if (!row) return { ok: false, reason: 'error', minPrice: 0, remaining: 0 };

    if (row.ok && row.order_id) {
      return {
        ok: true,
        orderId: row.order_id,
        logistics: row.logistics,
        shippingFee: Number(row.shipping_fee ?? 0),
        paymentMethod: toPaymentCode(row.payment_method),
        quantity: Math.max(1, Math.round(Number(row.quantity ?? 1)) || 1),
      };
    }

    const reason = normalizeReason(row.reason);
    const minPrice = Number(row.min_price ?? 0);
    const remaining = Math.max(0, Math.round(Number(row.remaining ?? 0)) || 0);
    const failure = { minPrice, remaining };

    if (reason === 'lowball') return { ok: false, reason: 'lowball', ...failure };
    if (reason === 'sold') return { ok: false, reason: 'sold', ...failure };
    if (reason === 'stock') return { ok: false, reason: 'stock', ...failure };
    if (reason === 'own') return { ok: false, reason: 'own', ...failure };
    if (reason === 'unavailable') return { ok: false, reason: 'unavailable', ...failure };
    if (reason === 'logistics') return { ok: false, reason: 'logistics', ...failure };
    if (reason === 'shipping') return { ok: false, reason: 'shipping', ...failure };
    if (reason === 'payment') return { ok: false, reason: 'payment', ...failure };
    return { ok: false, reason: 'error', ...failure };
  },

  completeOrder: async (orderId) => {
    const { data, error } = await bilt.rpc('complete_order', { p_order_id: orderId });
    if (error) return false;
    const row = asRow<{ ok: boolean }>(data);
    if (!row?.ok) return false;

    set({
      orders: get().orders.map((order) =>
        order.id === orderId
          ? { ...order, status: 'completed', completed_at: new Date().toISOString() }
          : order,
      ),
    });
    return true;
  },

  cancelOrder: async (orderId) => {
    const { data, error } = await bilt.rpc('cancel_order', { p_order_id: orderId });
    if (error) return false;
    const row = asRow<{ ok: boolean }>(data);
    if (!row?.ok) return false;

    set({
      orders: get().orders.map((order) =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order,
      ),
    });
    return true;
  },

  reset: () => set({ orders: [] }),
}));

/** Amount the buyer pays: unit price × units + one shipping fee. */
export function orderTotal(order: Order): number {
  return order.offer_price * order.quantity + order.shipping_fee;
}

/** True when the signed-in buyer already completed a deal with this seller. */
export function hasCompletedDealWith(orders: Order[], sellerId: string, userId: string): boolean {
  return orders.some(
    (order) =>
      order.seller_id === sellerId && order.buyer_id === userId && order.status === 'completed',
  );
}
