/** Brand colors used where a className cannot be applied (SVG paint, icon props). */
export const SAGE = '#87A987';
export const MINT = '#E2EFE2';
export const CANVAS = '#F8F9FA';

/** EcoCoin economy */
export const BUMP_COST = 10;
export const DAILY_CLAIM_AMOUNT = 30;
export const BUMP_DURATION_LABEL = '24 小時';

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
  logistics: string;
  meetup: string;
  description: string;
};

export const DEMO_LISTINGS: DemoListing[] = [
  {
    title: '九成新微單眼高質感相機',
    price: 14500,
    condition: 'excellent',
    category: '相機攝影',
    logistics: '7-ELEVEN 交貨便',
    meetup: '台北 ∙ 信義區',
    description: '功能完全正常，附原廠盒裝與兩顆電池，外觀極新便宜出清。',
  },
  {
    title: '設計師工裝機能防風外套',
    price: 2380,
    condition: 'brand_new',
    category: '潮流男裝',
    logistics: '全家 店到店',
    meetup: '台中 ∙ 西屯區',
    description: '全新僅試穿，標牌未拆，重磅防風防潑水，服飾質感極佳。',
  },
  {
    title: '復古黃銅金屬防爆桌燈',
    price: 3200,
    condition: 'good',
    category: '沙發家具',
    logistics: '面交',
    meetup: '新北 ∙ 板橋區',
    description: '經典美式工業造型，金屬部分有正常使用留下的自然包漿痕跡。',
  },
  {
    title: '限量進口先鋒潮流黑膠唱片',
    price: 1800,
    condition: 'brand_new',
    category: '黑膠樂器',
    logistics: '蝦皮店到店',
    meetup: '高雄 ∙ 苓雅區',
    description: '國外音樂發燒友收藏釋出，全新未拆封封膜完整。',
  },
];
