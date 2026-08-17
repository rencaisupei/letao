import { Text, TextInput, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { SelectChip } from '@/components/SelectChip';
import { SAGE } from '@/lib/constants';
import { TAIWAN_REGIONS } from '@/lib/regions';

export type MeetupValue = {
  region: string | null;
  detail: string;
};

type MeetupPickerProps = {
  value: MeetupValue;
  /** 面交商品需要寫清楚碰面地點，宅配只需要地區。 */
  requiresDetail: boolean;
  isDisabled?: boolean;
  onChange: (value: MeetupValue) => void;
};

/** Builds "台北 ∙ 信義區" from the picked region and the typed detail. */
export function composeMeetupLocation(value: MeetupValue): string {
  const detail = value.detail.trim();
  if (value.region && detail !== '') return `${value.region} ∙ ${detail}`;
  if (value.region) return value.region;
  return detail;
}

export function MeetupPicker({
  value,
  requiresDetail,
  isDisabled = false,
  onChange,
}: MeetupPickerProps) {
  return (
    <View>
      <View className="flex-row flex-wrap gap-1.5">
        {TAIWAN_REGIONS.map((name) => (
          <SelectChip
            key={name}
            size="sm"
            label={name}
            isSelected={value.region === name}
            onPress={() => {
              if (isDisabled) return;
              onChange({ ...value, region: name });
            }}
            className="rounded-md"
          />
        ))}
      </View>

      <TextInput
        value={value.detail}
        onChangeText={(text) => onChange({ ...value, detail: text })}
        editable={!isDisabled}
        placeholder="行政區或地標，例如：信義區 ∙ 市政府站"
        placeholderTextColorClassName="accent-neutral-400"
        className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
      />

      <View className="mt-1.5 flex-row items-start gap-1.5">
        <MapPin size={12} color={SAGE} strokeWidth={2.2} />
        <Text className="text-muted flex-1 text-[11px] leading-4">
          {requiresDetail
            ? '面交請寫得具體一點，例如「信義區 ∙ 市政府站 2 號出口」；這裡選的縣市同時是寄件出貨地。'
            : '選擇縣市可以讓買家用地區篩選找到你的商品，也用來計算離島／偏遠的運費加價。'}
        </Text>
      </View>
    </View>
  );
}
