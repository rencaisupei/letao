import { useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { Rocket } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Path, Svg } from '@/components/ui/primitives/Svg';
import { MINT, SAGE } from '@/lib/constants';

const PARTICLE_COUNT = 12;
const BURST_DURATION = 600;
const BURST_DISTANCE = 80;
const ROCKET_DURATION = 900;

const STAR_PATH =
  'M12 1.5 L14.4 8.6 L21.9 8.9 L15.9 13.4 L18.1 20.6 L12 16.2 L5.9 20.6 L8.1 13.4 L2.1 8.9 L9.6 8.6 Z';
const LEAF_PATH =
  'M20.5 3.2 C13.8 2.4 8.2 4.6 5.4 9.1 C3.1 12.8 3.9 17.4 7 19.6 C11.4 17.4 15.2 14.4 17.7 10.5 C15.6 12.1 13.1 13.4 10.3 14.2 C13.8 12.1 17.2 8.4 20.5 3.2 Z';

type ParticleConfig = {
  id: string;
  angle: number;
  distance: number;
  size: number;
  spin: number;
  delay: number;
  shape: 'star' | 'leaf';
  color: string;
};

function buildParticles(): ParticleConfig[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const base = (index / PARTICLE_COUNT) * Math.PI * 2;
    return {
      id: `particle-${index}`,
      angle: base + (Math.random() - 0.5) * 0.45,
      distance: BURST_DISTANCE * (0.75 + Math.random() * 0.45),
      size: index % 2 === 0 ? 14 : 11,
      spin: (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 160),
      delay: Math.random() * 90,
      shape: index % 2 === 0 ? 'star' : 'leaf',
      color: index % 3 === 0 ? MINT : SAGE,
    };
  });
}

function Particle({ config, playToken }: { config: ParticleConfig; playToken: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (playToken === 0) return;
    progress.value = 0;
    progress.value = withDelay(
      config.delay,
      withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.cubic) }),
    );
  }, [playToken, config.delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const progressValue = progress.value;
    return {
      opacity: interpolate(progressValue, [0, 0.08, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(config.angle) * config.distance * progressValue },
        { translateY: Math.sin(config.angle) * config.distance * progressValue },
        { scale: interpolate(progressValue, [0, 0.3, 1], [0.3, 1, 0.45]) },
        { rotate: `${progressValue * config.spin}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: -config.size / 2,
          top: -config.size / 2,
          width: config.size,
          height: config.size,
        },
        animatedStyle,
      ]}
    >
      <Svg width={config.size} height={config.size} viewBox="0 0 24 24">
        <Path d={config.shape === 'star' ? STAR_PATH : LEAF_PATH} fill={config.color} />
      </Svg>
    </Animated.View>
  );
}

type BumpFxProps = {
  /** Increment to replay the celebration. 0 means "never played". */
  playToken: number;
  /** Keep the sage glow after the burst (listing is still promoted). */
  persistGlow?: boolean;
  children: ReactNode;
};

/**
 * Wraps a listing card and plays the bump success micro-interaction:
 * scale pop, white -> sage glowing border, 12 star/leaf particles and a
 * rocket floating up through the card.
 */
export function BumpFx({ playToken, persistGlow = false, children }: BumpFxProps) {
  const particles = useMemo(() => buildParticles(), []);
  const scale = useSharedValue(1);
  const glow = useSharedValue(persistGlow ? 1 : 0);
  const rocket = useSharedValue(0);

  useEffect(() => {
    if (playToken === 0) return;

    scale.value = withSequence(
      withTiming(1.1, { duration: 170, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 11, stiffness: 170, mass: 0.7 }),
    );

    glow.value = withSequence(
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
      withDelay(700, withTiming(persistGlow ? 1 : 0, { duration: 420 })),
    );

    rocket.value = 0;
    rocket.value = withTiming(1, { duration: ROCKET_DURATION, easing: Easing.out(Easing.cubic) });
  }, [playToken, persistGlow, scale, glow, rocket]);

  useEffect(() => {
    if (playToken === 0) {
      glow.value = withTiming(persistGlow ? 1 : 0, { duration: 300 });
    }
  }, [persistGlow, playToken, glow]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(glow.value, [0, 1], ['#FFFFFF', SAGE]),
    shadowColor: SAGE,
    shadowOpacity: interpolate(glow.value, [0, 1], [0, 0.55]),
    shadowRadius: interpolate(glow.value, [0, 1], [0, 18]),
    shadowOffset: { width: 0, height: 0 },
  }));

  const rocketStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rocket.value, [0, 0.15, 0.72, 1], [0, 1, 1, 0]),
    transform: [{ translateY: interpolate(rocket.value, [0, 1], [40, -60]) }],
  }));

  return (
    <View className="relative">
      <Animated.View style={[{ borderWidth: 2, borderRadius: 18 }, cardStyle]}>
        {children}
      </Animated.View>

      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="h-0 w-0 items-center justify-center">
          {/* 13 animated nodes per card; only mount them once a celebration
              actually runs, so a long listing grid stays cheap to render. */}
          {playToken > 0 ? (
            <>
              {particles.map((config) => (
                <Particle key={config.id} config={config} playToken={playToken} />
              ))}
              <Animated.View style={[{ position: 'absolute', left: -15, top: -15 }, rocketStyle]}>
                <Rocket size={30} color={SAGE} strokeWidth={1.8} />
              </Animated.View>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}
