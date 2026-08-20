import { Pressable, View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { requireAccount } from '@/lib/requireAccount';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type FavoriteButtonProps = {
  listingId: string;
  size?: number;
  className?: string;
};

const ROSE = '#E11D48';

export function FavoriteButton({ listingId, size = 18, className }: FavoriteButtonProps) {
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const isSaved = favorites[listingId];

  const handlePress = () => {
    if (!requireAccount('收藏商品')) return;
    void toggleFavorite(listingId);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isSaved ? '取消收藏' : '加入收藏'}
      hitSlop={8}
      onPress={handlePress}
      className={cn('items-center justify-center', className)}
    >
      <View className="h-8 w-8 items-center justify-center rounded-full bg-white/90">
        <Heart
          size={size}
          color={isSaved ? ROSE : '#6B7280'}
          fill={isSaved ? ROSE : 'transparent'}
          strokeWidth={2}
        />
      </View>
    </Pressable>
  );
}
