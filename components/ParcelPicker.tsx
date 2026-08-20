import { View } from 'react-native';

import { Text, TextInput } from '@/components/ui/primitives/Text';
import { Package, Ruler } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import { type ParcelDraft, parcelGirth, parseParcelDraft } from '@/lib/shipping';

type ParcelPickerProps = {
  value: ParcelDraft;
  isDisabled?: boolean;
  onChange: (value: ParcelDraft) => void;
};

/** Package weight and dimensions — the carrier rate engine's inputs. */
export function ParcelPicker({ value, isDisabled = false, onChange }: ParcelPickerProps) {
  const parsed = parseParcelDraft(value);
  const girth = parsed.ok ? parcelGirth(parsed.parcel) : null;

  return (
    <View className="bg-background rounded-xl border border-neutral-200 p-3.5">
      <View className="flex-row items-center gap-1.5">
        <Package size={14} color={SAGE} strokeWidth={2.2} />
        <Text className="text-foreground text-xs font-bold">包裝完成後的重量與尺寸</Text>
      </View>

      <View className="mt-2.5 flex-row items-center gap-2">
        <Text className="text-muted w-14 text-xs font-semibold">重量</Text>
        <TextInput
          value={value.weight}
          onChangeText={(text) => onChange({ ...value, weight: text })}
          editable={!isDisabled}
          keyboardType="decimal-pad"
          placeholder="1.2"
          placeholderTextColorClassName="accent-neutral-400"
          accessibilityLabel="包裝重量（公斤）"
          className="bg-canvas text-foreground h-10 w-24 rounded-lg border border-neutral-200 px-3 text-sm font-semibold"
        />
        <Text className="text-muted text-xs">公斤（含包材）</Text>
      </View>

      <View className="mt-2 flex-row items-center gap-1.5">
        <Text className="text-muted w-14 text-xs font-semibold">長寬高</Text>
        <TextInput
          value={value.length}
          onChangeText={(text) => onChange({ ...value, length: text })}
          editable={!isDisabled}
          keyboardType="decimal-pad"
          placeholder="長"
          placeholderTextColorClassName="accent-neutral-400"
          accessibilityLabel="包裝長度（公分）"
          className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-2 text-center text-sm font-semibold"
        />
        <Text className="text-muted text-xs">×</Text>
        <TextInput
          value={value.width}
          onChangeText={(text) => onChange({ ...value, width: text })}
          editable={!isDisabled}
          keyboardType="decimal-pad"
          placeholder="寬"
          placeholderTextColorClassName="accent-neutral-400"
          accessibilityLabel="包裝寬度（公分）"
          className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-2 text-center text-sm font-semibold"
        />
        <Text className="text-muted text-xs">×</Text>
        <TextInput
          value={value.height}
          onChangeText={(text) => onChange({ ...value, height: text })}
          editable={!isDisabled}
          keyboardType="decimal-pad"
          placeholder="高"
          placeholderTextColorClassName="accent-neutral-400"
          accessibilityLabel="包裝高度（公分）"
          className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-2 text-center text-sm font-semibold"
        />
        <Text className="text-muted text-xs">cm</Text>
      </View>

      <View className="mt-2 flex-row items-start gap-1.5">
        <Ruler size={12} color={SAGE} strokeWidth={2.2} />
        <Text className="text-muted text-2xs flex-1 leading-4">
          {parsed.ok
            ? girth === null
              ? '填好重量與長寬高，系統就會依各家物流的費率級距自動算出運費；留空則需自訂金額。'
              : `材積（長＋寬＋高）＝ ${girth} cm。超商店到店上限 105cm / 5kg，宅配上限 150cm / 20kg。`
            : parsed.message}
        </Text>
      </View>
    </View>
  );
}
