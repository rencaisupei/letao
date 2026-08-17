import { Text, TextInput, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import MapView from '@/components/MapView';
import type { LatLng } from '@/components/MapView.types';
import { SelectChip } from '@/components/SelectChip';
import { SAGE } from '@/lib/constants';
import { CITY_REGION_VIEW, TAIWAN_REGIONS, regionByName } from '@/lib/geo';

export type MeetupValue = {
  region: string | null;
  detail: string;
  coords: LatLng | null;
};

type MeetupPickerProps = {
  value: MeetupValue;
  /** Show the map so the seller can drop an exact meetup pin. */
  showMap: boolean;
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

export function MeetupPicker({ value, showMap, isDisabled = false, onChange }: MeetupPickerProps) {
  const region = regionByName(value.region);
  const pin =
    value.coords ?? (region ? { latitude: region.latitude, longitude: region.longitude } : null);

  return (
    <View>
      <View className="flex-row flex-wrap gap-1.5">
        {TAIWAN_REGIONS.map((item) => (
          <SelectChip
            key={item.name}
            size="sm"
            label={item.name}
            isSelected={value.region === item.name}
            onPress={() => {
              if (isDisabled) return;
              onChange({
                ...value,
                region: item.name,
                coords: { latitude: item.latitude, longitude: item.longitude },
              });
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

      {showMap ? (
        <View className="mt-2">
          <View className="overflow-hidden rounded-xl border border-neutral-200">
            <MapView
              key={value.region ?? 'none'}
              style={{ height: 190 }}
              initialRegion={
                pin
                  ? { ...pin, ...CITY_REGION_VIEW }
                  : { latitude: 23.75, longitude: 120.95, latitudeDelta: 3.6, longitudeDelta: 3.6 }
              }
              markers={
                pin
                  ? [
                      {
                        id: 'meetup',
                        coordinate: pin,
                        title: '面交地點',
                        description: value.detail.trim() === '' ? undefined : value.detail.trim(),
                        color: SAGE,
                      },
                    ]
                  : []
              }
              onPress={(event) => {
                if (isDisabled) return;
                onChange({ ...value, coords: event.coordinate });
              }}
            />
          </View>
          <View className="mt-1.5 flex-row items-start gap-1.5">
            <MapPin size={12} color={SAGE} strokeWidth={2.2} />
            <Text className="text-muted flex-1 text-[11px] leading-4">
              {pin
                ? '在地圖上點一下可以微調面交地點，買家會看到同一個標記。'
                : '先選擇地區，就會在地圖上放上可調整的面交標記。'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
