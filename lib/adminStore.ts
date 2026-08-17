import { create } from 'zustand';

import { bilt } from '@/lib/bilt';
import type { ModerationStatus } from '@/lib/constants';
import { type Listing, toListing } from '@/lib/store';

export type AdminStats = {
  pending_count: number;
  flagged_count: number;
  rejected_count: number;
  approved_count: number;
  open_reports: number;
  user_count: number;
};

export type AdminReport = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  detail: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  listings: { id: string; title: string; seller_id: string; moderation_status: string } | null;
};

const LISTING_COLUMNS =
  'id, seller_id, title, description, price, allow_negotiation, condition_rating, category, logistics, shipping_options, payment_methods, parcel_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, origin_region, images, meetup_location, status, moderation_status, moderation_reason, created_at, profiles(username, trust_score, verified_status)';

type AdminState = {
  stats: AdminStats | null;
  queue: Listing[];
  reports: AdminReport[];
  isLoading: boolean;
  load: () => Promise<void>;
  reviewListing: (listingId: string, status: ModerationStatus, reason: string) => Promise<boolean>;
  resolveReport: (reportId: string, status: 'resolved' | 'dismissed') => Promise<boolean>;
  setVerified: (userId: string, verified: boolean) => Promise<boolean>;
};

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

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  queue: [],
  reports: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true });

    const [statsResult, queueResult, reportsResult] = await Promise.all([
      bilt.rpc('admin_stats'),
      bilt
        .from('listings')
        .select(LISTING_COLUMNS)
        .in('moderation_status', ['pending', 'flagged', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(100),
      bilt
        .from('reports')
        .select(
          'id, listing_id, reporter_id, reason, detail, status, created_at, listings(id, title, seller_id, moderation_status)',
        )
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    set({
      stats: asRow<AdminStats>(statsResult.data),
      queue: asRows<Parameters<typeof toListing>[0]>(queueResult.data).map(toListing),
      reports: asRows<AdminReport>(reportsResult.data),
      isLoading: false,
    });
  },

  reviewListing: async (listingId, status, reason) => {
    const { data, error } = await bilt.rpc('admin_review_listing', {
      p_listing_id: listingId,
      p_status: status,
      p_reason: reason,
    });
    if (error) return false;
    const row = asRow<{ ok: boolean }>(data);
    if (!row?.ok) return false;

    set({
      queue: get().queue.map((listing) =>
        listing.id === listingId
          ? { ...listing, moderation_status: status, moderation_reason: reason || null }
          : listing,
      ),
    });
    await get().load();
    return true;
  },

  resolveReport: async (reportId, status) => {
    const { data, error } = await bilt.rpc('admin_resolve_report', {
      p_report_id: reportId,
      p_status: status,
    });
    if (error) return false;
    const row = asRow<{ ok: boolean }>(data);
    if (!row?.ok) return false;

    set({
      reports: get().reports.map((report) =>
        report.id === reportId ? { ...report, status } : report,
      ),
    });
    return true;
  },

  setVerified: async (userId, verified) => {
    const { data, error } = await bilt.rpc('admin_set_verified', {
      p_user_id: userId,
      p_verified: verified,
    });
    if (error) return false;
    return asRow<{ ok: boolean }>(data)?.ok ?? false;
  },
}));
