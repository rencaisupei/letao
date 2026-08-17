import { bilt } from '@/lib/bilt';
import type { UserRole } from '@/lib/constants';
import { type Listing, toListing } from '@/lib/store';

export type SellerProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  trust_score: number | null;
  verified_status: boolean | null;
  role: UserRole | null;
  created_at: string;
};

export type Review = {
  id: string;
  seller_id: string;
  reviewer_id: string;
  listing_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewerName: string | null;
};

const LISTING_COLUMNS =
  'id, seller_id, title, description, price, allow_negotiation, condition_rating, category, logistics, images, meetup_location, status, moderation_status, moderation_reason, created_at, profiles(username, trust_score, verified_status)';

/**
 * PostgREST payloads are untyped, so rows are shaped here. `T` is provided by
 * the caller because there is nothing in `unknown` to infer it from.
 */
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

export async function fetchListingById(listingId: string): Promise<Listing | null> {
  const { data } = await bilt
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('id', listingId)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- untyped PostgREST row shaped into the listing type
  return toListing(data);
}

export async function fetchListingsByIds(listingIds: string[]): Promise<Listing[]> {
  if (listingIds.length === 0) return [];
  const { data } = await bilt.from('listings').select(LISTING_COLUMNS).in('id', listingIds);
  return asRows<Parameters<typeof toListing>[0]>(data).map(toListing);
}

export async function fetchSellerProfile(sellerId: string): Promise<SellerProfile | null> {
  const { data } = await bilt
    .from('profiles')
    .select('id, username, avatar_url, bio, trust_score, verified_status, role, created_at')
    .eq('id', sellerId)
    .maybeSingle();
  return asRow<SellerProfile>(data);
}

export async function fetchSellerListings(sellerId: string): Promise<Listing[]> {
  const { data } = await bilt
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(60);
  return asRows<Parameters<typeof toListing>[0]>(data).map(toListing);
}

export async function fetchSellerReviews(sellerId: string): Promise<Review[]> {
  const { data } = await bilt
    .from('reviews')
    .select('id, seller_id, reviewer_id, listing_id, rating, comment, created_at')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = asRows<Omit<Review, 'reviewerName'>>(data);
  if (rows.length === 0) return [];

  const reviewerIds = [...new Set(rows.map((row) => row.reviewer_id))];
  const { data: profiles } = await bilt
    .from('profiles')
    .select('id, username')
    .in('id', reviewerIds);

  const names = new Map<string, string | null>();
  for (const profile of asRows<{ id: string; username: string | null }>(profiles)) {
    names.set(profile.id, profile.username);
  }

  return rows.map((row) => ({ ...row, reviewerName: names.get(row.reviewer_id) ?? null }));
}

export type SubmitReviewResult =
  | { ok: true; trustScore: number; reviewCount: number }
  | { ok: false };

export async function submitReview(
  sellerId: string,
  rating: number,
  comment: string,
  listingId: string | null,
): Promise<SubmitReviewResult> {
  const { data, error } = await bilt.rpc('submit_review', {
    p_seller_id: sellerId,
    p_rating: rating,
    p_comment: comment,
    p_listing_id: listingId,
  });

  if (error) return { ok: false };
  const row = asRow<{ ok: boolean; trust_score: number | null; review_count: number | null }>(data);
  if (!row?.ok) return { ok: false };

  return { ok: true, trustScore: row.trust_score ?? 80, reviewCount: row.review_count ?? 1 };
}

export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export type ModerationSelfTest = {
  aiEnabled: boolean;
  ok: boolean;
  model: string | null;
  error: string | null;
  latencyMs: number | null;
  ruleTokens: number | null;
};

/** Explains an AI moderation failure in plain Chinese for the diagnostics screen. */
export function moderationErrorMessage(error: string | null): string {
  switch (error) {
    case null:
      return '語意審核正常運作';
    case 'missing_key':
      return '尚未設定 OpenAI 金鑰，目前只跑關鍵字規則';
    case 'invalid_key':
      return '金鑰無效或已被撤銷，請重新設定';
    case 'quota_or_rate_limit':
      return 'OpenAI 額度不足或呼叫過於頻繁';
    case 'timeout':
      return 'OpenAI 逾時未回應（超過 12 秒）';
    case 'network':
      return '無法連線到 OpenAI';
    case 'unexpected_response':
      return 'OpenAI 回覆格式無法解析';
    default:
      return `OpenAI 回應錯誤：${error}`;
  }
}

/** Calls the moderation service in self-test mode; no listing is touched. */
export async function runModerationSelfTest(): Promise<ModerationSelfTest> {
  const { data, error } = await bilt.functions.invoke('moderate-listing', {
    body: { selftest: true },
  });

  if (error || !data) {
    return {
      aiEnabled: false,
      ok: false,
      model: null,
      error: 'network',
      latencyMs: null,
      ruleTokens: null,
    };
  }

  const row = asRow<{
    ai_enabled?: boolean;
    ok?: boolean;
    model?: string | null;
    error?: string | null;
    latency_ms?: number | null;
    rule_tokens?: number | null;
  }>(data);

  return {
    aiEnabled: row?.ai_enabled === true,
    ok: row?.ok === true,
    model: row?.model ?? null,
    error: row?.error ?? null,
    latencyMs: row?.latency_ms ?? null,
    ruleTokens: row?.rule_tokens ?? null,
  };
}
