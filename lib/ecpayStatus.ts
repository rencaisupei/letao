/**
 * 綠界 C2C 貨態代碼 → 中文說明與五階段時間軸。
 *
 * 資料來源：綠界官方「物流貨態代碼表」2026-06-04 版
 * （https://developers.ecpay.com.tw/logistics_status/），只收錄 LogisticsType=CVS
 * 的 UNIMARTC2C（7-ELEVEN 交貨便）、FAMIC2C（全家店到店）、HILIFEC2C（萊爾富店到店）。
 * OK 店到店（OKMARTC2C）自 2026/7/1 終止服務，官方已移除其貨態，故不收錄。
 *
 * 同一個代碼在 CVS 範圍內語意唯一（例如 2073 與 3018 都是「包裹配達取件門市」，
 * 只是不同超商用不同號碼），所以這裡用一張扁平表，不必按子類型分開。
 *
 * ⚠ `STAGE_CODES` 的分組在 `ecpay-callback` 邊緣函式內有一份相同的複本，
 * 因為狀態階段是由後端在收到貨態通知時寫進 `ecpay_logistics_orders.status`。
 * 改這裡的分組時，必須同時改那支函式，否則資料庫的階段會與畫面不一致。
 */

/** 一筆物流單的階段。前五個是正常時間軸，其餘是分支狀態。 */
export type ShipmentStage =
  | 'draft'
  | 'created'
  | 'shipped'
  | 'in_transit'
  | 'arrived'
  | 'picked_up'
  | 'returning'
  | 'returned'
  | 'exception'
  | 'cancelled'
  | 'failed';

/** 正常流程的五個階段，依序顯示成時間軸。 */
export const SHIPMENT_TIMELINE = [
  'created',
  'shipped',
  'in_transit',
  'arrived',
  'picked_up',
] as const satisfies readonly ShipmentStage[];

export type TimelineStage = (typeof SHIPMENT_TIMELINE)[number];

export type StageMeta = {
  label: string;
  /** 一句話說明現在該做什麼，買賣雙方通用。 */
  hint: string;
  bgClass: string;
  textClass: string;
  /** true = 需要注意的分支狀態（退回、異常、取消、失敗）。 */
  isAlert: boolean;
};

export const STAGE_META: Record<ShipmentStage, StageMeta> = {
  draft: {
    label: '準備中',
    hint: '物流單還沒送出綠界，請由賣家重新建立一次。',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
    isAlert: false,
  },
  created: {
    label: '已建立物流單',
    hint: '賣家已取得寄貨編號，請在有效期限內帶包裹到超商寄件。',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
    isAlert: false,
  },
  shipped: {
    label: '賣家已寄件',
    hint: '門市已收下包裹，正在送往物流中心。',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    isAlert: false,
  },
  in_transit: {
    label: '運送中',
    hint: '包裹在物流中心與門市之間運送，到店後會再通知。',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    isAlert: false,
  },
  arrived: {
    label: '已到門市，可取貨',
    hint: '請帶手機到取貨門市付款取件，逾 7 天未取會退回賣家。',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    isAlert: false,
  },
  picked_up: {
    label: '買家已取貨',
    hint: '取貨完成，代收貨款由綠界依撥款週期匯給賣家。',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    isAlert: false,
  },
  returning: {
    label: '退回中',
    hint: '包裹正在退回寄件門市，請留意超商的到店通知。',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-700',
    isAlert: true,
  },
  returned: {
    label: '已退回寄件門市',
    hint: '請賣家到寄件門市領回包裹，並與買家協調後續。',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-700',
    isAlert: true,
  },
  exception: {
    label: '配送異常',
    hint: '包裹狀態異常，請聯絡客服協助處理，並先不要重複寄件。',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    isAlert: true,
  },
  cancelled: {
    label: '物流單已失效',
    hint: '這張物流單已取消或逾期，需要重新建立一次才能寄件。',
    bgClass: 'bg-neutral-100',
    textClass: 'text-neutral-600',
    isAlert: true,
  },
  failed: {
    label: '建單失敗',
    hint: '綠界退回了這張物流單，請確認金額與收件資料後重新建立。',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    isAlert: true,
  },
};

