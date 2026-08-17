import { Text, View } from 'react-native';

import { LISTING_STATUS_META, getListingStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

type ListingStatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

/** 上架中 / 已預訂 / 已售出 / 已下架 pill. */
export function ListingStatusBadge({ status, className }: ListingStatusBadgeProps) {
  const meta = LISTING_STATUS_META[getListingStatus(status)];

  return (
    <View className={cn('rounded-md px-1.5 py-0.5', meta.bgClass, className)}>
      <Text className={cn('text-[9px] font-bold', meta.textClass)}>{meta.label}</Text>
    </View>
  );
}
