/**
 * Turns a bilt-cloud auth error into a message a Taiwanese user can act on.
 *
 * The sign-in screen used to collapse every failure into "驗證碼沒有寄出，請稍後再試",
 * which made a disabled auth capability indistinguishable from a rate limit or a
 * typo in the address. Keep the mapped hint first and append the raw provider
 * text so a stuck user can report something concrete.
 */
export type AuthErrorLike = { message?: string | null; status?: number | null } | null | undefined;

export type AuthErrorInfo = {
  title: string;
  message: string;
  /** Seconds the caller should wait before retrying, when the provider says so. */
  retryAfterSeconds: number | null;
};

function secondsFrom(raw: string): number | null {
  const match = /after (\d+) seconds?/i.exec(raw);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function withDetail(message: string, raw: string): string {
  const detail = raw.trim();
  if (!detail) return message;
  return `${message}\n\n技術訊息：${detail}`;
}

export function describeSendError(error: AuthErrorLike): AuthErrorInfo {
  const raw = error?.message ?? '';
  const lower = raw.toLowerCase();
  const wait = secondsFrom(raw);

  if (wait !== null) {
    return {
      title: '請稍等一下',
      message: `為了防止濫用，同一個信箱要間隔 ${wait} 秒才能再寄一次驗證碼。`,
      retryAfterSeconds: wait,
    };
  }

  if (lower.includes('signups not allowed') || lower.includes('signup is disabled')) {
    return {
      title: '註冊功能未開啟',
      message: withDetail('後端目前不允許新帳號註冊，請開啟登入功能後再試一次。', raw),
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('rate limit') || error?.status === 429) {
    return {
      title: '寄送次數已達上限',
      message: withDetail('這個信箱短時間內索取太多次驗證碼，請等幾分鐘後再試。', raw),
      retryAfterSeconds: 60,
    };
  }

  if (lower.includes('invalid format') || lower.includes('unable to validate email')) {
    return {
      title: 'Email 格式不正確',
      message: withDetail('請確認信箱拼寫，例如是否少了 @ 或網域。', raw),
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('error sending') || lower.includes('smtp')) {
    return {
      title: '信件寄送失敗',
      message: withDetail('後端能收到請求，但寄信服務出錯了，請稍後再試。', raw),
      retryAfterSeconds: null,
    };
  }

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed')
  ) {
    return {
      title: '連線失敗',
      message: withDetail('連不上伺服器，請確認網路後再試一次。', raw),
      retryAfterSeconds: null,
    };
  }

  return {
    title: '寄送失敗',
    message: withDetail('驗證碼沒有寄出。', raw || '沒有取得詳細原因。'),
    retryAfterSeconds: null,
  };
}

export function describeVerifyError(error: AuthErrorLike): AuthErrorInfo {
  const raw = error?.message ?? '';
  const lower = raw.toLowerCase();

  if (lower.includes('expired')) {
    return {
      title: '驗證碼已過期',
      message: '這組號碼已經失效，請重新寄送一次驗證碼。',
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('invalid') || lower.includes('token')) {
    return {
      title: '驗證碼不正確',
      message: '請確認信件中最新一封的 6 位數字，舊信件的號碼會失效。',
      retryAfterSeconds: null,
    };
  }

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed')
  ) {
    return {
      title: '連線失敗',
      message: withDetail('連不上伺服器，請確認網路後再試一次。', raw),
      retryAfterSeconds: null,
    };
  }

  return {
    title: '驗證失敗',
    message: withDetail('無法完成驗證。', raw || '沒有取得詳細原因。'),
    retryAfterSeconds: null,
  };
}
