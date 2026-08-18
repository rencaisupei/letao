import type { DemoImageKey } from '@/lib/demoImages';

/** Brand colors used where a className cannot be applied (SVG paint, icon props). */
export const SAGE = '#87A987';
export const MINT = '#E2EFE2';
export const CANVAS = '#F8F9FA';

/** EcoCoin economy */
export const BUMP_COST = 10;
export const DAILY_CLAIM_AMOUNT = 30;
export const BUMP_DURATION_LABEL = '24 小時';
/** Consecutive check-in days that still increase the reward. */
export const DAILY_STREAK_CAP = 5;
export const DAILY_STREAK_BONUS = 5;

/** Reward for the n-th consecutive check-in day, mirroring claim_daily_reward(). */
export function dailyRewardFor(streak: number): number {
  const steps = Math.min(Math.max(streak, 1) - 1, DAILY_STREAK_CAP - 1);
  return DAILY_CLAIM_AMOUNT + steps * DAILY_STREAK_BONUS;
}

export type ConditionCode = 'brand_new' | 'near_new' | 'excellent' | 'good' | 'used';

export type ConditionMeta = {
  code: ConditionCode;
  label: string;
  hint: string;
  /** Minimum share of the asking price an offer must reach. */
  minRatio: number;
  bgClass: string;
  textClass: string;
};

export const CONDITIONS: ConditionMeta[] = [
  {
    code: 'brand_new',
    label: '✨ 全新未拆',
    hint: '全新未拆封，標牌完整',
    minRatio: 0.9,
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
  },
  {
    code: 'near_new',
    label: '💎 近全新',
    hint: '僅開箱測試，基本無瑕',
    minRatio: 0.8,
    bgClass: 'bg-sky-100',
    textClass: 'text-sky-700',
  },
  {
    code: 'excellent',
    label: '🍏 九成新',
    hint: '保存良好，微小使用痕跡',
    minRatio: 0.8,
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
  },
  {
    code: 'good',
    label: '👌 八成新',
    hint: '正常磨損，功能完全完好',
    minRatio: 0.8,
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
  },
  {
    code: 'used',
    label: '♻️ 五成新',
    hint: '外觀瑕疵明顯，低價出清',
    minRatio: 0.8,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
  },
];

export function getCondition(code: string | null | undefined): ConditionMeta {
  return CONDITIONS.find((item) => item.code === code) ?? CONDITIONS[3];
}

export const ALL_CATEGORY = '全部';

export type CategoryGroup = {
  /** Short heading shown above the group. */
  title: string;
  emoji: string;
  items: string[];
};

/**
 * The 36 categories, grouped so the picker can show a handful of large targets
 * per section instead of one dense wall of chips.
 */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: '服飾與配件',
    emoji: '👕',
    items: ['時尚女裝', '潮流男裝', '女鞋精品', '男鞋運動', '包包手袋', '飾品配件'],
  },
  {
    title: '3C 與電子',
    emoji: '📱',
    items: ['手機智能', '電腦平板', '相機攝影', '電玩電競', '耳機音響', '智能家電'],
  },
  {
    title: '居家與工具',
    emoji: '🛋️',
    items: ['沙發家具', '廚房衛浴', '生活日用', '寢具織品', '裝飾美學', '五金工具'],
  },
  {
    title: '美妝與保健',
    emoji: '💄',
    items: ['美妝保養', '香氛香水', '美髮美體', '美甲美睫', '保健養生', '醫療護理'],
  },
  {
    title: '收藏與嗜好',
    emoji: '🎁',
    items: ['盲盒公仔', '模型玩具', '動漫周邊', '黑膠樂器', '明星偶像', '圖書文具'],
  },
  {
    title: '運動與生活',
    emoji: '⛺',
    items: ['戶外露營', '運動健身', '汽機精品', '母嬰童裝', '寵物用品', '美食伴手'],
  },
];

/** Flat list of every category, in group order. */
export const CATEGORIES = CATEGORY_GROUPS.flatMap((group) => group.items);

/** The group a category belongs to, e.g. "3C 與電子". */
export function categoryGroupTitle(category: string | null | undefined): string | null {
  if (!category) return null;
  return CATEGORY_GROUPS.find((group) => group.items.includes(category))?.title ?? null;
}

/** Upper bound for listing stock, mirroring the DB check on listings.quantity. */
export const MAX_LISTING_QUANTITY = 999;

