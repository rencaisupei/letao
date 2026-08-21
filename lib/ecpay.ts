import { bilt } from '@/lib/bilt';
import { type ShipmentStage, toStage } from '@/lib/ecpayStatus';

/**
 * 綠界 ECPay C2C 超商取貨付款的前端串接層。
 *
 * 金鑰（MerchantID / HashKey / HashIV）只存在後端環境變數，App 一律透過
 * `ecpay-logistics` 邊緣函式與綠界對話，這裡不會出現任何檢查碼運算。
 *
 * 一次完整流程：
 *  1. `fetchEcpayConfig()`      確認總開關與已開通的超商
 *  2. `beginStoreSelection()`   取得要 POST 到綠界電子地圖的表單
 *  3. `storeSelectionFormHtml()` 在 WebView／瀏覽器送出表單，買家選門市
 *  4. `fetchStoreSelection()`   輪詢到 status = 'selected'
 *  5. `attachStoreToOrder()`    把門市與收件人寫到訂單上
 *  6. `createLogisticsOrder()`  賣家寄件前送單，取得寄貨編號
 *  7. `refreshLogisticsOrder()` 需要時重新向綠界查最新狀態
 */

/** 綠界 C2C 物流子類型。B2C 的 FAMI / UNIMART / HILIFE 不在此範圍。 */
export type EcpaySubType = 'UNIMARTC2C' | 'FAMIC2C' | 'HILIFEC2C' | 'OKMARTC2C';

export type EcpaySubTypeInfo = {
  code: EcpaySubType;
  label: string;
  /** 電子地圖是否支援這個子類型（OK 店到店只能建單）。 */
  mapSupported: boolean;
  /** 選店後綠界是否回傳門市地址與電話。 */
  returnsStoreAddress: boolean;
  /** 是否可指定退貨門市（ReturnStoreID）。 */
  supportsReturnStore: boolean;
  /** 訂單有效日（日曆天）：建單後賣家必須在這個期限內到門市寄件。 */
  shipWithinDays: number;
  /** true = 該通路已停止服務，不可再開通。 */
  retired: boolean;
  note: string;
};

export const ECPAY_SUB_TYPES: EcpaySubTypeInfo[] = [
  {
    code: 'UNIMARTC2C',
    label: '7-ELEVEN 交貨便',
    mapSupported: true,
    returnsStoreAddress: false,
    supportsReturnStore: true,
    shipWithinDays: 5,
    retired: false,
    note: '代收金額必須等於商品金額，會取得寄貨編號與驗證碼。',
  },
  {
    code: 'FAMIC2C',
    label: '全家 店到店',
    mapSupported: true,
    returnsStoreAddress: true,
    supportsReturnStore: false,
    shipWithinDays: 6,
    retired: false,
    note: '寄件人手機留空時，綠界會改用廠商後台登記的號碼。',
  },
  {
    code: 'HILIFEC2C',
    label: '萊爾富 店到店',
    mapSupported: true,
    returnsStoreAddress: true,
    supportsReturnStore: false,
    shipWithinDays: 7,
    retired: false,
    note: '商品名稱與寄件人手機為必填。',
  },
  {
    code: 'OKMARTC2C',
    label: 'OK 店到店',
    mapSupported: false,
    returnsStoreAddress: true,
    supportsReturnStore: false,
    shipWithinDays: 7,
    // 綠界公告 OK 超商 C2C 物流已於 2026/7/1 終止服務，官方貨態代碼表也移除了它。
    // 保留這一筆只為了讓既有資料的 sub_type 仍能顯示名稱。
    retired: true,
    note: '此通路已於 2026 年 7 月終止服務，無法再建立物流單。',
  },
];

/** 商品刊登的物流方式名稱 → 綠界子類型。不在表內的方式（面交、宅配、蝦皮）走原本流程。 */
export const LOGISTICS_TO_ECPAY: Record<string, EcpaySubType> = {
  '7-ELEVEN 交貨便': 'UNIMARTC2C',
  '全家 店到店': 'FAMIC2C',
  '萊爾富 店到店': 'HILIFEC2C',
};

export function ecpaySubTypeFor(logistics: string | null): EcpaySubType | null {
  if (logistics === null) return null;
  return LOGISTICS_TO_ECPAY[logistics] ?? null;
}

