import { create } from 'zustand';

import { bilt } from '@/lib/bilt';
import { useChatStore } from '@/lib/chatStore';
import {
  BUMP_COST,
  DEMO_LISTINGS,
  type ConditionCode,
  type ListingStatus,
  type ModerationStatus,
  type UserRole,
} from '@/lib/constants';
import { demoImageUri } from '@/lib/demoImages';
import { useNotificationStore } from '@/lib/notificationStore';
import { useOrderStore } from '@/lib/orderStore';

export type Seller = {
  username: string | null;
  trust_score: number | null;
  verified_status?: boolean | null;
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
  status: ListingStatus;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
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
  images: string[];
};

export type ProfileEdit = {
  username: string;
  role: UserRole;
  bio: string;
  avatarUrl: string | null;
};

export type PublishResult =
  | { ok: true; status: ModerationStatus; reason: string | null }
  | { ok: false };

export type BumpResult =
  | { ok: true; endsAt: string; balance: number }
  | { ok: false; reason: 'insufficient' | 'active' | 'error'; balance: number };

type AccountRow = {
  username: string | null;
  role: UserRole | null;
  is_admin: boolean | null;
  trust_score: number | null;
  verified_status: boolean | null;
  avatar_url: string | null;
  bio: string | null;
};
type WalletRow = {
  ecocoin_balance: number | null;
  last_claim_at: string | null;
  claim_streak: number | null;
};
type BumpRow = {
  ok: boolean;
  balance: number | null;
  promotion_id: string | null;
  ends_at: string | null;
};
type ClaimRow = {
  ok: boolean;
  balance: number | null;
  amount: number | null;
  streak: number | null;
  next_claim_at: string | null;
};
type OkRow = { ok: boolean };

type ListingRow = Omit<Listing, 'seller' | 'price'> & {
  price: number | string;
  profiles: Seller | Seller[] | null;
};

const LISTING_COLUMNS =
  'id, seller_id, title, description, price, allow_negotiation, condition_rating, category, logistics, images, meetup_location, status, moderation_status, moderation_reason, created_at, profiles(username, trust_score, verified_status)';

export type ClaimResult = {
  ok: boolean;
  balance: number;
  amount: number;
  streak: number;
  nextClaimAt: string | null;
};

