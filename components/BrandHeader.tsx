import { Text, View } from 'react-native';

import { NotificationBell } from '@/components/NotificationBell';

/** Letao brand bar used as the custom header for every tab. */
export function BrandHeader() {
  return (
    <View className="bg-background pt-safe border-b border-neutral-200">
      <View className="flex-row items-center px-2 py-3">
        <View className="w-20" />

        <View className="flex-1 items-center">
          <Text className="text-foreground text-[19px] font-bold tracking-wide">
            樂淘拍賣 Letao
          </Text>
          <Text className="text-sage-deep mt-1 text-[10px] font-semibold tracking-[3px]">
            新 歡 舊 愛 ∙ 皆 可 樂 淘
          </Text>
        </View>

        <View className="w-20 flex-row items-center justify-end">
          <NotificationBell />
        </View>
      </View>
    </View>
  );
}
