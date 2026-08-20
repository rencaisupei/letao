import { Image, View } from 'react-native';

import brandLogo from '@/assets/brand-logo.jpg';
import { NotificationBell } from '@/components/NotificationBell';

/**
 * 易拍通 logo lockup (YP mark + 易拍通 + 易拍即通 · 成交輕鬆).
 * The artwork already contains the wordmark and slogan, so screens using it
 * should not repeat that text next to it.
 */
export function BrandMark({ size = 96 }: { size?: number }) {
  return (
    <Image
      source={brandLogo}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="易拍通 YI PAI TONG，易拍即通 · 成交輕鬆"
    />
  );
}

/** 易拍通 brand bar used as the custom header for every tab. */
export function BrandHeader() {
  return (
    <View className="bg-background pt-safe border-b border-neutral-200">
      <View className="flex-row items-center justify-between px-4 pt-1.5 pb-2">
        <BrandMark size={92} />
        <NotificationBell />
      </View>
    </View>
  );
}
