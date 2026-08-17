import { bilt } from '@/lib/bilt';
import { MEETUP_METHOD } from '@/lib/constants';

/**
 * The rate table itself lives in Postgres (`quote_shipping_fee`) so the app and
 * `create_order` can never disagree about a fee. Everything here is a typed
 * wrapper around those RPCs plus the copy used to explain a quote.
 */

/** Where a quoted fee came from. */
export type QuoteSource =
  | 'rate_table'
  | 'rate_table_default'
  | 'estimate'
  | 'meetup'
  | 'seller'
  | 'unsupported'
  | 'lalamove_live';

export type ShippingQuote = {
  method: string;
  available: boolean;
  fee: number;
  /** Size / weight bracket the fee came from, e.g. "90cm 級距 ∙ 10kg 內". */
  tier: string | null;
  note: string | null;
  source: QuoteSource;
};

/** A quote for one option the seller already saved on a listing. */
export type ListingShippingQuote = ShippingQuote & {
  mode: 'auto' | 'manual';
  /** The fee stored on the listing (base fee for auto options). */
  sellerFee: number;
};

/** Package measurements the rate engine needs. */
export type ParcelSpec = {
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  originRegion: string | null;
};

export const EMPTY_PARCEL: ParcelSpec = {
  weightKg: null,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  originRegion: null,
};

/** Fee is kept as raw text while the seller types. */
export type ParcelDraft = {
  weight: string;
  length: string;
  width: string;
  height: string;
  originRegion: string | null;
};

export const EMPTY_PARCEL_DRAFT: ParcelDraft = {
  weight: '',
  length: '',
  width: '',
  height: '',
  originRegion: null,
};

export const PARCEL_LIMITS = {
  maxWeightKg: 30,
  maxSideCm: 200,
};

export type ParcelDraftResult =
  | { ok: true; parcel: ParcelSpec; isComplete: boolean }
  | { ok: false; message: string };

function parseDimension(raw: string, label: string): number | null | string {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value <= 0) return `${label}請填大於 0 的數字。`;
  if (value > PARCEL_LIMITS.maxSideCm) {
    return `${label}上限為 ${PARCEL_LIMITS.maxSideCm} 公分。`;
  }
  return Math.round(value * 10) / 10;
}

/** Validates the typed package fields; empty fields are allowed (no auto quote). */
export function parseParcelDraft(draft: ParcelDraft): ParcelDraftResult {
  const weightRaw = draft.weight.trim();
  let weightKg: number | null = null;
  if (weightRaw !== '') {
    const value = Number.parseFloat(weightRaw);
    if (!Number.isFinite(value) || value <= 0) {
      return { ok: false, message: '包裝重量請填大於 0 的數字，例如 1.2。' };
    }
    if (value > PARCEL_LIMITS.maxWeightKg) {
      return { ok: false, message: `包裝重量上限為 ${PARCEL_LIMITS.maxWeightKg} 公斤。` };
    }
    weightKg = Math.round(value * 100) / 100;
  }

  const dims: (number | null)[] = [];
  for (const [raw, label] of [
    [draft.length, '長度'],
    [draft.width, '寬度'],
    [draft.height, '高度'],
  ] as const) {
    const parsed = parseDimension(raw, label);
    if (typeof parsed === 'string') return { ok: false, message: parsed };
    dims.push(parsed);
  }

  const [lengthCm, widthCm, heightCm] = dims;
  const filled = [weightKg, lengthCm, widthCm, heightCm].filter((value) => value !== null).length;

  if (filled > 0 && filled < 4) {
    return {
      ok: false,
      message: '自動試算需要重量與長、寬、高四個欄位都填寫，或四個都留空改用自訂運費。',
    };
  }

  return {
    ok: true,
    parcel: {
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      originRegion: draft.originRegion,
    },
    isComplete: filled === 4,
  };
}

export function parcelDraftFrom(parcel: ParcelSpec): ParcelDraft {
  return {
    weight: parcel.weightKg === null ? '' : String(parcel.weightKg),
    length: parcel.lengthCm === null ? '' : String(parcel.lengthCm),
    width: parcel.widthCm === null ? '' : String(parcel.widthCm),
    height: parcel.heightCm === null ? '' : String(parcel.heightCm),
    originRegion: parcel.originRegion,
  };
}

/** L + W + H, the number Taiwanese carriers price on. */
export function parcelGirth(parcel: ParcelSpec): number | null {
  if (parcel.lengthCm === null || parcel.widthCm === null || parcel.heightCm === null) return null;
  return parcel.lengthCm + parcel.widthCm + parcel.heightCm;
}

