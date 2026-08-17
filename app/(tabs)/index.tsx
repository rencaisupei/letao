import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button } from 'heroui-native';
import { router } from 'expo-router';
import { Heart, UserPlus } from 'lucide-react-native';

import { ListingCard } from '@/components/ListingCard';
import { SelectChip } from '@/components/SelectChip';
import { ALL_CATEGORY, CATEGORIES, SAGE } from '@/lib/constants';
import { useLetaoStore } from '@/lib/store';

const GRID_GAP = 12;

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const userId = useLetaoStore((state) => state.userId);
  const listings = useLetaoStore((state) => state.listings);
  const promotedUntil = useLetaoStore((state) => state.promotedUntil);
  const favorites = useLetaoStore((state) => state.favorites);
  const isRefreshing = useLetaoStore((state) => state.isRefreshing);
  const refresh = useLetaoStore((state) => state.refresh);

  const [category, setCategory] = useState(ALL_CATEGORY);
  const [query, setQuery] = useState('');

  const cardWidth = Math.floor((width - GRID_GAP * 3) / 2);
  const favoriteCount = Object.keys(favorites).length;

  const visibleListings = useMemo(
    () =>
      listings.filter((listing) => {
        if (listing.moderation_status !== 'approved') return false;
        const matchesCategory = category === ALL_CATEGORY || listing.category === category;
        const matchesQuery = query.trim() === '' || listing.title.includes(query.trim());
        return matchesCategory && matchesQuery;
      }),
    [listings, category, query],
  );

  return (
    <View className="bg-canvas flex-1">
      <FlatList
        data={visibleListings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        refreshing={isRefreshing}
        onRefresh={() => {
          void refresh();
        }}
        columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: GRID_GAP }}
        contentContainerStyle={{ gap: GRID_GAP, paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="pb-1">
            <View className="px-4 pt-3">
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="搜尋 36 大品類極致好物..."
                placeholderTextColorClassName="accent-neutral-400"
                className="bg-background text-foreground h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
              />
            </View>

            {userId ? (
              <View className="mt-3 flex-row items-center justify-between px-4">
                <Text className="text-muted text-[11px]">
                  共 {visibleListings.length} 件已通過審核的好物
                </Text>
                <Button size="sm" variant="tertiary" onPress={() => router.push('/favorites')}>
                  <Heart size={13} color={SAGE} strokeWidth={2.2} />
                  <Button.Label>收藏 {favoriteCount}</Button.Label>
                </Button>
              </View>
            ) : (
              <View className="bg-mint mx-4 mt-3 rounded-2xl p-3.5">
                <View className="flex-row items-center gap-2">
                  <UserPlus size={16} color={SAGE} strokeWidth={2} />
                  <Text className="text-sage-deep text-[13px] font-bold">現在是訪客瀏覽模式</Text>
                </View>
                <Text className="text-sage-deep/90 mt-1.5 text-[11px] leading-4">
                  商品可以自由瀏覽。要出價、上架、私訊或收藏，買賣雙方都需要先註冊樂淘帳號。
                </Text>
                <Button
                  size="sm"
                  className="mt-2.5 self-start"
                  onPress={() => router.push('/sign-in')}
                >
                  <Button.Label>註冊 / 登入</Button.Label>
                </Button>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}
            >
              {[ALL_CATEGORY, ...CATEGORIES].map((item) => (
                <SelectChip
                  key={item}
                  label={item}
                  isSelected={category === item}
                  onPress={() => setCategory(item)}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-8 py-16">
            <Text className="text-muted text-center text-[13px]">
              這個品類還沒有好物，換個類別或到「釋出好物」上架第一件商品。
            </Text>
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
