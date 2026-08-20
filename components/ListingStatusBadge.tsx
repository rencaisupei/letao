import { View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { LISTING_STATUS_META, getListingStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

type ListingStatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

/**
 * 上架中 / 已預訂 / 已售出 / 已下架 pill.
 *
 * Shares one badge geometry with ConditionBadge, ModerationBadge and
 * BumpedBadge (rounded-md px-2 py-1 text-2xs) so stacked overlays on a card
 * line up instead of each sitting a pixel or two off.
 */
export function ListingStatusBadge({ status, className }: ListingStatusBadgeProps) {
  const meta = LISTING_STATUS_META[getListingStatus(status)];

  return (
    <View className={cn('rounded-md px-2 py-1', meta.bgClass, className)}>
      <Text className={cn('text-2xs font-bold', meta.textClass)}>{meta.label}</Text>
    </View>
  );
}
