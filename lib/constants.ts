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

export const CATEGORIES = [
  '時尚女裝',
  '潮流男裝',
  '女鞋精品',
  '男鞋運動',
  '包包手袋',
  '飾品配件',
  '手機智能',
  '電腦平板',
  '相機攝影',
  '電玩電競',
  '耳機音響',
  '智能家電',
  '沙發家具',
  '廚房衛浴',
  '生活日用',
  '寢具織品',
  '裝飾美學',
  '五金工具',
  '美妝保養',
  '香氛香水',
  '美髮美體',
  '美甲美睫',
  '保健養生',
  '醫療護理',
  '盲盒公仔',
  '模型玩具',
  '動漫周邊',
  '黑膠樂器',
  '明星偶像',
  '圖書文具',
  '戶外露營',
  '運動健身',
  '汽機精品',
  '母嬰童裝',
  '寵物用品',
  '美食伴手',
];

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

/** A method the seller accepts, with the fee the buyer pays for it. */
export type ShippingOption = {
  method: string;
  /** NT$, 0 means free shipping. */
  fee: number;
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
      });
    }
  }

  if (options.length > 0) return options;

  const fallback = fallbackMethod?.trim();
  if (fallback) return [{ method: fallback, fee: suggestedShippingFee(fallback) }];
  return [];
}

export function shippingMethods(options: ShippingOption[]): string[] {
  return options.map((option) => option.method);
}

/** The option a buyer would pick to pay the least. */
export function cheapestShipping(options: ShippingOption[]): ShippingOption | null {
  if (options.length === 0) return null;
  return options.reduce((best, option) => (option.fee < best.fee ? option : best));
}

/** One-line card label, e.g. "3 種寄送 ∙ 運費 免運 起". */
export function shippingSummary(options: ShippingOption[]): string {
  const cheapest = cheapestShipping(options);
  if (!cheapest) return '寄送方式待確認';
  if (options.length === 1) {
    return `${cheapest.method} ∙ ${formatShippingFee(cheapest.fee)}`;
  }
  return `${options.length} 種寄送 ∙ ${formatShippingFee(cheapest.fee)}起`;
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
  shipping: ShippingOption[];
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
    shipping: [
      { method: '7-ELEVEN 交貨便', fee: 60 },
      { method: '黑貓宅急便', fee: 150 },
      { method: '面交', fee: 0 },
    ],
    meetup: '台北 ∙ 信義區',
    description: '功能完全正常，附原廠盒裝與兩顆電池，外觀極新便宜出清。',
    imageKey: 'camera',
  },
  {
    title: '設計師工裝機能防風外套',
    price: 2380,
    condition: 'brand_new',
    category: '潮流男裝',
    shipping: [
      { method: '全家 店到店', fee: 60 },
      { method: '蝦皮店到店', fee: 55 },
    ],
    meetup: '台中 ∙ 西屯區',
    description: '全新僅試穿，標牌未拆，重磅防風防潑水，服飾質感極佳。',
    imageKey: 'jacket',
  },
  {
    title: '復古黃銅金屬防爆桌燈',
    price: 3200,
    condition: 'good',
    category: '沙發家具',
    shipping: [
      { method: '面交', fee: 0 },
      { method: 'Lalamove', fee: 250 },
    ],
    meetup: '新北 ∙ 板橋區',
    description: '經典美式工業造型，金屬部分有正常使用留下的自然包漿痕跡。',
    imageKey: 'lamp',
  },
  {
    title: '限量進口先鋒潮流黑膠唱片',
    price: 1800,
    condition: 'brand_new',
    category: '黑膠樂器',
    shipping: [
      { method: '蝦皮店到店', fee: 0 },
      { method: '萊爾富 店到店', fee: 60 },
      { method: '面交', fee: 0 },
    ],
    meetup: '高雄 ∙ 苓雅區',
    description: '國外音樂發燒友收藏釋出，全新未拆封封膜完整。',
    imageKey: 'vinyl',
  },
];
