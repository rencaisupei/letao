import { Image, Text, View } from 'react-native';

import brandArtwork from '@/assets/brand-logo-full.png';
import { NotificationBell } from '@/components/NotificationBell';

const BRAND_LABEL = '易拍通 YI PAI TONG，易拍即通 · 成交輕鬆';

/**
 * The supplied artwork is a portrait composition: gavel + circular phoenix
 * emblem on top, then the 易拍通 / YI PAI TONG wordmark underneath. Screens pair
 * a live wordmark with the emblem, so BrandMark crops the artwork down to the
 * emblem band (fractions of the artwork height) and clips it to a circle.
 */
const EMBLEM_TOP = 0.02;
const EMBLEM_BOTTOM = 0.66;

// Intrinsic size of assets/brand-logo-full.png (359 x 479). Kept as a constant
// because Image.resolveAssetSource does not exist on react-native-web.
const ARTWORK_ASPECT = 479 / 359;

export function BrandMark({ size = 44 }: { size?: number }) {
  // Height of the emblem band, expressed in multiples of the artwork width.
  const bandHeight = (EMBLEM_BOTTOM - EMBLEM_TOP) * ARTWORK_ASPECT;
  const imageWidth = size / bandHeight;
  const imageHeight = imageWidth * ARTWORK_ASPECT;

  return (
    <View
      className="overflow-hidden border border-neutral-200 bg-white"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Image
        source={brandArtwork}
        style={{
          position: 'absolute',
          width: imageWidth,
          height: imageHeight,
          left: (size - imageWidth) / 2,
          top: -EMBLEM_TOP * imageHeight,
        }}
        resizeMode="cover"
        accessibilityLabel={BRAND_LABEL}
      />
    </View>
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
