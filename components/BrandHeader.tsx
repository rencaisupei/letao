import { Image, Text, View } from 'react-native';

import brandEmblem from '@/assets/brand-emblem.png';
import { NotificationBell } from '@/components/NotificationBell';

const BRAND_LABEL = '易拍通 YI PAI TONG，易拍即通 · 成交輕鬆';

/**
 * Circular gold phoenix emblem. Artwork carries no wording, so screens are
 * expected to pair it with the wordmark below (see BrandLockup).
 */
export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={brandEmblem}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="contain"
      accessibilityLabel={BRAND_LABEL}
    />
  );
}

/** 易拍通 + YI PAI TONG + slogan, stacked. */
export function BrandWordmark({ align = 'left' }: { align?: 'left' | 'center' }) {
  const centered = align === 'center';
  return (
    <View className={centered ? 'items-center' : 'items-start'}>
      <View className="flex-row items-baseline gap-1.5">
        <Text
          className="text-foreground text-[20px] font-extrabold"
          style={{ letterSpacing: 1 }}
          allowFontScaling={false}
        >
          易拍通
        </Text>
        <Text
          className="text-[11px] font-bold text-neutral-400"
          style={{ letterSpacing: 0.5 }}
          allowFontScaling={false}
        >
          YI PAI TONG
        </Text>
      </View>
      <Text
        className="mt-0.5 text-[11px] font-medium text-neutral-500"
        style={{ letterSpacing: 2 }}
        allowFontScaling={false}
      >
        易拍即通 · 成交輕鬆
      </Text>
    </View>
  );
}

/** Emblem + wordmark lockup. Horizontal for headers, stacked for auth screens. */
export function BrandLockup({
  layout = 'row',
  emblemSize,
}: {
  layout?: 'row' | 'stacked';
  emblemSize?: number;
}) {
  if (layout === 'stacked') {
    return (
      <View className="items-center">
        <BrandMark size={emblemSize ?? 116} />
        <View className="mt-3">
          <BrandWordmark align="center" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-2.5">
      <BrandMark size={emblemSize ?? 44} />
      <BrandWordmark />
    </View>
  );
}

/** 易拍通 brand bar used as the custom header for every tab. */
export function BrandHeader() {
  return (
    <View className="bg-background pt-safe border-b border-neutral-200">
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <BrandLockup />
        <NotificationBell />
      </View>
    </View>
  );
}
