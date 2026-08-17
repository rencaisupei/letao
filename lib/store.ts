import { create } from 'zustand';

import { bilt } from '@/lib/bilt';
import { BUMP_COST, DEMO_LISTINGS, type ConditionCode } from '@/lib/constants';
import { demoImageUri } from '@/lib/demoImages';

export type Seller = {
  username: string | null;
  trust_score: number | null;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  allow_negotiation: boolean;
  condition_rating: ConditionCode;
  category: string | null;
  logistics: string | null;
  images: string[] | null;
  meetup_location: string | null;
  status: 'available' | 'reserved' | 'sold';
  created_at: string;
  seller: Seller | null;
};

export type NewListingInput = {
  title: string;
  price: number;
  category: string;
  condition: ConditionCode;
  logistics: string;
  meetupLocation: string;
  description: string;
  imageUrl: string;
};

export type BumpResult =
  | { ok: true; endsAt: string; balance: number }
  | { ok: false; reason: 'insufficient' | 'active' | 'error'; balance: number };

type BootstrapRow = { user_id: string | null; username: string | null; balance: number | null };
type BumpRow = {
  ok: boolean;
  balance: number | null;
  promotion_id: string | null;
  ends_at: string | null;
};
type ClaimRow = { ok: boolean; balance: number | null };

type ListingRow = Omit<Listing, 'seller' | 'price'> & {
  price: number | string;
  profiles: Seller | Seller[] | null;
};

type LetaoState = {
  status: 'loading' | 'signedOut' | 'ready';
  userId: string | null;
  username: string | null;
  trustScore: number;
  verified: boolean;
  balance: number;
  listings: Listing[];
  /** listing id -> ISO end time of its active promotion */
  promotedUntil: Record<string, string>;
  isRefreshing: boolean;
  init: () => void;
  refresh: () => Promise<void>;
  createListing: (input: NewListingInput) => Promise<boolean>;
  bump: (listingId: string) => Promise<BumpResult>;
  claimDaily: () => Promise<{ ok: boolean; balance: number }>;
  signOut: () => Promise<void>;
};

function toSeller(value: Seller | Seller[] | null): Seller | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * The bilt client is schema-agnostic, so query payloads are shaped here.
 * `T` is supplied explicitly by callers (there is nothing in `unknown` to
 * infer it from), and the underlying data is untyped API/DB output, so the
 * cast to `T` cannot be verified by the type checker.
 */
function asRows<T>(value: unknown): T[] {
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting untyped API rows to the caller-supplied shape
  return Array.isArray(value) ? (value as T[]) : [];
}

// eslint-disable-next-line typescript/no-unnecessary-type-parameters -- T is set explicitly by callers to shape untyped API rows; it can't be inferred from `unknown`
function asRow<T>(value: unknown): T | null {
  const first = Array.isArray(value) ? value[0] : value;
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- unavoidable: casting an untyped API row to the caller-supplied shape
  return (first ?? null) as T | null;
}

async function seedDemoListings(userId: string) {
  const rows = DEMO_LISTINGS.map((item) => ({
    seller_id: userId,
    title: item.title,
    description: item.description,
    price: item.price,
    condition_rating: item.condition,
    category: item.category,
    logistics: item.logistics,
    meetup_location: item.meetup,
    images: [demoImageUri(item.imageKey)],
    allow_negotiation: true,
  }));
  await bilt.from('listings').insert(rows);
}

/** Demo rows seeded before bundled photos existed still have images = null. */
async function backfillDemoImages(userId: string) {
  await Promise.all(
    DEMO_LISTINGS.map((item) =>
      bilt
        .from('listings')
        .update({ images: [demoImageUri(item.imageKey)] })
        .eq('seller_id', userId)
        .eq('title', item.title)
        .is('images', null),
    ),
  );
}

function sortListings(listings: Listing[], promotedUntil: Record<string, string>): Listing[] {
  return [...listings].sort((a, b) => {
    const aPromo = promotedUntil[a.id];
    const bPromo = promotedUntil[b.id];
    if (aPromo && !bPromo) return -1;
    if (!aPromo && bPromo) return 1;
    if (aPromo && bPromo) return bPromo.localeCompare(aPromo);
    return b.created_at.localeCompare(a.created_at);
  });
}

let subscribed = false;

