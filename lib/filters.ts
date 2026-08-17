import {
  ALL_CATEGORY,
  type ConditionCode,
  PRICE_RANGES,
  type SortCode,
  getCondition,
} from '@/lib/constants';
import { regionFromLocationText } from '@/lib/regions';
import type { Listing } from '@/lib/store';

export type ListingFilters = {
  query: string;
  category: string;
  conditions: ConditionCode[];
  logistics: string[];
  priceCode: string;
  region: string | null;
  sort: SortCode;
};

export const DEFAULT_FILTERS: ListingFilters = {
  query: '',
  category: ALL_CATEGORY,
  conditions: [],
  logistics: [],
  priceCode: 'all',
  region: null,
  sort: 'recommended',
};

/** Number of narrowing choices in effect, used for the badge on the filter button. */
export function activeFilterCount(filters: ListingFilters): number {
  let count = 0;
  if (filters.category !== ALL_CATEGORY) count += 1;
  count += filters.conditions.length;
  count += filters.logistics.length;
  if (filters.priceCode !== 'all') count += 1;
  if (filters.region) count += 1;
  return count;
}

function priceRange(code: string) {
  return PRICE_RANGES.find((range) => range.code === code) ?? PRICE_RANGES[0];
}

function matchesQuery(listing: Listing, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;

  const haystack = [
    listing.title,
    listing.description ?? '',
    listing.category ?? '',
    listing.meetup_location ?? '',
    listing.seller?.username ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

/** Public feed rules: approved only, seller-hidden and sold items excluded. */
export function isBrowsable(listing: Listing): boolean {
  return (
    listing.moderation_status === 'approved' &&
    listing.status !== 'hidden' &&
    listing.status !== 'sold'
  );
}

export function applyFilters(
  listings: Listing[],
  filters: ListingFilters,
  promotedUntil: Record<string, string>,
): Listing[] {
  const range = priceRange(filters.priceCode);

  const filtered = listings.filter((listing) => {
    if (!isBrowsable(listing)) return false;
    if (filters.category !== ALL_CATEGORY && listing.category !== filters.category) return false;
    if (
      filters.conditions.length > 0 &&
      !filters.conditions.includes(getCondition(listing.condition_rating).code)
    ) {
      return false;
    }
    if (filters.logistics.length > 0 && !filters.logistics.includes(listing.logistics ?? '面交')) {
      return false;
    }
    if (listing.price < range.min) return false;
    if (range.max !== null && listing.price > range.max) return false;
    if (filters.region) {
      const region = regionFromLocationText(listing.meetup_location);
      if (region !== filters.region) return false;
    }
    return matchesQuery(listing, filters.query);
  });

  return sortListings(filtered, filters.sort, promotedUntil);
}

export function sortListings(
  listings: Listing[],
  sort: SortCode,
  promotedUntil: Record<string, string>,
): Listing[] {
  const sorted = [...listings];

  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'price_low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'trust':
      return sorted.sort((a, b) => (b.seller?.trust_score ?? 0) - (a.seller?.trust_score ?? 0));
    default:
      return sorted.sort((a, b) => {
        const aPromoted = Boolean(promotedUntil[a.id]);
        const bPromoted = Boolean(promotedUntil[b.id]);
        if (aPromoted !== bPromoted) return aPromoted ? -1 : 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }
}
