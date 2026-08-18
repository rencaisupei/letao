/**
 * Turns a bilt-cloud auth error into a message a Taiwanese user can act on.
 *
 * The sign-in screen used to collapse every failure into "驗證碼沒有寄出，請稍後再試",
 * which made a disabled auth capability indistinguishable from a rate limit or a
 * typo in the address. Keep the mapped hint first and append the raw provider
 * text so a stuck user can report something concrete.
 */
export type AuthErrorLike = { message?: string | null; status?: number | null } | null | undefined;

/** Client-side floor for passwords; the backend enforces its own minimum too. */
export const MIN_PASSWORD_LENGTH = 8;

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

export function describePasswordSignInError(error: AuthErrorLike): AuthErrorInfo {
  const raw = error?.message ?? '';
  const lower = raw.toLowerCase();
  const wait = secondsFrom(raw);

  if (lower.includes('email not confirmed')) {
    return {
      title: '帳號尚未完成驗證',
      message: '這個信箱還沒驗證過，請改用「用驗證碼登入」收信完成驗證，之後密碼就能直接使用。',
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return {
      title: '帳號或密碼不正確',
      message:
        '請確認密碼是否輸入正確。如果你之前是用驗證碼註冊的，這組帳號還沒有密碼，請按「忘記密碼」設定一組。',
      retryAfterSeconds: null,
    };
  }

  if (wait !== null) {
    return {
      title: '請稍等一下',
      message: `嘗試次數太多，請等 ${wait} 秒後再登入。`,
      retryAfterSeconds: wait,
    };
  }

  if (lower.includes('rate limit') || error?.status === 429) {
    return {
      title: '嘗試次數已達上限',
      message: withDetail('短時間內登入太多次，請等幾分鐘後再試。', raw),
      retryAfterSeconds: 60,
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
    title: '登入失敗',
    message: withDetail('無法完成登入。', raw || '沒有取得詳細原因。'),
    retryAfterSeconds: null,
  };
}

export function describeSignUpError(error: AuthErrorLike): AuthErrorInfo {
  const raw = error?.message ?? '';
  const lower = raw.toLowerCase();

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return {
      title: '這個 Email 已經註冊過',
      message: '請改用密碼登入；忘記密碼的話按「忘記密碼」重設一組。',
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('password') && (lower.includes('short') || lower.includes('least'))) {
    return {
      title: '密碼太短',
      message: withDetail(`密碼至少要 ${MIN_PASSWORD_LENGTH} 個字，建議混合英文與數字。`, raw),
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('weak password') || lower.includes('pwned')) {
    return {
      title: '密碼強度不足',
      message: withDetail('這組密碼太容易被猜到，請換一組較不常見的密碼。', raw),
      retryAfterSeconds: null,
    };
  }

  return describeSendError(error);
}

export function describePasswordUpdateError(error: AuthErrorLike): AuthErrorInfo {
  const raw = error?.message ?? '';
  const lower = raw.toLowerCase();

  if (lower.includes('should be different')) {
    return {
      title: '密碼與舊的相同',
      message: '新密碼不能和目前的密碼一樣，請換一組。',
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('password') && (lower.includes('short') || lower.includes('least'))) {
    return {
      title: '密碼太短',
      message: withDetail(`密碼至少要 ${MIN_PASSWORD_LENGTH} 個字。`, raw),
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('weak password') || lower.includes('pwned')) {
    return {
      title: '密碼強度不足',
      message: withDetail('這組密碼太容易被猜到，請換一組較不常見的密碼。', raw),
      retryAfterSeconds: null,
    };
  }

  if (lower.includes('session') || lower.includes('jwt')) {
    return {
      title: '驗證階段已失效',
      message: withDetail('重設流程逾時了，請重新寄一次驗證碼。', raw),
      retryAfterSeconds: null,
    };
  }

  return {
    title: '密碼設定失敗',
    message: withDetail('驗證成功但新密碼沒有存起來，請重新試一次。', raw || '沒有取得詳細原因。'),
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
