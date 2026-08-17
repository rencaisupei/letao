import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import { HeartOff } from 'lucide-react-native';

import { ListingCard } from '@/components/ListingCard';
import { SAGE } from '@/lib/constants';
import { fetchListingsByIds } from '@/lib/queries';
import { type Listing, useLetaoStore } from '@/lib/store';

const GRID_GAP = 12;

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const favorites = useLetaoStore((state) => state.favorites);
  const listings = useLetaoStore((state) => state.listings);
  const promotedUntil = useLetaoStore((state) => state.promotedUntil);

  const [extra, setExtra] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const favoriteIds = useMemo(() => Object.keys(favorites), [favorites]);
  const cardWidth = Math.floor((width - GRID_GAP * 3) / 2);

  const inStore = useMemo(
    () => listings.filter((listing) => favorites[listing.id]),
    [listings, favorites],
  );
  const missingIds = useMemo(
    () => favoriteIds.filter((id) => !inStore.some((listing) => listing.id === id)),
    [favoriteIds, inStore],
  );

  const loadMissing = useCallback(async () => {
    if (missingIds.length === 0) {
      setExtra([]);
      return;
    }
    setIsLoading(true);
    const rows = await fetchListingsByIds(missingIds);
    setExtra(rows);
    setIsLoading(false);
  }, [missingIds]);

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
        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_GAP }}
        contentContainerStyle={{ gap: GRID_GAP, paddingVertical: GRID_GAP, paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="items-center px-8 py-16">
            <HeartOff size={30} color={SAGE} strokeWidth={1.6} />
            <Text className="text-muted mt-4 text-center text-[13px] leading-5">
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