/**
 * 階段 → 該階段的貨態代碼。
 * 分組原則：只要包裹還會往買家方向前進就留在時間軸上；一旦轉向退回、
 * 需要人工處理或訂單失效，就歸到分支狀態，畫面會改用警示樣式。
 */
export const STAGE_CODES: Record<Exclude<ShipmentStage, 'draft'>, readonly number[]> = {
  created: [300, 310, 311, 2001, 2024, 2031, 7014],
  shipped: [2068, 3032],
  in_transit: [
    2000, 2025, 2027, 2030, 2041, 2043, 2057, 2058, 2059, 2062, 2095, 2102, 2105, 3024, 7004,
  ],
  arrived: [2063, 2073, 2098, 3018, 3029],
  picked_up: [2067, 3022],
  returning: [
    325, 2016, 2026, 2033, 2034, 2038, 2039, 2040, 2045, 2046, 2047, 2049, 2050, 2051, 2052, 2053,
    2054, 2055, 2060, 2065, 2066, 2069, 2074, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083,
    2084, 2085, 2086, 2087, 2088, 2089, 2092, 2093, 2096, 2097, 3020, 3021, 3025, 3033, 4001, 4002,
    5004, 5005, 7016,
  ],
  returned: [2070, 2072, 2099, 3019, 3023, 3031, 5008, 9001, 9002],
  exception: [
    2028, 2029, 2032, 2037, 2042, 2048, 2061, 2094, 2101, 2103, 2104, 5001, 5002, 5003, 5006, 5007,
    5009, 7001, 7002, 7003, 7006, 7007, 7008, 7009, 7010, 7011, 7012, 7015, 7017, 7018, 7019, 7020,
    7021, 7022, 7023, 7032, 7034, 7035, 7036, 7038,
  ],
  cancelled: [2036, 7005, 7013, 9999],
  failed: [
    2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2017, 2018,
    2019, 2020, 2021, 2022, 2023, 2035, 2071, 7037,
  ],
};