export function subTypeInfo(code: EcpaySubType): EcpaySubTypeInfo {
  return ECPAY_SUB_TYPES.find((entry) => entry.code === code) ?? ECPAY_SUB_TYPES[0];
}

/** 資料庫的 text 欄位 → 子類型；不是合法代碼時回傳 null。 */
export function toEcpaySubType(value: string | null): EcpaySubType | null {
  return ECPAY_SUB_TYPES.some((entry) => entry.code === value)
    ? // eslint-disable-next-line typescript/no-unsafe-type-assertion -- 上一行已確認 value 是有效的子類型代碼
      (value as EcpaySubType)
    : null;
}

/** 綠界商品金額與代收金額的合法範圍。 */
export const ECPAY_AMOUNT_LIMITS = { min: 1, max: 20000 };

// ---------------------------------------------------------------- 型別

export type EcpayConfig = {
  isEnabled: boolean;
  environment: 'stage' | 'production';
  enabledSubTypes: EcpaySubType[];
  /** true = 代收金額含運費。 */
  collectionIncludesShipping: boolean;
};

export type EcpaySenderProfile = {
  senderName: string;
  senderCellphone: string;
  senderPhone: string | null;
  returnStoreId: string | null;
};

export type EcpayStoreSelection = {
  token: string;
  subType: EcpaySubType;
  status: 'pending' | 'selected' | 'expired';
  storeId: string | null;
  storeName: string | null;
  storeAddress: string | null;
  storeTelephone: string | null;
  isOutlying: boolean;
  expiresAt: string;
};

/** 要交給 WebView／瀏覽器 POST 到綠界電子地圖的表單。 */
export type EcpayMapForm = {
  token: string;
  url: string;
  fields: Record<string, string>;
};

export type EcpayLogisticsOrder = {
  id: string;
  orderId: string;
  merchantTradeNo: string;
  subType: EcpaySubType;
  /** 語意化階段，由後端依綠界貨態代碼寫入（見 lib/ecpayStatus.ts）。 */
  stage: ShipmentStage;
  goodsAmount: number;
  collectionAmount: number;
  goodsName: string;
  receiverStoreId: string;
  allPayLogisticsId: string | null;
  /** 寄貨編號。7-ELEVEN 需與 cvsValidationNo 組合才是交貨便代碼。 */
  cvsPaymentNo: string | null;
  cvsValidationNo: string | null;
  rtnCode: number | null;
  rtnMsg: string | null;
  statusUpdatedAt: string | null;
  createdAt: string;
};

/** 一筆貨態通知（或人工查詢）的紀錄，用來畫貨態時間軸。 */
export type EcpayLogisticsEvent = {
  id: string;
  code: number | null;
  message: string | null;
  /** 綠界回報的物流狀態更新時間，沒有時退回收到通知的時間。 */
  happenedAt: string;
  signatureValid: boolean;
};

/** 送單失敗的原因，全部來自邊緣函式的 reason 欄位。 */
export type EcpayFailure =
  | 'disabled'
  | 'unauthenticated'
  | 'sub_type'
  | 'sub_type_disabled'
  | 'order'
  | 'order_status'
  | 'order_not_found'
  | 'forbidden'
  | 'store_not_selected'
  | 'already_created'
  | 'sender_profile'
  | 'goods_amount'
  | 'credentials_missing'
  | 'ecpay_rejected'
  | 'signature'
  | 'selection'
  | 'receiver_name'
  | 'receiver_phone'
  | 'trade_no'
  | 'error';

const FAILURE_MESSAGES: Record<EcpayFailure, string> = {
  disabled: '超商取貨付款目前尚未開放，請改選其他運送方式。',
  unauthenticated: '請先登入再選擇取貨門市。',
  sub_type: '這家超商目前沒有開通，請改選其他門市通路。',
  sub_type_disabled: '這家超商目前沒有開通，請改選其他門市通路。',
  order: '找不到這筆進行中的交易。',
  order_status: '這筆交易已結束，無法再建立物流單。',
  order_not_found: '找不到這筆交易。',
  forbidden: '只有賣家本人可以建立物流單。',
  store_not_selected: '買家還沒選好取貨門市與收件資料。',
  already_created: '這筆交易已經有物流單了，請直接查看寄貨編號。',
  sender_profile: '請先填寫寄件人姓名與手機，姓名需為 2 至 5 個中文字。',
  goods_amount: `代收金額需在 ${ECPAY_AMOUNT_LIMITS.min} 至 ${ECPAY_AMOUNT_LIMITS.max} 元之間。`,
  credentials_missing: '綠界介接設定尚未完成，請聯絡客服。',
  ecpay_rejected: '綠界退回了這筆物流單。',
  signature: '綠界回傳的資料驗證失敗，請稍後再試。',
  selection: '選店結果已失效，請重新選一次取貨門市。',
  receiver_name: '收件人姓名需為 2 至 5 個中文字（或 4 至 10 個英文字）。',
  receiver_phone: '收件人手機請填 09 開頭的 10 碼數字。',
  trade_no: '系統忙線中，請稍後再試一次。',
  error: '請確認網路狀態後再試一次。',
};