/** Units still buyable: total stock minus what pending or completed orders hold. */
export function remainingQuantity(quantity: number, soldQuantity: number): number {
  return Math.max(0, quantity - soldQuantity);
}

/** "剩 3 / 5 件" for multi-unit listings, null for a single item. */
export function stockLabel(quantity: number, soldQuantity: number): string | null {
  if (quantity <= 1) return null;
  return `剩 ${remainingQuantity(quantity, soldQuantity)} / ${quantity} 件`;
}

export const LOGISTICS_OPTIONS = [
  '7-ELEVEN 交貨便',
  '全家 店到店',
  '萊爾富 店到店',
  '蝦皮店到店',
  '黑貓宅急便',
  'Lalamove',
  '面交',
];

/** The only method that never carries a shipping fee. */
export const MEETUP_METHOD = '面交';

/**
 * How the fee for one method is decided.
 * - `auto`: recalculated from the carrier rate table at order time, so it moves
 *   with the package size and the buyer's destination.
 * - `manual`: a fixed amount the seller typed in.
 */
export type ShippingFeeMode = 'auto' | 'manual';

/** A method the seller accepts, with the fee the buyer pays for it. */
export type ShippingOption = {
  method: string;
  /** NT$, 0 means free shipping. For `auto` this is the 本島 base fee. */
  fee: number;
  mode: ShippingFeeMode;
};

/** Prefilled fee when the seller first ticks a method. */
export const SUGGESTED_SHIPPING_FEES: Record<string, number> = {
  '7-ELEVEN 交貨便': 60,
  '全家 店到店': 60,
  '萊爾富 店到店': 60,
  蝦皮店到店: 60,
  黑貓宅急便: 150,
  Lalamove: 200,
  面交: 0,
};

export const MAX_SHIPPING_FEE = 2000;
export const MAX_SHIPPING_OPTIONS = LOGISTICS_OPTIONS.length;

export function suggestedShippingFee(method: string): number {
  return SUGGESTED_SHIPPING_FEES[method] ?? 60;
}

/** "免運" / "NT$ 60" */
export function formatShippingFee(fee: number): string {
  return fee <= 0 ? '免運' : `NT$ ${fee.toLocaleString('en-US')}`;
}

/** Shapes an untyped `listings.shipping_options` payload into typed options. */
export function parseShippingOptions(
  value: unknown,
  fallbackMethod?: string | null,
): ShippingOption[] {
  const options: ShippingOption[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== 'object' || entry === null) continue;
      const record: Record<string, unknown> = entry;
      const method = typeof record.method === 'string' ? record.method.trim() : '';
      if (method === '') continue;
      const rawFee = record.fee;
      const fee =
        typeof rawFee === 'number'
          ? rawFee
          : typeof rawFee === 'string'
            ? Number.parseFloat(rawFee)
            : 0;
      if (options.some((option) => option.method === method)) continue;
      options.push({
        method,
        fee: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0,
        // Rows written before automatic rates existed carry no mode and must
        // keep the fixed fee their seller typed.
        mode: record.mode === 'auto' ? 'auto' : 'manual',
      });
    }
  }

  if (options.length > 0) return options;

  const fallback = fallbackMethod?.trim();
  if (fallback) {
    return [{ method: fallback, fee: suggestedShippingFee(fallback), mode: 'manual' }];
  }
  return [];
}

/** True when at least one fee is recalculated from the carrier rate table. */
export function hasAutoShipping(options: ShippingOption[]): boolean {
  return options.some((option) => option.mode === 'auto' && option.method !== MEETUP_METHOD);
}

export function shippingMethods(options: ShippingOption[]): string[] {
  return options.map((option) => option.method);
}

/** The option a buyer would pick to pay the least. */
export function cheapestShipping(options: ShippingOption[]): ShippingOption | null {
  if (options.length === 0) return null;
  return options.reduce((best, option) => (option.fee < best.fee ? option : best));
}

/** One-line card label, e.g. "3 種寄送 ∙ 免運起". */
export function shippingSummary(options: ShippingOption[]): string {
  const cheapest = cheapestShipping(options);
  if (!cheapest) return '寄送方式待確認';
  const suffix = hasAutoShipping(options) ? '（本島起）' : '';
  if (options.length === 1) {
    return `${cheapest.method} ∙ ${formatShippingFee(cheapest.fee)}${suffix}`;
  }
  return `${options.length} 種寄送 ∙ ${formatShippingFee(cheapest.fee)}起${suffix}`;
}