/** 代碼 → 給使用者看的中文。綠界回傳的原文會另外顯示，這裡是官方貨態訊息的正規化版本。 */
export const CODE_LABELS: Record<number, string> = {
  300: '訂單處理中，綠界已收到訂單資料',
  310: '訂單上傳物流中',
  311: '訂單傳送物流成功',
  325: '退貨訂單處理中',
  2000: '已申請門市變更',
  2001: '訂單傳送超商成功',
  2002: '出貨單號不合規則',
  2003: '出貨單號重複',
  2004: '出貨單號重複上傳使用',
  2005: '日期格式不符',
  2006: '訂單金額或代收金額錯誤',
  2007: '商品類型為空',
  2008: '訂單為空',
  2009: '門市店號為空',
  2010: '出貨日期為空',
  2011: '出貨金額為空',
  2012: '出貨編號不存在',
  2013: '母廠商不存在',
  2014: '子廠商不存在',
  2015: '出貨編號已存在',
  2016: '門市已關轉店，將進行退貨處理',
  2017: '出貨日期不符合規定',
  2018: '服務類型不符規定',
  2019: '商品類型不符規定',
  2020: '廠商尚未申請店配服務',
  2021: '同一批次出貨編號重複',
  2022: '出貨金額不符規定',
  2023: '取貨人姓名為空',
  2024: '訂單傳送超商成功',
  2025: '門市轉店號，舊門市店號已更新',
  2026: '無此門市，將進行退貨處理',
  2027: '門市指定時間不配送，後續配送中',
  2028: '門市關轉店，3 日內未更新新店號將進入退貨流程',
  2029: '門市尚未開店',
  2030: '物流中心驗收成功',
  2031: '等待賣家出貨',
  2032: '包裝異常，請洽客服',
  2033: '包裹超材，退回賣家',
  2034: '違禁品，退貨及罰款處理',
  2035: '訂單資料重複上傳',
  2036: '訂單超過驗收期限（賣家未出貨）',
  2037: '取件門市關轉，請重選門市',
  2038: '標籤錯誤，退回賣家',
  2039: '標籤錯誤，退回賣家',
  2040: '標籤錯誤，退回賣家',
  2041: '物流中心理貨中',
  2042: '包裹遺失，進入賠償程序',
  2043: '門市指定時間不配送，後續配送中',
  2045: '不正常到貨（商品提早到物流中心），退回賣家',
  2046: '貨件未取，退回物流中心',
  2047: '退貨時間延長，在判賠期限內退回',
  2048: '包裝異常，請洽客服',
  2049: '門市關店，將進行退貨處理',
  2050: '門市轉店，將進行退貨處理',
  2051: '賣家要求提早退貨',
  2052: '違禁品，退貨及罰款處理',
  2053: '門市誤刷取件，包裹退回中',
  2054: '賣家要求提早退貨',
  2055: '包裹退至物流中心',
  2057: '車輛故障，後續配送中',
  2058: '天候不佳，後續配送中',
  2059: '道路中斷，後續配送中',
  2060: '門市停業，退回賣家',
  2061: '包裹異常，請洽客服',
  2062: '包裹門市確認中',
  2063: '包裹配達取件門市',
  2065: '買家未取包裹，將退回物流中心',
  2066: '包裹確認中，將退回物流中心',
  2067: '買家已到店取貨',
  2068: '賣家已到門市寄件',
  2069: '退貨便收件，商品退回指定門市',
  2070: '賣家已領回退回包裹',
  2071: '門市代碼格式錯誤',
  2072: '包裹已退至原寄件門市',
  2073: '包裹配達取件門市',
  2074: '買家未取包裹，將退回物流中心',
  2075: '賣家未取包裹，將退回物流中心',
  2076: '買家未取包裹，已退回物流中心',
  2077: '賣家未取包裹，待申請退回',
  2078: '買家未取包裹，已退回物流中心',
  2079: '買家未取貨退回物流中心：商品瑕疵',
  2080: '買家未取貨退回物流中心：包裹超材',
  2081: '買家未取貨退回物流中心：違禁品',
  2082: '買家未取貨退回物流中心：訂單資料重複上傳',
  2083: '買家未取貨退回物流中心：已過門市進貨日',
  2084: '買家未取貨退回物流中心：標籤規格錯誤',
  2085: '買家未取貨退回物流中心：標籤無法判讀',
  2086: '買家未取貨退回物流中心：標籤資料錯誤',
  2087: '買家未取貨退回物流中心：物流中心理貨中',
  2088: '買家未取貨退回物流中心：商品遺失',
  2089: '買家未取貨退回物流中心：門市指定不配送（六、日）',
  2092: '買家未取貨退回物流中心：門市關轉',
  2093: '買家未取貨退回物流中心：爆量',
  2094: '包裹異常，請洽客服',
  2095: '天候路況不佳，後續配送中',
  2096: '賣家未取包裹，待申請退回',
  2097: '包裹宅配退回中',
  2098: '包裹重新配達取件門市',
  2099: '包裹重新配達寄件門市',
  2101: '門市關轉店',
  2102: '門市舊店號更新',
  2103: '無取件門市資料',
  2104: '門市關轉，請重選門市',
  2105: '已申請門市變更',
  3018: '包裹配達取件門市',
  3019: '包裹已退至原寄件門市',
  3020: '買家未取包裹，將退回物流中心',
  3021: '賣家未取包裹，待申請退回',
  3022: '買家已到店取貨',
  3023: '賣家已領回退回包裹',
  3024: '物流中心驗收成功',
  3025: '買家未取包裹，已退回物流中心',
  3029: '包裹已配達指定取件門市',
  3031: '包裹已退至指定寄件門市',
  3032: '賣家已到門市寄件',
  3033: '賣家要求提早退貨',
  4001: '買家已到門市寄出退貨',
  4002: '退貨商品已至物流中心',
  5001: '包裹損壞，站所將協助退貨',
  5002: '包裹遺失',
  5003: '寄件人與收件人皆聯絡不到',
  5004: '賣家未取包裹，待申請退回',
  5005: '代收退貨',
  5006: '代收包裹毀損',
  5007: '代收包裹遺失',
  5008: '退貨已配達',
  5009: '包裹異常，請洽客服',
  7001: '包裹超大，門市不予收件',
  7002: '包裹超重，門市不予收件',
  7003: '地址錯誤，請聯繫收件人',
  7004: '航班延誤',
  7005: '託運單已刪除',
  7006: '包裹遺失，進入賠償程序',
  7007: '包裹遺失，進入賠償程序',
  7008: '包裹破損，請洽客服',
  7009: '包裝異常，請洽客服',
  7010: '包裝異常，請洽客服',
  7011: '取件門市關轉，請重選門市',
  7012: '條碼錯誤，退回賣家',
  7013: '訂單超過寄件期限（賣家未出貨）',
  7014: '等待賣家出貨',
  7015: '條碼重複，請洽客服',
  7016: '包裹超材，退回賣家',
  7017: '取件包裹異常，協尋中',
  7018: '包裹遺失，進入賠償程序',
  7019: '寄件包裹異常，協尋中',
  7020: '包裹遺失，進入賠償程序',
  7021: '包裹異常，請洽客服',
  7022: '包裹異常，請洽客服',
  7023: '包裹異常，請洽客服',
  7032: '寄件門市關轉，請重選門市',
  7034: '貨物進店發生異常，請洽客服',
  7035: '逾期未領，貨件已銷毀',
  7036: '貨件破損，請洽客服',
  7037: '訂單上傳失敗',
  7038: '門市驗收異常，請洽客服',
  9001: '退貨已領回',
  9002: '退貨已領回',
  9999: '物流單已取消',
};

