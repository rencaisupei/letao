import { Pressable, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { cn } from '@/lib/utils';

const GOLD = '#F59E0B';
const MUTED = '#D1D5DB';

type StarRatingProps = {
  value: number;
  size?: number;
  /** When set, stars become tappable. */
  onChange?: (rating: number) => void;
  label?: string;
  className?: string;
};

export function StarRating({ value, size = 16, onChange, label, className }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      {stars.map((star) =>
        onChange ? (
          <Pressable
            key={star}
            accessibilityRole="button"
            accessibilityLabel={`${star} 顆星`}
            hitSlop={6}
            onPress={() => onChange(star)}
          >
            <Star
              size={size}
              color={star <= value ? GOLD : MUTED}
              fill={star <= value ? GOLD : 'transparent'}
              strokeWidth={1.8}
            />
          </Pressable>
        ) : (
          <Star
            key={star}
            size={size}
            color={star <= Math.round(value) ? GOLD : MUTED}
            fill={star <= Math.round(value) ? GOLD : 'transparent'}
            strokeWidth={1.8}
          />
        ),
      )}
      {label ? <Text className="text-muted ml-1 text-[11px] font-medium">{label}</Text> : null}
    </View>
  );
}
