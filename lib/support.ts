import { bilt } from '@/lib/bilt';

/** Public support mailbox shown on the privacy and contact screens. */
export const SUPPORT_EMAIL = 'letao@talent-core-pro.com';

/** Shown as the effective date of the privacy policy. */
export const POLICY_UPDATED_AT = '2026 年 8 月 20 日';

export const SUBJECT_MAX_LENGTH = 80;
export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 2000;

export type SupportCategory = 'account' | 'listing' | 'order' | 'payment' | 'safety' | 'other';

export const SUPPORT_CATEGORIES: { code: SupportCategory; label: string }[] = [
  { code: 'account', label: '帳號與登入' },
  { code: 'listing', label: '上架與審核' },
  { code: 'order', label: '交易與運送' },
  { code: 'payment', label: '付款與 EcoCoins' },
  { code: 'safety', label: '檢舉與安全' },
  { code: 'other', label: '其他問題' },
];

export type SupportStatus = 'open' | 'in_progress' | 'resolved';

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  open: '已送出，等待客服',
  in_progress: '客服處理中',
  resolved: '已回覆',
};

export type SupportMessage = {
  id: string;
  created_at: string;
  status: SupportStatus;
  category: SupportCategory;
  subject: string;
  message: string;
  admin_reply: string | null;
  handled_at: string | null;
};

export function categoryLabel(category: SupportCategory): string {
  return SUPPORT_CATEGORIES.find((entry) => entry.code === category)?.label ?? '其他問題';
}

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

export type SubmitSupportResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'invalid' | 'network' };

export type SubmitSupportInput = {
  /** Tickets are always tied to an account; the contact form requires sign-in. */
  userId: string;
  replyEmail: string;
  category: SupportCategory;
  subject: string;
  message: string;
};

/**
 * Files a support request for the signed-in user. Row-level security ties the
 * row to them and enforces the daily quota.
 */
export async function submitSupportMessage(
  input: SubmitSupportInput,
): Promise<SubmitSupportResult> {
  const subject = input.subject.trim();
  const message = input.message.trim();
  const replyEmail = input.replyEmail.trim();

  if (subject.length < 2 || message.length < MESSAGE_MIN_LENGTH || !isValidEmail(replyEmail)) {
    return { ok: false, reason: 'invalid' };
  }

  const { error } = await bilt.from('support_messages').insert({
    user_id: input.userId,
    reply_email: replyEmail,
    category: input.category,
    subject,
    message,
  });

  if (!error) return { ok: true };
  // The insert policy also enforces a 10-per-day quota, which surfaces as an RLS denial.
  if (error.code === '42501') return { ok: false, reason: 'quota' };
  if (error.code === '23514') return { ok: false, reason: 'invalid' };
  return { ok: false, reason: 'network' };
}

/** The signed-in user's own tickets, newest first. */
export async function fetchMySupportMessages(userId: string): Promise<SupportMessage[]> {
  const { data } = await bilt
    .from('support_messages')
    .select('id, created_at, status, category, subject, message, admin_reply, handled_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting untyped PostgREST rows
  return Array.isArray(data) ? data : [];
}

/** Account email, used to prefill the reply address on the contact form. */
export async function fetchAccountEmail(): Promise<string | null> {
  const { data } = await bilt.auth.getUser();
  return data.user?.email ?? null;
}
