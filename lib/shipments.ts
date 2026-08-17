import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';

import { bilt } from '@/lib/bilt';

/**
 * Shipping labels and tracking, backed by ezShip 台灣便利配.
 *
 * ezShip only covers 全家 / 萊爾富 / OK 店到店 plus its own 店到宅, so the other
 * methods keep a shipment record but the seller pastes the number they got from
 * the carrier themselves (`provider: 'manual'`). Everything the buyer sees —
 * tracking number, status, timeline — works the same either way.
 */

export type ShipmentProvider = 'ezship' | 'manual' | 'none';

export type CarrierMeta = {
  provider: ShipmentProvider;
  /** Buyer must choose a pickup store. */
  needsStore: boolean;
  /** Buyer must give a street address. */
  needsAddress: boolean;
  /** ezShip electronic-map chain code, null when there is no map for it. */
  storeCate: string | null;
  note: string;
};

const NO_CARRIER: CarrierMeta = {
  provider: 'none',
  needsStore: false,
  needsAddress: false,
  storeCate: null,
  note: '這個方式不需要出貨單。',
};

/** Mirrors public.logistics_carrier(). Keep the two in sync. */
export const CARRIERS: Record<string, CarrierMeta> = {
  '全家 店到店': {
    provider: 'ezship',
    needsStore: true,
    needsAddress: false,
    storeCate: 'TFM',
    note: 'ezShip 便利配店到店。取號後把包裹與寄件單送到任一全家門市寄出。',
  },
  '萊爾富 店到店': {
    provider: 'ezship',
    needsStore: true,
    needsAddress: false,
    storeCate: 'TLF',
    note: 'ezShip 便利配店到店。取號後把包裹與寄件單送到任一萊爾富門市寄出。',
  },
  'ezShip 宅配': {
    provider: 'ezship',
    needsStore: false,
    needsAddress: true,
    storeCate: null,
    note: 'ezShip 店到宅，由合作宅配車隊到府收送。',
  },
  '7-ELEVEN 交貨便': {
    provider: 'manual',
    needsStore: true,
    needsAddress: false,
    storeCate: null,
    note: '7-ELEVEN 交貨便是統一自家系統，ezShip 無法代開單。請在門市或賣家中心取得寄貨編號後填入。',
  },
  蝦皮店到店: {
    provider: 'manual',
    needsStore: true,
    needsAddress: false,
    storeCate: null,
    note: '蝦皮寄貨編號只能在蝦皮 App 內產生。取號後把編號填入，買家就能追蹤。',
  },
  黑貓宅急便: {
    provider: 'manual',
    needsStore: false,
    needsAddress: true,
    storeCate: null,
    note: '黑貓需要自有託運單。填入託運單號後買家就能看到進度。',
  },
  Lalamove: {
    provider: 'none',
    needsStore: false,
    needsAddress: true,
    storeCate: null,
    note: 'Lalamove 是即時派車，沒有寄貨編號。請在私訊約好取送時間後直接叫車。',
  },
  面交: {
    provider: 'none',
    needsStore: false,
    needsAddress: false,
    storeCate: null,
    note: '面交不需要出貨單，約好時間地點當面完成即可。',
  },
};

export function carrierFor(method: string | null | undefined): CarrierMeta {
  if (!method) return NO_CARRIER;
  return CARRIERS[method] ?? NO_CARRIER;
}

export type ShipmentStatus =
  | 'created'
  | 'label_ready'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'failed';

export const SHIPMENT_STATUS_META: Record<
  ShipmentStatus,
  { label: string; hint: string; bgClass: string; textClass: string }
