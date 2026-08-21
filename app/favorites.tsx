import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import { HeartOff } from 'lucide-react-native';

import { ListingCard } from '@/components/ListingCard';
import { Text } from '@/components/ui/primitives/Text';
import { SAGE } from '@/lib/constants';
import { gridCardWidth, gridColumnWrapper, gridContent } from '@/lib/layout';
import { fetchListingsByIds } from '@/lib/queries';
import { type Listing, useAppStore } from '@/lib/store';

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const favorites = useAppStore((state) => state.favorites);
  const listings = useAppStore((state) => state.listings);
  const promotedUntil = useAppStore((state) => state.promotedUntil);

  const [extra, setExtra] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const favoriteIds = useMemo(() => Object.keys(favorites), [favorites]);
  const cardWidth = gridCardWidth(width);

  const inStore = useMemo(
    () => listings.filter((listing) => favorites[listing.id]),
    [listings, favorites],
  );
  // A plain array would be a new reference on every feed refresh and would send
  // loadMissing (and its network call) round again. Compare by content instead.
  const missingKey = useMemo(() => {
    const present = new Set(inStore.map((listing) => listing.id));
    return favoriteIds
      .filter((id) => !present.has(id))
      .sort((a, b) => a.localeCompare(b))
      .join(',');
  }, [favoriteIds, inStore]);

  const loadMissing = useCallback(async () => {
    const missingIds = missingKey === '' ? [] : missingKey.split(',');
    if (missingIds.length === 0) {
      setExtra([]);
      return;
    }
    setIsLoading(true);
    const rows = await fetchListingsByIds(missingIds);
    setExtra(rows);
    setIsLoading(false);
  }, [missingKey]);

  useEffect(() => {
    void loadMissing();
  }, [loadMissing]);

  const data = [...inStore, ...extra];

  return (
    <View className="bg-canvas flex-1">
      <Stack.Screen options={{ title: '我的收藏' }} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={gridColumnWrapper}
        contentContainerStyle={gridContent}
        ListEmptyComponent={
          <View className="items-center px-6 py-14">
            <HeartOff size={30} color={SAGE} strokeWidth={1.6} />
            <Text className="text-muted mt-4 text-center text-sm leading-5">
              {isLoading
                ? '正在載入收藏...'
                : '還沒有收藏任何商品。在商品卡右上角按下愛心，就會收進這裡。'}
            </Text>
            <Button className="mt-4" variant="secondary" onPress={() => router.push('/(tabs)')}>
              <Button.Label>去探索首頁挑好物</Button.Label>
            </Button>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            width={cardWidth}
            isPromoted={Boolean(promotedUntil[item.id])}
            onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}
