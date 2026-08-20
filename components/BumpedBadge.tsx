import { useEffect } from 'react';
import { Zap } from 'lucide-react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { Text } from '@/components/ui/primitives/Text';
import { SAGE } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Glowing "已置頂" badge with a soft opacity pulse. */
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
      className={cn('bg-sage flex-row items-center gap-1 rounded-md px-2 py-1', className)}
    >
      <Zap size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
      <Text className="text-2xs font-bold text-white">已置頂</Text>
    </AnimatedView>
  );
}
