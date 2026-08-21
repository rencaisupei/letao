import { View } from 'react-native';

import { Store } from 'lucide-react-native';

import { Text } from '@/components/ui/primitives/Text';
import { SAGE } from '@/lib/constants';
import { type EcpaySubType, subTypeInfo } from '@/lib/ecpay';

/** 取貨門市摘要，選店畫面與交易詳情共用。 */
export type CvsStoreSummaryProps = {
  subType: EcpaySubType;
  storeId: string;
  storeName: string | null;
  storeAddress: string | null;
  storeTelephone: string | null;
  isOutlying: boolean;
};

export function CvsStoreSummary({
  subType,
  storeId,
  storeName,
  storeAddress,
  storeTelephone,
  isOutlying,
}: CvsStoreSummaryProps) {
  return (
    <View className="bg-mint rounded-xl p-4">
      <View className="flex-row items-center gap-1.5">
        <Store size={14} color={SAGE} strokeWidth={2.2} />
        <Text className="text-sage-deep text-xs font-bold">{subTypeInfo(subType).label}</Text>
      </View>
      <Text className="text-foreground mt-2 text-sm font-semibold">
        {storeName ?? '取貨門市'}（店號 {storeId}）
      </Text>
      {storeAddress === null ? null : (
        <Text className="text-sage-deep text-2xs mt-1 leading-4">{storeAddress}</Text>
      )}
      {storeTelephone === null ? null : (
        <Text className="text-sage-deep text-2xs mt-0.5 leading-4">電話 {storeTelephone}</Text>
      )}
      {isOutlying ? (
        <Text className="text-2xs mt-1 leading-4 text-orange-700">
          離島門市，配送時間會比本島久幾天。
        </Text>
      ) : null}
    </View>
  );
}