/** How the buyer pays the seller. Mirrors the DB check on listings.payment_methods. */
export type PaymentCode = 'cod' | 'transfer' | 'mobile' | 'cash';

export type PaymentMeta = {
  code: PaymentCode;
  emoji: string;
  label: string;
  hint: string;
  /**
   * Which delivery methods the payment fits.
   * `shipped` excludes 面交, `meetup` is 面交 only, `any` works for both.
   */
  scope: 'shipped' | 'meetup' | 'any';
};

export const PAYMENT_METHODS: PaymentMeta[] = [
  {
    code: 'cod',
    emoji: '📦',
    label: '貨到付款',
    hint: '超商或宅配代收貨款，買家取貨時付清。',
    scope: 'shipped',
  },
  {
    code: 'transfer',
    emoji: '🏦',
    label: '匯款／銀行轉帳',
    hint: '買家先轉帳，賣家確認入帳後出貨。',
    scope: 'any',
  },
  {
    code: 'mobile',
    emoji: '📱',
    label: '行動支付',
    hint: 'Line Pay／街口等，由賣家提供收款連結或 QR Code。',
    scope: 'any',
  },
  {
    code: 'cash',
    emoji: '🤝',
    label: '面交付現',
    hint: '碰面時付現金，僅適用面交。',
    scope: 'meetup',
  },
];

export function getPayment(code: string | null | undefined): PaymentMeta | null {
  return PAYMENT_METHODS.find((item) => item.code === code) ?? null;
}

/** "📦 貨到付款", or a placeholder when the order carries no choice. */
export function paymentLabel(code: string | null | undefined): string {
  const meta = getPayment(code);
  return meta ? `${meta.emoji} ${meta.label}` : '待雙方確認';
}

/** Mirrors public.payment_allows() so the UI hides choices the server rejects. */
export function isPaymentAllowedFor(code: PaymentCode, logistics: string | null): boolean {
  const scope = getPayment(code)?.scope ?? 'any';
  const isMeetup = (logistics ?? MEETUP_METHOD) === MEETUP_METHOD;
  if (scope === 'meetup') return isMeetup;
  if (scope === 'shipped') return !isMeetup;
  return true;
}

/** Shapes an untyped `listings.payment_methods` payload, ordered like PAYMENT_METHODS. */
export function parsePaymentMethods(value: unknown): PaymentCode[] {
  if (!Array.isArray(value)) return [];
  const codes = new Set(value.filter((item): item is string => typeof item === 'string'));
  return PAYMENT_METHODS.filter((item) => codes.has(item.code)).map((item) => item.code);
}

/** The payment choices that work for one delivery method. */
export function paymentsFor(codes: PaymentCode[], logistics: string | null): PaymentCode[] {
  return codes.filter((code) => isPaymentAllowedFor(code, logistics));
}

/** One-line summary, e.g. "貨到付款 ∙ 匯款／銀行轉帳". */
export function paymentSummary(codes: PaymentCode[]): string {
  if (codes.length === 0) return '賣家尚未設定';
  return codes.map((code) => getPayment(code)?.label ?? code).join(' ∙ ');
}

/** One-line explanation of how the buyer receives the item. */
export function pickupHint(logistics: string | null | undefined): string {
  const method = logistics ?? MEETUP_METHOD;
  if (method === MEETUP_METHOD) {
    return '面交當場點交：請約人潮多、有監視器的公共場所，並先在私訊確認時間。';
  }
  if (method === 'Lalamove') {
    return '同城即時配送：請與賣家約好可收件的時間與地址。';
  }
  if (method.includes('宅急便') || method.includes('宅配')) {
    return '宅配到府：請確認收件地址與可收件時間，簽收前先檢查外包裝。';
  }
  return '超商店到店：賣家寄出後到指定門市取貨，取貨時請當場確認商品狀況。';
}

export type UserRole = 'buyer' | 'seller' | 'both';

export const ROLE_OPTIONS: { code: UserRole; label: string; hint: string }[] = [
  { code: 'buyer', label: '我要買', hint: '出價、收藏、與賣家私訊' },
  { code: 'seller', label: '我要賣', hint: '上架商品、置頂曝光、收取評價' },
  { code: 'both', label: '買賣都要', hint: '同時使用買家與賣家的全部功能' },
];

