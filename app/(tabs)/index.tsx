import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View, useWindowDimensions } from 'react-native';
import { Button } from 'heroui-native';
import { router } from 'expo-router';
import { Heart, SlidersHorizontal, UserPlus } from 'lucide-react-native';

import { FilterSheet } from '@/components/FilterSheet';
import { ListingCard } from '@/components/ListingCard';
import { SelectChip } from '@/components/SelectChip';
import { Text, TextInput } from '@/components/ui/primitives/Text';
import { ALL_CATEGORY, CATEGORIES, SAGE, SORT_OPTIONS } from '@/lib/constants';
import { DEFAULT_FILTERS, activeFilterCount, applyFilters } from '@/lib/filters';
import {
  CARD_GAP,
  SCREEN_BOTTOM_PADDING,
  SCREEN_PADDING,
  gridCardWidth,
  gridColumnWrapper,
} from '@/lib/layout';
import { useAppStore } from '@/lib/store';

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const userId = useAppStore((state) => state.userId);
  const listings = useAppStore((state) => state.listings);
  const promotedUntil = useAppStore((state) => state.promotedUntil);
  const favorites = useAppStore((state) => state.favorites);
  const isRefreshing = useAppStore((state) => state.isRefreshing);
  const refresh = useAppStore((state) => state.refresh);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Cards, header row and chip rails all sit on SCREEN_PADDING, so the grid
  // lines up with everything above it.
  const cardWidth = gridCardWidth(width);
  const favoriteCount = Object.keys(favorites).length;
  const filterCount = activeFilterCount(filters);

  const visibleListings = useMemo(
    () => applyFilters(listings, filters, promotedUntil),
    [listings, filters, promotedUntil],
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
        columnWrapperStyle={gridColumnWrapper}
        contentContainerStyle={{ gap: CARD_GAP, paddingBottom: SCREEN_BOTTOM_PADDING }}
        ListHeaderComponent={
          <View className="pb-1">
            <View className="flex-row items-center gap-2 px-4 pt-3">
              <TextInput
                value={filters.query}
                onChangeText={(text) => setFilters({ ...filters, query: text })}
                returnKeyType="search"
                placeholder="搜尋商品名稱、描述或賣家..."
                placeholderTextColorClassName="accent-neutral-400"
                className="bg-background text-foreground h-11 flex-1 rounded-xl border border-neutral-200 px-4 text-sm"
              />
              <Button
                size="sm"
                variant={filterCount > 0 ? 'primary' : 'secondary'}
                onPress={() => setSheetVisible(true)}
              >
                <SlidersHorizontal
                  size={14}
                  color={filterCount > 0 ? '#FFFFFF' : SAGE}
                  strokeWidth={2.2}
                />
                <Button.Label>{filterCount > 0 ? `篩選 ${filterCount}` : '篩選'}</Button.Label>
              </Button>
            </View>

            {userId ? (
              <View className="mt-3 flex-row items-center justify-between px-4">
                <Text className="text-muted text-2xs">共 {visibleListings.length} 件好物</Text>
                <View className="flex-row gap-1.5">
                  <Button size="sm" variant="tertiary" onPress={() => router.push('/favorites')}>
                    <Heart size={13} color={SAGE} strokeWidth={2.2} />
                    <Button.Label>收藏 {favoriteCount}</Button.Label>
                  </Button>
                </View>
              </View>
            ) : (
              <View className="bg-mint mx-4 mt-3 rounded-2xl p-4">
                <View className="flex-row items-center gap-2">
                  <UserPlus size={16} color={SAGE} strokeWidth={2} />
                  <Text className="text-sage-deep text-sm font-bold">現在是訪客瀏覽模式</Text>
                </View>
                <Text className="text-sage-deep/90 text-2xs mt-1.5">
                  商品可以自由瀏覽。要出價、上架、私訊或收藏，買賣雙方都需要先註冊易拍通帳號。
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
              contentContainerStyle={{
                gap: 6,
                paddingHorizontal: SCREEN_PADDING,
                paddingTop: CARD_GAP,
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <SelectChip
                  key={option.code}
                  size="sm"
                  label={option.label}
                  isSelected={filters.sort === option.code}
                  onPress={() => setFilters({ ...filters, sort: option.code })}
                  className="rounded-lg"
                />
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 6,
                paddingHorizontal: SCREEN_PADDING,
                paddingVertical: 10,
              }}
            >
              {[ALL_CATEGORY, ...CATEGORIES].map((item) => (
                <SelectChip
                  key={item}
                  label={item}
                  isSelected={filters.category === item}
                  onPress={() => setFilters({ ...filters, category: item })}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-6 py-14">
            <Text className="text-muted text-center text-sm">
              沒有符合條件的好物。試著清除篩選、換個關鍵字，或到「釋出好物」上架第一件商品。
            </Text>
            {filterCount > 0 || filters.query !== '' ? (
              <Button
                size="sm"
                variant="secondary"
                className="mt-4"
                onPress={() => setFilters(DEFAULT_FILTERS)}
              >
                <Button.Label>清除所有條件</Button.Label>
              </Button>
            ) : null}
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

      <FilterSheet
        visible={sheetVisible}
        filters={filters}
        resultCount={visibleListings.length}
        onChange={setFilters}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}
