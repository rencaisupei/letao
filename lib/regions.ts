/** Taiwan cities / counties used for the location filter and the listing form. */
export const TAIWAN_REGIONS: string[] = [
  '台北',
  '新北',
  '基隆',
  '桃園',
  '新竹',
  '苗栗',
  '台中',
  '彰化',
  '南投',
  '雲林',
  '嘉義',
  '台南',
  '高雄',
  '屏東',
  '宜蘭',
  '花蓮',
  '台東',
  '澎湖',
  '金門',
  '連江',
];

/** "台北 ∙ 信義區" -> "台北". */
export function regionFromLocationText(text: string | null | undefined): string | null {
  if (!text) return null;
  return TAIWAN_REGIONS.find((region) => text.includes(region)) ?? null;
}
