import { Text, View } from 'react-native';

/** Letao brand bar used as the custom header for every tab. */
export function BrandHeader() {
  return (
    <View className="bg-background pt-safe border-b border-neutral-200">
      <View className="items-center py-3">
        <Text className="text-foreground text-[21px] font-bold tracking-wide">樂淘拍賣 Letao</Text>
        <Text className="text-sage-deep mt-1 text-[11px] font-semibold tracking-[3px]">
          新 歡 舊 愛 ∙ 皆 可 樂 淘
        </Text>
      </View>
    </View>
  );
}