export function ecpayFailureMessage(reason: EcpayFailure, detail?: string | null): string {
  const base = FAILURE_MESSAGES[reason];
  if (reason === 'ecpay_rejected' && detail !== null && detail !== undefined && detail !== '') {
    return `${base}原因：${detail}`;
  }
  return base;
}

function toFailure(value: unknown): EcpayFailure {
  return typeof value === 'string' && value in FAILURE_MESSAGES
    ? // eslint-disable-next-line typescript/no-unsafe-type-assertion -- 上一行已確認 value 是 FAILURE_MESSAGES 的鍵
      (value as EcpayFailure)
    : 'error';
}

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

function toSubType(value: string | null): EcpaySubType {
  return ECPAY_SUB_TYPES.some((entry) => entry.code === value)
    ? // eslint-disable-next-line typescript/no-unsafe-type-assertion -- 上一行已確認 value 是有效的子類型代碼
      (value as EcpaySubType)
    : 'UNIMARTC2C';
}

// ------------------------------------------------------------ 欄位驗證

/** 綠界的字元寬度規則：中文與全形算 2，其餘算 1。 */
export function ecpayTextWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    width += (char.codePointAt(0) ?? 0) > 0x7f ? 2 : 1;
  }
  return width;
}

/** 綠界的姓名限制為 4~10 字元（中文 2~5 字），且不可有數字或特殊符號。 */
export function isValidEcpayName(value: string): boolean {
  const trimmed = value.trim();
  const width = ecpayTextWidth(trimmed);
  if (width < 4 || width > 10) return false;
  return !/[\d\s^'`!@#$%&*+\\"<>|_[\]()~,.:;/?=-]/.test(trimmed);
}

export function isValidCellphone(value: string): boolean {
  return /^09\d{8}$/.test(value.trim());
}

/** 綠界的市話允許數字與 ()-# 。 */
export function isValidLandline(value: string): boolean {
  return value.trim() === '' || /^[\d()#-]{6,20}$/.test(value.trim());
}

/** 7-ELEVEN C2C 的交貨便代碼＝寄貨編號 + 驗證碼。 */
export function shipmentCode(order: EcpayLogisticsOrder): string | null {
  if (order.cvsPaymentNo === null) return null;
  if (order.subType === 'UNIMARTC2C' && order.cvsValidationNo !== null) {
    return `${order.cvsPaymentNo}${order.cvsValidationNo}`;
  }
  return order.cvsPaymentNo;
}

// ------------------------------------------------------------------ 設定

type ConfigRow = {
  is_enabled: boolean;
  environment: string;
  enabled_sub_types: string[] | null;
  collection_includes_shipping: boolean;
};

export const ECPAY_DISABLED: EcpayConfig = {
  isEnabled: false,
  environment: 'stage',
  enabledSubTypes: [],
  collectionIncludesShipping: true,
};

export async function fetchEcpayConfig(): Promise<EcpayConfig> {
  const { data, error } = await bilt.rpc('ecpay_public_config');
  if (error) return ECPAY_DISABLED;

  const row = asRow<ConfigRow>(data);
  if (!row) return ECPAY_DISABLED;

  return {
    isEnabled: row.is_enabled,
    environment: row.environment === 'production' ? 'production' : 'stage',
    enabledSubTypes: (row.enabled_sub_types ?? [])
      .filter((code) => ECPAY_SUB_TYPES.some((entry) => entry.code === code))
      .map((code) => toSubType(code)),
    collectionIncludesShipping: row.collection_includes_shipping,
  };
}

/** 買家能選的門市通路：商品支援、綠界開通、電子地圖支援，且通路仍在服務中。 */
export function usableSubTypes(config: EcpayConfig, logistics: string | null): EcpaySubType[] {
  const wanted = ecpaySubTypeFor(logistics);
  return ECPAY_SUB_TYPES.filter(
    (entry) =>
      entry.mapSupported &&
      !entry.retired &&
      config.enabledSubTypes.includes(entry.code) &&
      (wanted === null || wanted === entry.code),
  ).map((entry) => entry.code);
}

// ------------------------------------------------------------ 寄件人資料

type SenderRow = {
  sender_name: string;
  sender_cellphone: string;
  sender_phone: string | null;
  return_store_id: string | null;
};

export async function fetchSenderProfile(userId: string): Promise<EcpaySenderProfile | null> {
  const { data, error } = await bilt
    .from('ecpay_sender_profiles')
    .select('sender_name, sender_cellphone, sender_phone, return_store_id')
    .eq('user_id', userId)
    .limit(1);

  if (error) return null;
  const row = asRow<SenderRow>(data);
  if (!row) return null;

  return {
    senderName: row.sender_name,
    senderCellphone: row.sender_cellphone,
    senderPhone: row.sender_phone,
    returnStoreId: row.return_store_id,
  };
}

export type SaveSenderResult = { ok: true } | { ok: false; message: string };

export async function saveSenderProfile(
  userId: string,
  profile: EcpaySenderProfile,
): Promise<SaveSenderResult> {
  if (!isValidEcpayName(profile.senderName)) {
    return { ok: false, message: '寄件人姓名需為 2 至 5 個中文字，且不可含數字或符號。' };
  }
  if (!isValidCellphone(profile.senderCellphone)) {
    return { ok: false, message: '寄件人手機請填 09 開頭的 10 碼數字。' };
  }
  if (!isValidLandline(profile.senderPhone ?? '')) {
    return { ok: false, message: '寄件人電話只能填數字與 ( ) - # 符號。' };
  }

  const { error } = await bilt.from('ecpay_sender_profiles').upsert(
    {
      user_id: userId,
      sender_name: profile.senderName.trim(),
      sender_cellphone: profile.senderCellphone.trim(),
      sender_phone:
        profile.senderPhone === null || profile.senderPhone.trim() === ''
          ? null
          : profile.senderPhone.trim(),
      return_store_id:
        profile.returnStoreId === null || profile.returnStoreId.trim() === ''
          ? null
          : profile.returnStoreId.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) return { ok: false, message: '儲存失敗，請確認網路狀態後再試一次。' };
  return { ok: true };
}

// ---------------------------------------------------------------- 選門市

export type BeginSelectionResult =
  | { ok: true; form: EcpayMapForm }
  | { ok: false; reason: EcpayFailure };

/** 開一次選店工作階段，回傳要 POST 到綠界電子地圖的表單。 */
export async function beginStoreSelection(
  subType: EcpaySubType,
  orderId: string | null,
  device: 'mobile' | 'pc' = 'mobile',
): Promise<BeginSelectionResult> {
  const { data, error } = await bilt.functions.invoke('ecpay-logistics', {
    body: { action: 'map', sub_type: subType, order_id: orderId, device },
  });

  if (error) return { ok: false, reason: 'error' };

  const payload = asRow<{
    ok?: boolean;
    reason?: string;
    token?: string;
    url?: string;
    fields?: Record<string, string>;
  }>(data);

  if (payload?.ok !== true || !payload.token || !payload.url || !payload.fields) {
    return { ok: false, reason: toFailure(payload?.reason) };
  }

  return {
    ok: true,
    form: { token: payload.token, url: payload.url, fields: payload.fields },
  };
}

/**
 * 電子地圖只吃 POST，所以要用一張自動送出的表單開啟。
 * 綠界明確要求不可放在 iframe 裡，請用 WebView 或系統瀏覽器載入這段 HTML。
 */
export function storeSelectionFormHtml(form: EcpayMapForm): string {
  const inputs = Object.entries(form.fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeAttribute(name)}" value="${escapeAttribute(value)}">`,
    )
    .join('');

  return (
    `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body><form id="ecpay-map" method="POST" action="${escapeAttribute(form.url)}">${inputs}</form>` +
    `<script>document.getElementById('ecpay-map').submit();</script></body></html>`
  );
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type SelectionRow = {
  token: string;
  logistics_sub_type: string;
  status: string;
  store_id: string | null;
  store_name: string | null;
  store_address: string | null;
  store_telephone: string | null;
  is_outlying: boolean | null;
  expires_at: string;
};

/** 送出電子地圖後輪詢這支，直到 status 變成 'selected'。 */
export async function fetchStoreSelection(token: string): Promise<EcpayStoreSelection | null> {
  const { data, error } = await bilt
    .from('ecpay_store_selections')
    .select(
      'token, logistics_sub_type, status, store_id, store_name, store_address, store_telephone, is_outlying, expires_at',
    )
    .eq('token', token)
    .limit(1);

  if (error) return null;
  const row = asRow<SelectionRow>(data);
  if (!row) return null;

  return {
    token: row.token,
    subType: toSubType(row.logistics_sub_type),
    status:
      row.status === 'selected' ? 'selected' : row.status === 'expired' ? 'expired' : 'pending',
    storeId: row.store_id,
    storeName: row.store_name,
    storeAddress: row.store_address,
    storeTelephone: row.store_telephone,
    isOutlying: row.is_outlying === true,
    expiresAt: row.expires_at,
  };
}

export type AttachStoreResult = { ok: true } | { ok: false; reason: EcpayFailure };

/** 把選好的門市與收件人寫到訂單上。只有買家、只有進行中的交易可以呼叫。 */
export async function attachStoreToOrder(
  orderId: string,
  token: string,
  receiver: { name: string; cellphone: string; email?: string | null },
): Promise<AttachStoreResult> {
  const { data, error } = await bilt.rpc('set_order_cvs_store', {
    p_order_id: orderId,
    p_token: token,
    p_receiver_name: receiver.name.trim(),
    p_receiver_cellphone: receiver.cellphone.trim(),
    p_receiver_email: receiver.email ?? null,
  });

  if (error) return { ok: false, reason: 'error' };

  const row = asRow<{ ok: boolean; reason: string | null }>(data);
  if (row?.ok === true) return { ok: true };
  return { ok: false, reason: toFailure(row?.reason) };
}

// -------------------------------------------------------------- 建立物流單

export type CreateLogisticsResult =
  | {
      ok: true;
      merchantTradeNo: string;
      allPayLogisticsId: string | null;
      cvsPaymentNo: string | null;
      cvsValidationNo: string | null;
    }
  | { ok: false; reason: EcpayFailure; detail: string | null };

/** 賣家寄件前送單到 /Express/Create，成功後取得寄貨編號。 */
export async function createLogisticsOrder(orderId: string): Promise<CreateLogisticsResult> {
  const { data, error } = await bilt.functions.invoke('ecpay-logistics', {
    body: { action: 'create', order_id: orderId },
  });

  if (error) return { ok: false, reason: 'error', detail: null };

  const payload = asRow<{
    ok?: boolean;
    reason?: string;
    message?: string;
    merchant_trade_no?: string;
    all_pay_logistics_id?: string | null;
    cvs_payment_no?: string | null;
    cvs_validation_no?: string | null;
  }>(data);

  if (payload?.ok !== true || !payload.merchant_trade_no) {
    return {
      ok: false,
      reason: toFailure(payload?.reason),
      detail: payload?.message ?? null,
    };
  }

  return {
    ok: true,
    merchantTradeNo: payload.merchant_trade_no,
    allPayLogisticsId: payload.all_pay_logistics_id ?? null,
    cvsPaymentNo: payload.cvs_payment_no ?? null,
    cvsValidationNo: payload.cvs_validation_no ?? null,
  };
}

type LogisticsOrderRow = {
  id: string;
  order_id: string;
  merchant_trade_no: string;
  logistics_sub_type: string;
  status: string;
  goods_amount: number | string;
  collection_amount: number | string;
  goods_name: string;
  receiver_store_id: string;
  all_pay_logistics_id: string | null;
  cvs_payment_no: string | null;
  cvs_validation_no: string | null;
  rtn_code: number | string | null;
  rtn_msg: string | null;
  status_updated_at: string | null;
  created_at: string;
};

function toLogisticsOrder(row: LogisticsOrderRow): EcpayLogisticsOrder {
  return {
    id: row.id,
    orderId: row.order_id,
    merchantTradeNo: row.merchant_trade_no,
    subType: toSubType(row.logistics_sub_type),
    stage: toStage(row.status),
    goodsAmount: Math.round(Number(row.goods_amount)),
    collectionAmount: Math.round(Number(row.collection_amount)),
    goodsName: row.goods_name,
    receiverStoreId: row.receiver_store_id,
    allPayLogisticsId: row.all_pay_logistics_id,
    cvsPaymentNo: row.cvs_payment_no,
    cvsValidationNo: row.cvs_validation_no,
    rtnCode: row.rtn_code === null ? null : Number(row.rtn_code),
    rtnMsg: row.rtn_msg,
    statusUpdatedAt: row.status_updated_at,
    createdAt: row.created_at,
  };
}

const LOGISTICS_ORDER_COLUMNS =
  'id, order_id, merchant_trade_no, logistics_sub_type, status, goods_amount, collection_amount, goods_name, receiver_store_id, all_pay_logistics_id, cvs_payment_no, cvs_validation_no, rtn_code, rtn_msg, status_updated_at, created_at';

/** 一筆交易最新的物流單（同一筆交易失敗後可以重送，所以只取最新一筆）。 */
export async function fetchLogisticsOrder(orderId: string): Promise<EcpayLogisticsOrder | null> {
  const { data, error } = await bilt
    .from('ecpay_logistics_orders')
    .select(LOGISTICS_ORDER_COLUMNS)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return null;
  const row = asRow<LogisticsOrderRow>(data);
  return row === null ? null : toLogisticsOrder(row);
}

export async function fetchMyLogisticsOrders(orderIds: string[]): Promise<EcpayLogisticsOrder[]> {
  if (orderIds.length === 0) return [];

  const { data, error } = await bilt
    .from('ecpay_logistics_orders')
    .select(LOGISTICS_ORDER_COLUMNS)
    .in('order_id', orderIds)
    .order('created_at', { ascending: false });

  if (error) return [];
  return asRows<LogisticsOrderRow>(data).map(toLogisticsOrder);
}

/** 重新向綠界查一次最新狀態（推播通知漏掉時的補救路徑）。 */
export async function refreshLogisticsOrder(merchantTradeNo: string): Promise<boolean> {
  const { data, error } = await bilt.functions.invoke('ecpay-logistics', {
    body: { action: 'query', merchant_trade_no: merchantTradeNo },
  });

  if (error) return false;
  return asRow<{ ok?: boolean }>(data)?.ok === true;
}

type LogisticsEventRow = {
  id: string;
  rtn_code: number | string | null;
  rtn_msg: string | null;
  update_status_date: string | null;
  received_at: string;
  signature_valid: boolean | null;
};

/** 一筆物流單的貨態紀錄，最新的在最前面。驗證失敗的通知不顯示給使用者。 */
export async function fetchLogisticsEvents(
  logisticsOrderId: string,
): Promise<EcpayLogisticsEvent[]> {
  const { data, error } = await bilt
    .from('ecpay_logistics_events')
    .select('id, rtn_code, rtn_msg, update_status_date, received_at, signature_valid')
    .eq('logistics_order_id', logisticsOrderId)
    .order('received_at', { ascending: false })
    .limit(60);

  if (error) return [];

  return asRows<LogisticsEventRow>(data)
    .filter((row) => row.signature_valid === true)
    .map((row) => ({
      id: row.id,
      code: row.rtn_code === null ? null : Number(row.rtn_code),
      message: row.rtn_msg,
      happenedAt: row.update_status_date ?? row.received_at,
      signatureValid: true,
    }));
}

// ------------------------------------------------------------------ 診斷

export type EcpaySelfTest = {
  ok: boolean;
  checks: { name: string; pass: boolean }[];
  credentials: { merchant_id: boolean; hash_key: boolean; hash_iv: boolean };
};

/**
 * 用綠界官方測試向量驗證後端的 CheckMacValue 實作，並回報三個金鑰是否到位。
 * 不會動任何資料，也不會呼叫綠界。
 */
export async function runEcpaySelfTest(): Promise<EcpaySelfTest | null> {
  const { data, error } = await bilt.functions.invoke('ecpay-logistics', {
    body: { action: 'selftest' },
  });

  if (error) return null;
  return asRow<EcpaySelfTest>(data);
}