export function getRoleLabel(role: string | null | undefined): string {
  return ROLE_OPTIONS.find((item) => item.code === role)?.label ?? '買賣都要';
}

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export type ModerationMeta = {
  status: ModerationStatus;
  label: string;
  hint: string;
  bgClass: string;
  textClass: string;
};

export const MODERATION_META: Record<ModerationStatus, ModerationMeta> = {
  pending: {
    status: 'pending',
    label: '🕓 審核中',
    hint: '已送出，AI 正在檢查內容是否符合刊登規範。',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
  },
  approved: {
    status: 'approved',
    label: '✅ 已上架',
    hint: '通過審核，已公開在探索首頁。',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
  },
  flagged: {
    status: 'flagged',
    label: '🔍 待人工複審',
    hint: 'AI 判定需要管理員確認，通過後才會公開。',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
  },
  rejected: {
    status: 'rejected',
    label: '⛔ 未通過',
    hint: '內容不符刊登規範，僅您本人看得到。可修正後重新上架。',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
};

export function getModeration(status: string | null | undefined): ModerationMeta {
  if (
    status === 'approved' ||
    status === 'flagged' ||
    status === 'rejected' ||
    status === 'pending'
  ) {
    return MODERATION_META[status];
  }
  return MODERATION_META.pending;
}

export const REPORT_REASONS = [
  '疑似違禁或管制商品',
  '仿冒品或盜版',
  '詐騙或假交易',
  '商品資訊不實',
  '冒犯或不當內容',
  '其他問題',
];

export const MAX_LISTING_PHOTOS = 4;
export const LISTING_PHOTO_BUCKET = 'listing-photos';
export const AVATAR_BUCKET = 'avatars';

/** Explore sorting */
export const SORT_OPTIONS = [
  { code: 'recommended', label: '推薦排序' },
  { code: 'newest', label: '最新上架' },
  { code: 'price_low', label: '價格低到高' },
  { code: 'price_high', label: '價格高到低' },
  { code: 'trust', label: '信任度優先' },
] as const;

export type SortCode = (typeof SORT_OPTIONS)[number]['code'];

export type PriceRange = {
  code: string;
  label: string;
  min: number;
  max: number | null;
};

export const PRICE_RANGES: PriceRange[] = [
  { code: 'all', label: '不限價格', min: 0, max: null },
  { code: 'u500', label: 'NT$ 500 以下', min: 0, max: 500 },
  { code: 'u2000', label: '500 – 2,000', min: 500, max: 2000 },
  { code: 'u8000', label: '2,000 – 8,000', min: 2000, max: 8000 },
  { code: 'u30000', label: '8,000 – 30,000', min: 8000, max: 30000 },
  { code: 'o30000', label: '30,000 以上', min: 30000, max: null },
];

export type ListingStatus = 'available' | 'reserved' | 'sold' | 'hidden';

export const LISTING_STATUS_META: Record<
  ListingStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  available: { label: '上架中', bgClass: 'bg-green-100', textClass: 'text-green-700' },
  reserved: { label: '已預訂', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
  sold: { label: '已售出', bgClass: 'bg-neutral-200', textClass: 'text-neutral-600' },
  hidden: { label: '已下架', bgClass: 'bg-neutral-100', textClass: 'text-neutral-500' },
};

export function getListingStatus(status: string | null | undefined): ListingStatus {
  if (status === 'reserved' || status === 'sold' || status === 'hidden') return status;
  return 'available';
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; hint: string; bgClass: string; textClass: string }
> = {
  pending: {
    label: '⏳ 待完成交付',
    hint: '雙方已媒合，約好交付方式後由任一方標記完成。',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
  },
  completed: {
    label: '✅ 交易完成',
    hint: '交易已完成，買家可以給賣家評價。',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
  },
  cancelled: {
    label: '✖️ 已取消',
    hint: '這筆交易已取消，商品會重新開放出價。',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-500',
  },
};

export function getOrderStatus(status: string | null | undefined): OrderStatus {
  if (status === 'completed' || status === 'cancelled') return status;
  return 'pending';
}

export type NotificationKind =
  | 'message'
  | 'order'
  | 'moderation'
  | 'report'
  | 'review'
  | 'reward'
  | 'system';

export const NOTIFICATION_META: Record<NotificationKind, { label: string; emoji: string }> = {
  message: { label: '私訊', emoji: '💬' },
  order: { label: '交易', emoji: '🤝' },
  moderation: { label: '審核', emoji: '🛡️' },
  report: { label: '檢舉', emoji: '🚩' },
  review: { label: '評價', emoji: '⭐' },
  reward: { label: 'EcoCoins', emoji: '🪙' },
  system: { label: '系統', emoji: '🔔' },
};

export function getNotificationMeta(kind: string | null | undefined) {
  if (kind && kind in NOTIFICATION_META) {
    // eslint-disable-next-line typescript/no-unsafe-type-assertion -- guarded by the `in` check above
    return NOTIFICATION_META[kind as NotificationKind];
  }
  return NOTIFICATION_META.system;
}

export const PROHIBITED_ITEMS = [
  '藥品與醫療器材（如：隱形眼鏡、OK繃、體溫計）',
  '菸酒類商品、電子菸及相關配件',
  '活體動物、保育類植物及其產製品',
  '仿冒品、盜版軟體、武器及侵權違法物品',
];

export type DemoListing = {
  title: string;
  price: number;
  condition: ConditionCode;
  category: string;
  /** Units in stock. */
  quantity: number;
  shipping: ShippingOption[];
  /** Payment choices the seller accepts. */
  payments: PaymentCode[];
  /** Package measurements the rate engine prices on. */
  parcel: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number };
  originRegion: string;
  meetup: string;
  description: string;
  imageKey: DemoImageKey;
};