type QuoteRow = {
  method: string;
  available: boolean;
  fee: number | string | null;
  tier: string | null;
  note: string | null;
  source: string | null;
};

type ListingQuoteRow = QuoteRow & {
  mode: string | null;
  seller_fee: number | string | null;
};

function asRows<T>(value: unknown): T[] {
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting untyped API rows to the caller-supplied shape
  return Array.isArray(value) ? (value as T[]) : [];
}

function toSource(value: string | null): QuoteSource {
  if (
    value === 'rate_table' ||
    value === 'rate_table_default' ||
    value === 'estimate' ||
    value === 'meetup' ||
    value === 'seller' ||
    value === 'unsupported' ||
    value === 'lalamove_live'
  ) {
    return value;
  }
  return 'unsupported';
}

function toQuote(row: QuoteRow): ShippingQuote {
  return {
    method: row.method,
    available: row.available,
    fee: Math.round(Number(row.fee ?? 0)),
    tier: row.tier,
    note: row.note,
    source: toSource(row.source),
  };
}

/** Rate-table quote for a set of methods, before the listing exists. */
export async function quoteMethods(
  methods: string[],
  parcel: ParcelSpec,
  destRegion: string | null,
): Promise<ShippingQuote[]> {
  if (methods.length === 0) return [];

  const { data, error } = await bilt.rpc('quote_shipping', {
    p_methods: methods,
    p_weight: parcel.weightKg,
    p_length: parcel.lengthCm,
    p_width: parcel.widthCm,
    p_height: parcel.heightCm,
    p_from: parcel.originRegion,
    p_to: destRegion,
  });

  if (error) return [];
  return asRows<QuoteRow>(data).map(toQuote);
}

/** Server-priced options for a published listing, for a buyer's destination. */
export async function quoteListingShipping(
  listingId: string,
  destRegion: string | null,
): Promise<ListingShippingQuote[]> {
  const { data, error } = await bilt.rpc('quote_listing_shipping', {
    p_listing_id: listingId,
    p_to: destRegion,
  });

  if (error) return [];
  return asRows<ListingQuoteRow>(data).map((row) => ({
    ...toQuote(row),
    mode: row.mode === 'auto' ? 'auto' : 'manual',
    sellerFee: Math.round(Number(row.seller_fee ?? 0)),
  }));
}

const SOURCE_LABELS: Record<QuoteSource, string> = {
  rate_table: '費率表自動試算',
  rate_table_default: '標準包裝估算',
  estimate: '車資估算',
  lalamove_live: 'Lalamove 即時報價',
  meetup: '面交免運',
  seller: '賣家自訂',
  unsupported: '需自訂運費',
};

export function sourceLabel(source: QuoteSource): string {
  return SOURCE_LABELS[source];
}

/** The cheapest option a buyer can actually pick. */
export function cheapestQuote<T extends ShippingQuote>(quotes: T[]): T | null {
  const usable = quotes.filter((quote) => quote.available);
  if (usable.length === 0) return null;
  return usable.reduce((best, quote) => (quote.fee < best.fee ? quote : best));
}

/** True when a destination changes the price for at least one option. */
export function isRegionSensitive(quotes: ShippingQuote[]): boolean {
  return quotes.some(
    (quote) =>
      quote.method !== MEETUP_METHOD &&
      (quote.source === 'rate_table' ||
        quote.source === 'rate_table_default' ||
        quote.source === 'estimate'),
  );
}

export type SelfTestResult = {
  rateTableOk: boolean;
  sampleFee: number | null;
  sampleTier: string | null;
  lalamoveConfigured: boolean;
  lalamoveEnv: string | null;
  latencyMs: number;
};

type SelfTestRow = {
  rate_table_ok?: boolean;
  sample_fee?: number | null;
  sample_tier?: string | null;
  lalamove_configured?: boolean;
  lalamove_env?: string | null;
  latency_ms?: number;
};

/** Diagnostics: checks the rate table and reports the Lalamove adapter state. */
export async function runShippingSelfTest(): Promise<SelfTestResult | null> {
  const { data, error } = await bilt.functions.invoke('shipping-quote', {
    body: { selftest: true },
  });
  if (error) return null;

  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting the untyped function payload
  const row = (data ?? {}) as SelfTestRow;

  return {
    rateTableOk: row.rate_table_ok === true,
    sampleFee: row.sample_fee ?? null,
    sampleTier: row.sample_tier ?? null,
    lalamoveConfigured: row.lalamove_configured === true,
    lalamoveEnv: row.lalamove_env ?? null,
    latencyMs: row.latency_ms ?? 0,
  };
}