const STAGE_NAMES = new Set<string>(Object.keys(STAGE_META));

/** 由 STAGE_CODES 反推的查表，模組載入時建立一次。 */
const CODE_STAGE: Map<number, ShipmentStage> = new Map(
  Object.entries(STAGE_CODES).flatMap(([stage, codes]) =>
    codes.map((code): [number, ShipmentStage] => [code, toStage(stage)]),
  ),
);

/** 把資料庫或分組鍵的字串收斂成 ShipmentStage，未知值當成 draft。 */
export function toStage(value: string | null): ShipmentStage {
  return value !== null && STAGE_NAMES.has(value)
    ? // eslint-disable-next-line typescript/no-unsafe-type-assertion -- 上一行已確認 value 是 STAGE_META 的鍵
      (value as ShipmentStage)
    : 'draft';
}

/** 貨態代碼對應的階段，代碼不在官方表內時回傳 null（畫面保留現有階段）。 */
export function stageForCode(code: number | null): ShipmentStage | null {
  if (code === null) return null;
  return CODE_STAGE.get(code) ?? null;
}

/** 代碼的中文說明；優先用官方表，沒有對應時退回綠界回傳的原文。 */
export function codeLabel(code: number | null, fallback: string | null): string {
  if (code !== null) {
    const known = CODE_LABELS[code];
    if (known !== undefined) return known;
  }
  const trimmed = (fallback ?? '').trim();
  if (trimmed !== '') return trimmed;
  return code === null ? '狀態更新' : `貨態代碼 ${code}`;
}

/** 時間軸上的位置；分支狀態回傳 -1。 */
export function timelineIndex(stage: ShipmentStage): number {
  if (stage === 'draft') return 0;
  const found = SHIPMENT_TIMELINE.indexOf(
    // eslint-disable-next-line typescript/no-unsafe-type-assertion -- indexOf 只用來查位置，不在陣列裡就是 -1
    stage as TimelineStage,
  );
  return found;
}

/**
 * 貨態通知可能不按順序抵達（同一批交換檔會夾帶舊狀態），所以只允許在時間軸上前進；
 * 退回、異常、取消、失敗這些分支狀態一律直接生效。
 */
export function nextStage(current: ShipmentStage, incoming: ShipmentStage): ShipmentStage {
  if (STAGE_META[incoming].isAlert) return incoming;
  if (current === 'draft') return incoming;
  const from = timelineIndex(current);
  if (from === -1) return current;
  return timelineIndex(incoming) > from ? incoming : current;
}