type LetaoState = {
  status: 'loading' | 'guest' | 'ready';
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  isAdmin: boolean;
  trustScore: number;
  verified: boolean;
  balance: number;
  lastClaimAt: string | null;
  claimStreak: number;
  listings: Listing[];
  /** listing id -> ISO end time of its active promotion */
  promotedUntil: Record<string, string>;
  /** listing id -> true when the signed-in user saved it */
  favorites: Record<string, true>;
  isRefreshing: boolean;
  init: () => void;
  refresh: () => Promise<void>;
  setPendingRole: (role: UserRole) => void;
  createListing: (input: NewListingInput) => Promise<PublishResult>;
  updateProfile: (input: ProfileEdit) => Promise<boolean>;
  setListingStatus: (listingId: string, status: ListingStatus) => Promise<boolean>;
  deleteListing: (listingId: string) => Promise<boolean>;
  bump: (listingId: string) => Promise<BumpResult>;
  claimDaily: () => Promise<ClaimResult>;
  toggleFavorite: (listingId: string) => Promise<boolean>;
  reportListing: (listingId: string, reason: string, detail: string) => Promise<boolean>;
  claimAdminCode: (code: string) => Promise<boolean>;
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
    moderation_status: 'approved',
    moderation_source: 'seed',
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

export function toListing(row: ListingRow): Listing {
  return {
    ...row,
    price: Number(row.price),
    seller: toSeller(row.profiles),
  };
}

let subscribed = false;
let pendingRole: UserRole | null = null;

export const useLetaoStore = create<LetaoState>((set, get) => {
  async function loadFeed() {
    const [listingsResult, promotionsResult] = await Promise.all([
      bilt
        .from('listings')
        .select(LISTING_COLUMNS)
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

    const listings = rows.map(toListing);
    return { listings: sortListings(listings, promotedUntil), promotedUntil };
  }

  async function loadFavorites(userId: string) {
    const { data } = await bilt.from('favorites').select('listing_id').eq('user_id', userId);
    const favorites: Record<string, true> = {};
    for (const row of asRows<{ listing_id: string }>(data)) {
      favorites[row.listing_id] = true;
    }
    return favorites;
  }

  async function loadAccount(userId: string) {
    const [profileResult, walletResult] = await Promise.all([
      bilt
        .from('profiles')
        .select('username, role, is_admin, trust_score, verified_status, avatar_url, bio')
        .eq('id', userId)
        .maybeSingle(),
      bilt
        .from('user_wallets')
        .select('ecocoin_balance, last_claim_at, claim_streak')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const account = asRow<AccountRow>(profileResult.data);
    const wallet = asRow<WalletRow>(walletResult.data);

    return {
      username: account?.username ?? null,
      avatarUrl: account?.avatar_url ?? null,
      bio: account?.bio ?? null,
      role: account?.role ?? 'both',
      isAdmin: account?.is_admin ?? false,
      trustScore: account?.trust_score ?? 80,
      verified: account?.verified_status ?? false,
      balance: wallet?.ecocoin_balance ?? 0,
      lastClaimAt: wallet?.last_claim_at ?? null,
      claimStreak: wallet?.claim_streak ?? 0,
    };
  }

  async function applySession(userId: string | null) {
    if (!userId) {
      const feed = await loadFeed();
      set({
        status: 'guest',
        userId: null,
        username: null,
        avatarUrl: null,
        bio: null,
        role: 'both',
        isAdmin: false,
        trustScore: 80,
        verified: false,
        balance: 0,
        lastClaimAt: null,
        claimStreak: 0,
        favorites: {},
        ...feed,
      });
      return;
    }

    if (get().userId === userId && get().status === 'ready') return;

    set({ status: 'loading', userId });

    const roleForBootstrap = pendingRole ?? '';
    pendingRole = null;

    await bilt.rpc('ensure_account', {
      p_username: '',
      p_role: roleForBootstrap,
    });

    set(await loadAccount(userId));

    const mine = await bilt.from('listings').select('id').eq('seller_id', userId).limit(1);
    if ((mine.data ?? []).length === 0) {
      await seedDemoListings(userId);
    } else {
      await backfillDemoImages(userId);
    }

    const [feed, favorites] = await Promise.all([loadFeed(), loadFavorites(userId)]);
    set({ ...feed, favorites, status: 'ready' });
  }

  return {
    status: 'loading',
    userId: null,
    username: null,
    avatarUrl: null,
    bio: null,
    role: 'both',
    isAdmin: false,
    trustScore: 80,
    verified: false,
    balance: 0,
    lastClaimAt: null,
    claimStreak: 0,
    listings: [],
    promotedUntil: {},
    favorites: {},
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
      set({ isRefreshing: true });
      const userId = get().userId;

      if (!userId) {
        const feed = await loadFeed();
        set({ ...feed, isRefreshing: false });
        return;
      }

      const [feed, favorites, account] = await Promise.all([
        loadFeed(),
        loadFavorites(userId),
        loadAccount(userId),
      ]);
      set({
        ...feed,
        ...account,
        favorites,
        isRefreshing: false,
      });
    },

    setPendingRole: (role) => {
      pendingRole = role;
    },

    createListing: async (input) => {
      const userId = get().userId;
      if (!userId) return { ok: false };

      const { data, error } = await bilt
        .from('listings')
        .insert({
          seller_id: userId,
          title: input.title,
          description: input.description || null,
          price: input.price,
          condition_rating: input.condition,
          category: input.category,
          logistics: input.logistics,
          meetup_location: input.meetupLocation || null,
          images: input.images.length > 0 ? input.images : null,
          allow_negotiation: true,
        })
        .select('id')
        .maybeSingle();

      if (error || !data?.id) return { ok: false };

      const moderation = await bilt.functions.invoke('moderate-listing', {
        body: { listing_id: data.id },
      });

      await get().refresh();

      const verdict = moderation.data;
      if (moderation.error || !verdict) {
        return { ok: true, status: 'pending', reason: null };
      }
      return {
        ok: true,
        status: verdict.status ?? 'pending',
        reason: verdict.reason ?? null,
      };
    },

    updateProfile: async (input) => {
      const userId = get().userId;
      if (!userId) return false;

      const username = input.username.trim();
      if (username === '') return false;

      const { error } = await bilt
        .from('profiles')
        .update({
          username,
          role: input.role,
          bio: input.bio.trim() === '' ? null : input.bio.trim(),
          avatar_url: input.avatarUrl,
        })
        .eq('id', userId);

      if (error) return false;

      set({
        username,
        role: input.role,
        bio: input.bio.trim() === '' ? null : input.bio.trim(),
        avatarUrl: input.avatarUrl,
      });
      await get().refresh();
      return true;
    },

    setListingStatus: async (listingId, status) => {
      const userId = get().userId;
      if (!userId) return false;

      const { error } = await bilt
        .from('listings')
        .update({ status })
        .eq('id', listingId)
        .eq('seller_id', userId);

      if (error) return false;

      set({
        listings: get().listings.map((listing) =>
          listing.id === listingId ? { ...listing, status } : listing,
        ),
      });
      return true;
    },

    deleteListing: async (listingId) => {
      const userId = get().userId;
      if (!userId) return false;

      const { error } = await bilt
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('seller_id', userId);

      if (error) return false;

      const promotedUntil = { ...get().promotedUntil };
      delete promotedUntil[listingId];
      set({
        listings: get().listings.filter((listing) => listing.id !== listingId),
        promotedUntil,
      });
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
      const failure: ClaimResult = {
        ok: false,
        balance: get().balance,
        amount: 0,
        streak: get().claimStreak,
        nextClaimAt: null,
      };

      const { data, error } = await bilt.rpc('claim_daily_reward');
      if (error) return failure;

      const row = asRow<ClaimRow>(data);
      if (!row) return failure;

      const balance = row.balance ?? get().balance;
      const streak = row.streak ?? get().claimStreak;

      set({
        balance,
        claimStreak: streak,
        lastClaimAt: row.ok ? new Date().toISOString() : get().lastClaimAt,
      });

      return {
        ok: row.ok,
        balance,
        amount: row.amount ?? 0,
        streak,
        nextClaimAt: row.next_claim_at ?? null,
      };
    },

    toggleFavorite: async (listingId) => {
      const userId = get().userId;
      if (!userId) return false;

      const isSaved = get().favorites[listingId];
      const next = { ...get().favorites };
      if (isSaved) {
        delete next[listingId];
      } else {
        next[listingId] = true;
      }
      set({ favorites: next });

      const { error } = isSaved
        ? await bilt.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId)
        : await bilt.from('favorites').insert({ user_id: userId, listing_id: listingId });

      if (error) {
        const reverted = { ...get().favorites };
        if (isSaved) {
          reverted[listingId] = true;
        } else {
          delete reverted[listingId];
        }
        set({ favorites: reverted });
        return false;
      }
      return true;
    },

    reportListing: async (listingId, reason, detail) => {
      const userId = get().userId;
      if (!userId) return false;
      const { error } = await bilt.from('reports').upsert(
        {
          listing_id: listingId,
          reporter_id: userId,
          reason,
          detail: detail.trim() === '' ? null : detail.trim(),
          status: 'open',
        },
        { onConflict: 'listing_id,reporter_id' },
      );
      return !error;
    },

    claimAdminCode: async (code) => {
      const { data, error } = await bilt.rpc('claim_admin', { p_code: code });
      if (error) return false;
      const row = asRow<OkRow>(data);
      if (!row?.ok) return false;
      set({ isAdmin: true });
      return true;
    },

    signOut: async () => {
      await bilt.auth.signOut();
      useChatStore.getState().reset();
      useOrderStore.getState().reset();
      useNotificationStore.getState().reset();
      const feed = await loadFeed();
      set({
        status: 'guest',
        userId: null,
        username: null,
        avatarUrl: null,
        bio: null,
        role: 'both',
        isAdmin: false,
        trustScore: 80,
        verified: false,
        balance: 0,
        lastClaimAt: null,
        claimStreak: 0,
        favorites: {},
        ...feed,
      });
    },
  };
});
