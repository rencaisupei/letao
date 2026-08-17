import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import { X } from 'lucide-react-native';

import { SelectChip } from '@/components/SelectChip';
import {
  ALL_CATEGORY,
  CATEGORIES,
  CONDITIONS,
  LOGISTICS_OPTIONS,
  PRICE_RANGES,
} from '@/lib/constants';
import { DEFAULT_FILTERS, type ListingFilters, activeFilterCount } from '@/lib/filters';
import { TAIWAN_REGIONS } from '@/lib/regions';

type FilterSheetProps = {
  visible: boolean;
  filters: ListingFilters;
  resultCount: number;
  onChange: (filters: ListingFilters) => void;
  onClose: () => void;
};

/** Bottom sheet with the explore filters: 分類 / 商況 / 物流 / 價格 / 地區. */
export function FilterSheet({
  visible,
  filters,
  resultCount,
  onChange,
  onClose,
}: FilterSheetProps) {
  const toggleCondition = (code: (typeof CONDITIONS)[number]['code']) => {
    const next = filters.conditions.includes(code)
      ? filters.conditions.filter((item) => item !== code)
      : [...filters.conditions, code];
    onChange({ ...filters, conditions: next });
  };

  const toggleLogistics = (option: string) => {
    const next = filters.logistics.includes(option)
      ? filters.logistics.filter((item) => item !== option)
      : [...filters.logistics, option];
    onChange({ ...filters, logistics: next });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-background max-h-[86%] rounded-t-3xl">
          <View className="flex-row items-center justify-between border-b border-neutral-100 px-4 py-3.5">
            <Text className="text-foreground text-[15px] font-bold">篩選條件</Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => onChange({ ...DEFAULT_FILTERS, query: filters.query })}
              >
                <Text className="text-sage-deep text-[12px] font-semibold">全部清除</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="關閉"
                onPress={onClose}
                className="h-8 w-8 items-center justify-center"
              >
                <X size={18} color="#9CA3AF" strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-foreground text-[13px] font-semibold">商品類別</Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {[ALL_CATEGORY, ...CATEGORIES].map((item) => (
                <SelectChip
                  key={item}
                  size="sm"
                  label={item}
                  isSelected={filters.category === item}
                  onPress={() => onChange({ ...filters, category: item })}
                  className="rounded-md"
                />
              ))}
            </View>

            <Text className="text-foreground mt-5 text-[13px] font-semibold">
              商品狀況（可多選）
            </Text>
            <View className="mt-2 gap-1.5">
              {CONDITIONS.map((item) => (
                <SelectChip
                  key={item.code}
                  label={`${item.label} ｜ 最低出價 ${Math.round(item.minRatio * 100)}%`}
                  isSelected={filters.conditions.includes(item.code)}
                  onPress={() => toggleCondition(item.code)}
                  className="h-10 w-full items-start justify-center rounded-xl px-4"
                />
              ))}
            </View>

            <Text className="text-foreground mt-5 text-[13px] font-semibold">
              運送方式（可多選，賣家有提供即符合）
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {LOGISTICS_OPTIONS.map((item) => (
                <SelectChip
                  key={item}
                  size="sm"
                  label={item}
                  isSelected={filters.logistics.includes(item)}
                  onPress={() => toggleLogistics(item)}
                  className="rounded-lg"
                />
              ))}
            </View>

            <Text className="text-foreground mt-5 text-[13px] font-semibold">價格區間</Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {PRICE_RANGES.map((range) => (
                <SelectChip
                  key={range.code}
                  size="sm"
                  label={range.label}
                  isSelected={filters.priceCode === range.code}
                  onPress={() => onChange({ ...filters, priceCode: range.code })}
                  className="rounded-lg"
                />
              ))}
            </View>

            <Text className="text-foreground mt-5 text-[13px] font-semibold">所在地區</Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <SelectChip
                size="sm"
                label="不限"
                isSelected={filters.region === null}
                onPress={() => onChange({ ...filters, region: null })}
                className="rounded-md"
              />
              {TAIWAN_REGIONS.map((region) => (
                <SelectChip
                  key={region}
                  size="sm"
                  label={region}
                  isSelected={filters.region === region}
                  onPress={() => onChange({ ...filters, region })}
                  className="rounded-md"
                />
              ))}
            </View>
          </ScrollView>

          <View className="bg-background pb-safe-offset-3 border-t border-neutral-100 px-4 pt-3">
            <Button onPress={onClose}>
              <Button.Label>
                套用 {activeFilterCount(filters)} 項條件 ∙ {resultCount} 件符合
              </Button.Label>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