export const DEMO_LISTINGS: DemoListing[] = [
  {
    title: '九成新微單眼高質感相機',
    price: 14500,
    condition: 'excellent',
    category: '相機攝影',
    quantity: 1,
    shipping: [
      { method: '7-ELEVEN 交貨便', fee: 70, mode: 'auto' },
      { method: '黑貓宅急便', fee: 150, mode: 'auto' },
      { method: '面交', fee: 0, mode: 'auto' },
    ],
    payments: ['cod', 'transfer', 'cash'],
    parcel: { weightKg: 1.8, lengthCm: 30, widthCm: 22, heightCm: 14 },
    originRegion: '台北',
    meetup: '台北 ∙ 信義區',
    description: '功能完全正常，附原廠盒裝與兩顆電池，外觀極新便宜出清。',
    imageKey: 'camera',
  },
  {
    title: '設計師工裝機能防風外套',
    price: 2380,
    condition: 'brand_new',
    category: '潮流男裝',
    quantity: 3,
    shipping: [
      { method: '全家 店到店', fee: 70, mode: 'auto' },
      { method: '蝦皮店到店', fee: 0, mode: 'manual' },
    ],
    payments: ['cod', 'transfer'],
    parcel: { weightKg: 0.8, lengthCm: 32, widthCm: 24, heightCm: 8 },
    originRegion: '台中',
    meetup: '台中 ∙ 西屯區',
    description: '全新僅試穿，標牌未拆，重磅防風防潑水，服飾質感極佳。',
    imageKey: 'jacket',
  },
  {
    title: '復古黃銅金屬防爆桌燈',
    price: 3200,
    condition: 'good',
    category: '沙發家具',
    quantity: 1,
    shipping: [
      { method: '面交', fee: 0, mode: 'auto' },
      { method: 'Lalamove', fee: 165, mode: 'auto' },
    ],
    payments: ['cash', 'transfer', 'mobile'],
    parcel: { weightKg: 4.5, lengthCm: 35, widthCm: 30, heightCm: 45 },
    originRegion: '新北',
    meetup: '新北 ∙ 板橋區',
    description: '經典美式工業造型，金屬部分有正常使用留下的自然包漿痕跡。',
    imageKey: 'lamp',
  },
  {
    title: '限量進口先鋒潮流黑膠唱片',
    price: 1800,
    condition: 'brand_new',
    category: '黑膠樂器',
    quantity: 2,
    shipping: [
      { method: '蝦皮店到店', fee: 0, mode: 'manual' },
      { method: '萊爾富 店到店', fee: 70, mode: 'auto' },
      { method: '面交', fee: 0, mode: 'auto' },
    ],
    payments: ['cod', 'mobile', 'cash'],
    parcel: { weightKg: 0.4, lengthCm: 33, widthCm: 33, heightCm: 5 },
    originRegion: '高雄',
    meetup: '高雄 ∙ 苓雅區',
    description: '國外音樂發燒友收藏釋出，全新未拆封封膜完整。',
    imageKey: 'vinyl',
  },
];