export const useLetaoStore = create<LetaoState>((set, get) => {
  async function loadFeed() {
    const [listingsResult, promotionsResult] = await Promise.all([
      bilt
        .from('listings')
        .select(
          'id, seller_id, title, description, price, allow_negotiation, condition_rating, category, logistics, images, meetup_location, status, created_at, profiles(username, trust_score)',
        )
        .order('created_at', { ascending: false })
        .limit(200),
      bilt
        .from('promoted_listings')
        .select('listing_id, end_time')
        .gt('end_time', new Date().toISOString()),
    ]);

    const rows = asRows<ListingRow>(listingsResult.data);
    const promotions = asRows<{ listing_id: string; end_time: string }>(promotionsResult.data);

    const promotedUntil: Record<string, string> = {};
    for (const promotion of promotions) {
      const existing = promotedUntil[promotion.listing_id];
      if (!existing || existing < promotion.end_time) {
        promotedUntil[promotion.listing_id] = promotion.end_time;
      }
    }

    const listings: Listing[] = rows.map((row) => ({
      ...row,
      price: Number(row.price),
      seller: toSeller(row.profiles),
    }));

    return { listings: sortListings(listings, promotedUntil), promotedUntil };
  }

  async function loadProfile(userId: string) {
    const { data } = await bilt
      .from('profiles')
      .select('username, trust_score, verified_status')
      .eq('id', userId)
      .maybeSingle();
    const profile = data;
    if (!profile) return;
    set({
      username: profile.username,
      trustScore: profile.trust_score ?? 80,
      verified: profile.verified_status ?? false,
    });
  }

  async function applySession(userId: string | null) {
    if (!userId) {
      set({
        status: 'signedOut',
        userId: null,
        username: null,
        balance: 0,
        listings: [],
        promotedUntil: {},
      });
      return;
    }

    if (get().userId === userId && get().status === 'ready') return;

    set({ status: 'loading', userId });

    const { data } = await bilt.rpc('bootstrap_account', { p_username: '' });
    const account = asRow<BootstrapRow>(data);

    set({
      username: account?.username ?? null,
      balance: account?.balance ?? 0,
    });

    const mine = await bilt.from('listings').select('id').eq('seller_id', userId).limit(1);
    if ((mine.data ?? []).length === 0) {
      await seedDemoListings(userId);
    } else {
      await backfillDemoImages(userId);
    }

    await loadProfile(userId);
    const feed = await loadFeed();
    set({ ...feed, status: 'ready' });
  }

  return {
    status: 'loading',
    userId: null,
    username: null,
    trustScore: 80,
    verified: false,
    balance: 0,
    listings: [],
    promotedUntil: {},
    isRefreshing: false,

    init: () => {
      if (subscribed) return;
      subscribed = true;

      void (async () => {
        const { data } = await bilt.auth.getSession();
        await applySession(data.session?.user.id ?? null);
      })();

      bilt.auth.onAuthStateChange((_event, session) => {
        const userId = session?.user.id ?? null;
        setTimeout(() => {
          void applySession(userId);
        }, 0);
      });
    },

    refresh: async () => {
      if (!get().userId) return;
      set({ isRefreshing: true });
      const [feed, wallet] = await Promise.all([
        loadFeed(),
        bilt.from('user_wallets').select('ecocoin_balance').maybeSingle(),
      ]);
      const balanceRow = wallet.data;
      set({
        ...feed,
        balance: balanceRow?.ecocoin_balance ?? get().balance,
        isRefreshing: false,
      });
    },

    createListing: async (input) => {
      const userId = get().userId;
      if (!userId) return false;

      const { error } = await bilt.from('listings').insert({
        seller_id: userId,
        title: input.title,
        description: input.description || null,
        price: input.price,
        condition_rating: input.condition,
        category: input.category,
        logistics: input.logistics,
        meetup_location: input.meetupLocation || null,
        images: input.imageUrl ? [input.imageUrl] : null,
        allow_negotiation: true,
      });
      if (error) return false;

      await get().refresh();
      return true;
    },

    bump: async (listingId) => {
      const { data, error } = await bilt.rpc('bump_listing', {
        p_listing_id: listingId,
        p_promotion_type: 'bump',
      });

      if (error) return { ok: false, reason: 'error', balance: get().balance };

      const row = asRow<BumpRow>(data);
      const balance = row?.balance ?? get().balance;

      if (!row?.ok || !row.ends_at) {
        set({ balance });
        if (get().promotedUntil[listingId]) {
          return { ok: false, reason: 'active', balance };
        }
        return { ok: false, reason: balance < BUMP_COST ? 'insufficient' : 'error', balance };
      }

      const promotedUntil = { ...get().promotedUntil, [listingId]: row.ends_at };
      set({
        balance,
        promotedUntil,
        listings: sortListings(get().listings, promotedUntil),
      });
      return { ok: true, endsAt: row.ends_at, balance };
    },

    claimDaily: async () => {
      const { data, error } = await bilt.rpc('claim_daily_ecocoins');
      if (error) return { ok: false, balance: get().balance };
      const row = asRow<ClaimRow>(data);
      const balance = row?.balance ?? get().balance;
      set({ balance });
      return { ok: row?.ok ?? false, balance };
    },

    signOut: async () => {
      await bilt.auth.signOut();
      set({
        status: 'signedOut',
        userId: null,
        username: null,
        balance: 0,
        listings: [],
        promotedUntil: {},
      });
    },
  };
});
