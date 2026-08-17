import { useEffect } from 'react';
import { Text } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { SAGE } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Glowing "⚡ 已置頂" badge with a soft opacity pulse. */
export function BumpedBadge({ className }: { className?: string }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <AnimatedView
      style={[
        animatedStyle,
        {
          shadowColor: SAGE,
          shadowOpacity: 0.6,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
      className={cn('bg-sage rounded-md px-2 py-1', className)}
    >
      <Text className="text-[10px] font-bold text-white">⚡ 已置頂</Text>
    </AnimatedView>
  );
}
