import type { ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Leaf, Package, Tag, Truck } from 'lucide-react-native';

import { BumpedBadge } from '@/components/BumpedBadge';
import { ConditionBadge } from '@/components/ConditionBadge';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ListingStatusBadge } from '@/components/ListingStatusBadge';
import { ModerationBadge } from '@/components/ModerationBadge';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { Text } from '@/components/ui/primitives/Text';
import { MINT, SAGE, shippingSummary, stockLabel } from '@/lib/constants';
import { resolveListingImage } from '@/lib/demoImages';
import type { Listing } from '@/lib/store';
import { cn } from '@/lib/utils';

type ListingCardProps = {
  listing: Listing;
  width: number;
  isPromoted?: boolean;
  onPress?: () => void;
  footer?: ReactNode;
  /** Set false when the card sits inside the BumpFx glow border. */
  bordered?: boolean;
  showFavorite?: boolean;
  showModeration?: boolean;
};

/** Icon + one line of meta, so every card row shares the same baseline. */
function MetaRow({
  icon,
  label,
  tone = 'muted',
}: {
  icon: ReactNode;
  label: string;
  tone?: 'muted' | 'sage';
}) {
  return (
    <View className="mt-1 flex-row items-center gap-1">
      {icon}
      <Text
        numberOfLines={1}
        className={cn(
          'text-2xs flex-1 font-medium',
          tone === 'sage' ? 'text-sage-deep' : 'text-muted',
        )}
      >
        {label}
      </Text>
    </View>
  );
}

export function ListingCard({
  listing,
  width,
  isPromoted = false,
  onPress,
  footer,
  bordered = true,
  showFavorite = true,
  showModeration = false,
}: ListingCardProps) {
  const imageSource = resolveListingImage(listing.images?.[0]);
  const imageHeight = Math.round(width * 1.1);
  const stock = stockLabel(listing.quantity, listing.sold_quantity);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ width }}
      className={cn(
        'bg-background overflow-hidden rounded-2xl',
        bordered ? 'border border-neutral-200' : '',
      )}
    >
      <View style={{ width, height: imageHeight }} className="relative bg-neutral-100">
        {imageSource ? (
          <Image source={imageSource} style={{ width, height: imageHeight }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[MINT, '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width, height: imageHeight }}
            className="items-center justify-center"
          >
            <Leaf size={30} color={SAGE} strokeWidth={1.6} />
            <Text className="text-sage-deep text-2xs mt-2 font-semibold">
              {listing.category ?? '易拍通好物'}
            </Text>
          </LinearGradient>
        )}

        <ConditionBadge code={listing.condition_rating} className="absolute top-2 left-2" />
        {listing.status === 'available' ? null : (
          <ListingStatusBadge status={listing.status} className="absolute top-11 left-2" />
        )}

        {isPromoted ? <BumpedBadge className="absolute top-2 right-2" /> : null}
        {!isPromoted && showFavorite ? (
          <FavoriteButton listingId={listing.id} className="absolute top-1.5 right-1.5" />
        ) : null}

        {(listing.images?.length ?? 0) > 1 ? (
          <View className="absolute right-2 bottom-2 rounded-md bg-black/50 px-1.5 py-0.5">
            <Text className="text-2xs font-bold text-white">{listing.images?.length} 張</Text>
          </View>
        ) : null}
      </View>

      <View className="p-3">
        {showModeration ? (
          <ModerationBadge status={listing.moderation_status} className="mb-2 self-start" />
        ) : null}

        <Text numberOfLines={1} className="text-foreground text-sm font-medium">
          {listing.title}
        </Text>
        <Text className="text-foreground mt-1 text-base font-bold">
          NT$ {listing.price.toLocaleString('en-US')}
        </Text>
        {stock ? (
          <View className="bg-mint mt-1.5 flex-row items-center gap-1 self-start rounded px-1.5 py-0.5">
            <Package size={11} color={SAGE} strokeWidth={2.4} />
            <Text className="text-sage-deep text-2xs font-bold">{stock}</Text>
          </View>
        ) : null}

        <MetaRow
          icon={<Tag size={11} color="#9CA3AF" strokeWidth={2.2} />}
          label={listing.category ?? '未分類'}
        />
        <MetaRow
          icon={<Truck size={11} color={SAGE} strokeWidth={2.2} />}
          label={shippingSummary(listing.shipping_options)}
          tone="sage"
        />

        <View className="mt-2 flex-row items-center justify-between gap-2 border-t border-neutral-100 pt-2">
          <Text numberOfLines={1} className="text-muted text-2xs flex-1">
            {listing.meetup_location ?? '台灣本島'}
          </Text>
          <Text className="text-sage-deep text-2xs font-semibold">
            信任度 {listing.seller?.trust_score ?? 80}%
          </Text>
        </View>

        {footer ? <View className="mt-3">{footer}</View> : null}
      </View>
    </Pressable>
  );
}
