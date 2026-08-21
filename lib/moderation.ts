import { bilt } from '@/lib/bilt';

/**
 * Member-level (as opposed to listing-level) safety tools: reporting a person
 * and cutting off contact with them. Required by App Store review guideline 1.2
 * for apps with user-generated content.
 */

export type BlockState = 'none' | 'outgoing' | 'incoming' | 'both';

export const USER_REPORT_REASONS = [
  '騷擾、辱罵或威脅',
  '詐騙或可疑的付款要求',
  '垃圾訊息或重複廣告',
  '冒用他人身分',
  '不當或色情內容',
  '其他問題',
];

/**
 * Asks the server about the block relationship with another member. RLS only
 * exposes the blocks you created, so the incoming direction has to come from a
 * function.
 */
export async function fetchBlockState(userId: string): Promise<BlockState> {
  const { data, error } = await bilt.rpc('block_state', { p_user_id: userId });
  if (error) return 'none';
  if (data === 'outgoing' || data === 'incoming' || data === 'both') return data;
  return 'none';
}

/** Plain-language reason the message composer is disabled, or null when it isn't. */
export function blockNotice(state: BlockState): string | null {
  if (state === 'outgoing') {
    return '你已封鎖這位會員，雙方都無法再傳送訊息。想繼續對話請先解除封鎖。';
  }
  if (state === 'incoming') return '對方已停止與你的對話，目前無法傳送訊息。';
  if (state === 'both') return '雙方都已封鎖對方，無法再傳送訊息。';
  return null;
}