> = {
  created: {
    label: '待取號',
    hint: '出貨單已建立，還沒有寄貨編號。',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
  },
  label_ready: {
    label: '已取號',
    hint: '已有寄貨編號，等賣家把包裹交寄。',
    bgClass: 'bg-sky-100',
    textClass: 'text-sky-700',
  },
  in_transit: {
    label: '運送中',
    hint: '包裹已寄出，正在運送途中。',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
  },
  arrived: {
    label: '已到店',
    hint: '包裹已送達取件地點，請盡快取件。',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
  },
  delivered: {
    label: '已取貨',
    hint: '買家已完成取貨。',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
  },
  returned: {
    label: '已退貨',
    hint: '包裹退回寄件人。',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
  cancelled: {
    label: '已作廢',
    hint: '這張出貨單已作廢。',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-500',
  },
  failed: {
    label: '需處理',
    hint: '取號失敗或配送異常，請查看原因。',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
};

/** The happy path, in order, for the tracking timeline. */
export const TRACK_STEPS: ShipmentStatus[] = [
  'created',
  'label_ready',
  'in_transit',
  'arrived',
  'delivered',
];

export function getShipmentStatus(value: string | null | undefined): ShipmentStatus {
  if (
    value === 'created' ||
    value === 'label_ready' ||
    value === 'in_transit' ||
    value === 'arrived' ||
    value === 'delivered' ||
    value === 'returned' ||
    value === 'cancelled' ||
    value === 'failed'
  ) {
    return value;
  }
  return 'created';
}

export type Shipment = {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  method: string;
  provider: ShipmentProvider;
  ezship_order_no: string | null;
  tracking_no: string | null;
  label_url: string | null;
  status: ShipmentStatus;
  status_detail: string | null;
  provider_status: string | null;
  provider_error: string | null;
  is_simulated: boolean;
  store_cate: string | null;
  store_id: string | null;
  store_name: string | null;
  store_address: string | null;
  ship_zip: string | null;
  ship_address: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  sender_address: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  fee: number;
  created_at: string;
  last_synced_at: string | null;
};

export type ShipmentEvent = {
  id: string;
  status: ShipmentStatus;
  detail: string | null;
  source: string;
  occurred_at: string;
};

export type DeliveryInput = {
  recipientName: string;
  recipientPhone: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  zip: string;
  address: string;
};

export type SenderInput = {
  name: string;
  phone: string;
  zip: string;
  address: string;
};

export type StoreChoice = {
  cate: string | null;
  code: string;
  name: string | null;
  addr: string | null;
  tel: string | null;
};

export type StorePickOutcome =
  | { kind: 'store'; store: StoreChoice }
  | { kind: 'options'; stores: StoreChoice[] }
  | { kind: 'error'; reason: 'unsupported' | 'cancelled' | 'timeout' | 'error' };

export type OpenShipmentReason =
  | 'unsupported'
  | 'exists'
  | 'missing_sender'
  | 'missing_sender_address'
  | 'missing_recipient'
  | 'missing_store'
  | 'missing_address'
  | 'missing_email'
  | 'not_allowed';

export type LabelResult = { ok: boolean; message: string };

const SHIPMENT_FIELDS =
  'id, order_id, seller_id, buyer_id, method, provider, ezship_order_no, tracking_no, label_url, ' +
  'status, status_detail, provider_status, provider_error, is_simulated, store_cate, store_id, ' +
  'store_name, store_address, ship_zip, ship_address, sender_name, sender_phone, sender_address, ' +
  'recipient_name, recipient_phone, fee, created_at, last_synced_at';

type ShipmentRow = Omit<Shipment, 'provider' | 'status' | 'fee'> & {
  provider: string;
  status: string;
  fee: number | string | null;
};

type EventRow = Omit<ShipmentEvent, 'status'> & { status: string };

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

function toProvider(value: string): ShipmentProvider {
  return value === 'ezship' || value === 'manual' ? value : 'none';
}

function toShipment(row: ShipmentRow): Shipment {
  return {
    ...row,
    provider: toProvider(row.provider),
    status: getShipmentStatus(row.status),
    fee: Math.round(Number(row.fee ?? 0)),
  };
}

/** Human-friendly copy for every way opening a shipment can fail. */
export function openShipmentMessage(reason: OpenShipmentReason): string {
  switch (reason) {
    case 'unsupported':
      return '這個寄送方式不需要出貨單，直接與對方約定即可。';
    case 'exists':
      return '這筆交易已經有一張有效的出貨單了。';
    case 'missing_sender':
      return '請填寫寄件人姓名與手機。';
    case 'missing_sender_address':
      return '宅配需要寄件人地址，才能安排車隊到府收件。';
    case 'missing_recipient':
      return '買家還沒填收件人姓名與手機，請提醒對方到訂單頁補齊。';
    case 'missing_store':
      return '買家還沒選擇取件門市，請提醒對方到訂單頁選擇。';
    case 'missing_address':
      return '買家還沒填收件地址，請提醒對方到訂單頁補齊。';
    case 'missing_email':
      return '找不到買家的電子郵件，ezShip 需要它才能寄送取件通知。';
    default:
      return '目前無法建立出貨單，請重新整理後再試。';
  }
}

/** Copy for the reason codes the ezship-label function returns. */
export function labelErrorMessage(reason: string): string {
  switch (reason) {
    case 'manual_provider':
      return '這個寄送方式需要賣家自行取號，無法由系統代開單。';
    case 'already_labeled':
      return '這張出貨單已經取過號了。';
    case 'missing_store':
      return '缺少取件門市代號，請請買家重新選擇門市。';
    case 'missing_address':
      return '缺少收件地址，請請買家補齊。';
    case 'bad_mobile':
      return '收件人手機格式不正確，需要 09 開頭的 10 碼台灣號碼。';
    case 'missing_email':
      return '缺少買家的電子郵件，ezShip 需要它寄送取件通知。';
    case 'forbidden':
      return '只有賣家可以對這張出貨單取號。';
    case 'timeout':
      return 'ezShip 沒有在時間內回應，請稍後再試。';
    case 'network':
      return '無法連線到 ezShip，請稍後再試。';
    default:
      return '取號沒有成功，請稍後再試。';
  }
}

type OrderShipment = { shipment: Shipment | null; events: ShipmentEvent[] };

type ShipmentState = {
  byOrder: Record<string, OrderShipment>;
  isLoading: boolean;
  load: (orderId: string) => Promise<void>;
  saveDelivery: (orderId: string, input: DeliveryInput) => Promise<boolean>;
  openShipment: (
    orderId: string,
    sender: SenderInput,
  ) => Promise<{ ok: true; shipmentId: string } | { ok: false; reason: OpenShipmentReason }>;
  requestLabel: (shipmentId: string, orderId: string) => Promise<LabelResult>;
  syncTracking: (shipmentId: string, orderId: string) => Promise<LabelResult>;
  saveManualTracking: (shipmentId: string, orderId: string, trackingNo: string) => Promise<boolean>;
  advanceStatus: (
    shipmentId: string,
    orderId: string,
    status: ShipmentStatus,
    detail: string,
  ) => Promise<boolean>;
  cancelShipment: (shipmentId: string, orderId: string) => Promise<boolean>;
  pickStore: (orderId: string, cate: string | null) => Promise<StorePickOutcome>;
  reset: () => void;
};

const EZSHIP_MAP_TIMEOUT_MS = 180_000;
const EZSHIP_MAP_POLL_MS = 2_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useShipmentStore = create<ShipmentState>((set, get) => ({
  byOrder: {},
  isLoading: false,

  load: async (orderId) => {
    set({ isLoading: true });

    const { data } = await bilt
      .from('shipments')
      .select(SHIPMENT_FIELDS)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(5);

    const rows = asRows<ShipmentRow>(data).map(toShipment);
    const active = rows.find((row) => row.status !== 'cancelled') ?? rows[0] ?? null;

    let events: ShipmentEvent[] = [];
    if (active) {
      const { data: eventData } = await bilt
        .from('shipment_events')
        .select('id, status, detail, source, occurred_at')
        .eq('shipment_id', active.id)
        .order('occurred_at', { ascending: false })
        .limit(50);

      events = asRows<EventRow>(eventData).map((row) => ({
        ...row,
        status: getShipmentStatus(row.status),
      }));
    }

    set({
      byOrder: { ...get().byOrder, [orderId]: { shipment: active, events } },
      isLoading: false,
    });
  },

  saveDelivery: async (orderId, input) => {
    const { data, error } = await bilt.rpc('set_order_delivery_info', {
      p_order_id: orderId,
      p_recipient_name: input.recipientName,
      p_recipient_phone: input.recipientPhone,
      p_store_id: input.storeId,
      p_store_name: input.storeName,
      p_store_address: input.storeAddress,
      p_zip: input.zip,
      p_address: input.address,
    });
    if (error) return false;
    return asRow<{ ok: boolean }>(data)?.ok === true;
  },

  openShipment: async (orderId, sender) => {
    const { data, error } = await bilt.rpc('open_shipment', {
      p_order_id: orderId,
      p_sender_name: sender.name,
      p_sender_phone: sender.phone,
      p_sender_zip: sender.zip,
      p_sender_address: sender.address,
    });

    if (error) return { ok: false, reason: 'not_allowed' };

    const row = asRow<{ ok: boolean; shipment_id: string | null; reason: string | null }>(data);
    if (!row?.ok || !row.shipment_id) {
      // eslint-disable-next-line typescript/no-unsafe-type-assertion -- reason strings are produced by open_shipment and mapped by openShipmentMessage
      return { ok: false, reason: (row?.reason ?? 'not_allowed') as OpenShipmentReason };
    }

    await get().load(orderId);
    return { ok: true, shipmentId: row.shipment_id };
  },

  requestLabel: async (shipmentId, orderId) => {
    const { data, error } = await bilt.functions.invoke('ezship-label', {
      body: { action: 'create', shipment_id: shipmentId },
    });

    await get().load(orderId);

    if (error) return { ok: false, message: '無法連線到取號服務，請稍後再試。' };

    const row = asRow<{ ok?: boolean; message?: string; reason?: string }>(data);
    if (row?.ok) {
      return { ok: true, message: row.message ?? '已取得寄貨編號。' };
    }
    return { ok: false, message: row?.message ?? labelErrorMessage(row?.reason ?? '') };
  },

  syncTracking: async (shipmentId, orderId) => {
    const { data, error } = await bilt.functions.invoke('ezship-label', {
      body: { action: 'sync', shipment_id: shipmentId },
    });

    await get().load(orderId);

    if (error) return { ok: false, message: '無法連線到查詢服務，請稍後再試。' };

    const row = asRow<{ ok?: boolean; message?: string; reason?: string; changed?: boolean }>(data);
    if (row?.ok) {
      return {
        ok: true,
        message:
          row.changed === true
            ? (row.message ?? '狀態已更新。')
            : (row.message ?? '目前沒有新的貨況。'),
      };
    }
    return { ok: false, message: row?.message ?? labelErrorMessage(row?.reason ?? '') };
  },

  saveManualTracking: async (shipmentId, orderId, trackingNo) => {
    const { data, error } = await bilt.rpc('set_manual_tracking', {
      p_shipment_id: shipmentId,
      p_tracking_no: trackingNo,
    });
    if (error) return false;
    const ok = asRow<{ ok: boolean }>(data)?.ok === true;
    if (ok) await get().load(orderId);
    return ok;
  },

  advanceStatus: async (shipmentId, orderId, status, detail) => {
    const { data, error } = await bilt.rpc('update_shipment_status', {
      p_shipment_id: shipmentId,
      p_status: status,
      p_detail: detail,
    });
    if (error) return false;
    const ok = asRow<{ ok: boolean }>(data)?.ok === true;
    if (ok) await get().load(orderId);
    return ok;
  },

  cancelShipment: async (shipmentId, orderId) => {
    const { data, error } = await bilt.rpc('cancel_shipment', { p_shipment_id: shipmentId });
    if (error) return false;
    const ok = asRow<{ ok: boolean }>(data)?.ok === true;
    if (ok) await get().load(orderId);
    return ok;
  },

  pickStore: async (orderId, cate) => {
    const { data, error } = await bilt.rpc('open_store_selection', { p_order_id: orderId });
    if (error) return { kind: 'error', reason: 'error' };

    const row = asRow<{ ok: boolean; token: string | null; st_cate: string | null }>(data);
    if (!row?.ok || !row.token) return { kind: 'error', reason: 'unsupported' };

    const { data: mapData, error: mapError } = await bilt.functions.invoke('ezship-label', {
      body: { action: 'map', token: row.token, cate: row.st_cate ?? cate ?? '' },
    });
    if (mapError) return { kind: 'error', reason: 'error' };

    const map = asRow<{ mode?: string; url?: string | null; stores?: StoreChoice[] }>(mapData);

    if (map?.mode === 'simulate') {
      return { kind: 'options', stores: map.stores ?? [] };
    }
    if (typeof map?.url !== 'string' || map.url === '') {
      return { kind: 'error', reason: 'error' };
    }

    // ezShip forbids iframing its map, so it has to open in a real browser and
    // report back to the callback function. We poll the row it writes.
    void WebBrowser.openBrowserAsync(map.url, { showTitle: true });

    const deadline = Date.now() + EZSHIP_MAP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await delay(EZSHIP_MAP_POLL_MS);

      const { data: pending } = await bilt
        .from('store_selections')
        .select('st_cate, st_code, st_name, st_addr, st_tel, resolved_at')
        .eq('token', row.token)
        .limit(1);

      const selection = asRow<{
        st_cate: string | null;
        st_code: string | null;
        st_name: string | null;
        st_addr: string | null;
        st_tel: string | null;
        resolved_at: string | null;
      }>(pending);

      if (selection?.resolved_at && selection.st_code) {
        // dismissBrowser is iOS-only; elsewhere the sheet/tab just stays open.
        try {
          await WebBrowser.dismissBrowser();
        } catch {
          // ignore: nothing to dismiss on this platform
        }
        return {
          kind: 'store',
          store: {
            cate: selection.st_cate,
            code: selection.st_code,
            name: selection.st_name,
            addr: selection.st_addr,
            tel: selection.st_tel,
          },
        };
      }
    }

    return { kind: 'error', reason: 'timeout' };
  },

  reset: () => set({ byOrder: {} }),
}));

export type EzshipSelfTest = {
  mode: 'live' | 'simulate';
  suIdPresent: boolean;
  accountStatus: string;
  callbackUrl: string;
  message: string;
  latencyMs: number;
};

type SelfTestRow = {
  mode?: string;
  su_id_present?: boolean;
  account_status?: string;
  callback_url?: string;
  message?: string;
  latency_ms?: number;
};

/** Diagnostics: reports the ezShip account / mode without creating anything. */
export async function runEzshipSelfTest(): Promise<EzshipSelfTest | null> {
  const { data, error } = await bilt.functions.invoke('ezship-label', {
    body: { selftest: true },
  });
  if (error) return null;

  const row = asRow<SelfTestRow>(data);
  if (!row) return null;

  return {
    mode: row.mode === 'live' ? 'live' : 'simulate',
    suIdPresent: row.su_id_present === true,
    accountStatus: row.account_status ?? 'unknown',
    callbackUrl: row.callback_url ?? '',
    message: row.message ?? '',
    latencyMs: Math.round(row.latency_ms ?? 0),
  };
}
