import { Text, View } from 'react-native';
import { Defs, LinearGradient, Stop } from 'react-native-svg';

import { NotificationBell } from '@/components/NotificationBell';
import { Path, Svg } from '@/components/ui/primitives/Svg';

const BRAND_FROM = '#FF416C';
const BRAND_TO = '#FF4B2B';

/** 易拍通 logo: shopping bag + auction gavel, drawn with the brand gradient. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="yptBrand" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={BRAND_TO} />
          <Stop offset="1" stopColor={BRAND_FROM} />
        </LinearGradient>
      </Defs>

      {/* bag handle */}
      <Path
        d="M8.5 13.5 V10.5 a3.8 3.8 0 0 1 7.6 0 V13.5"
        stroke="url(#yptBrand)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      {/* bag body */}
      <Path
        d="M4.6 13.6 h15.4 a1.6 1.6 0 0 1 1.6 1.6 v12.4 a1.6 1.6 0 0 1 -1.6 1.6 h-15.4 a1.6 1.6 0 0 1 -1.6 -1.6 v-12.4 a1.6 1.6 0 0 1 1.6 -1.6 z"
        stroke="url(#yptBrand)"
        strokeWidth={2.4}
        strokeLinejoin="round"
        fill="none"
      />
      {/* gavel handle */}
      <Path
        d="M17.4 21.6 L25.6 13.4"
        stroke="url(#yptBrand)"
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      {/* gavel head */}
      <Path
        d="M23.2 9.6 L29.4 15.8"
        stroke="url(#yptBrand)"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** 易拍通 brand bar used as the custom header for every tab. */
export function BrandHeader() {
  return (
    <View className="bg-background pt-safe border-b border-neutral-200">
      <View className="flex-row items-center justify-between px-4 pt-2.5 pb-3">
        <View className="flex-row items-center gap-2.5">
          <BrandMark />

          <View>
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-foreground text-[20px] font-extrabold tracking-[1px]">
                易拍通
              </Text>
              <Text className="text-[11px] font-bold tracking-[0.5px] text-neutral-400">
                YI PAI TONG
              </Text>
            </View>
            <Text className="text-muted mt-0.5 text-[11px] font-medium tracking-[2px]">
              易拍即通 · 成交輕鬆
            </Text>
          </View>
        </View>

        <NotificationBell />
      </View>
    </View>
  );
}
