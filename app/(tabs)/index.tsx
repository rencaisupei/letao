import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button } from 'heroui-native';

import { ListingCard } from '@/components/ListingCard';
import { SelectChip } from '@/components/SelectChip';
import { showAlert } from '@/lib/alert';
import { ALL_CATEGORY, CATEGORIES, getCondition } from '@/lib/constants';
import { type Listing, useLetaoStore } from '@/lib/store';

const GRID_GAP = 12;

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const listings = useLetaoStore((state) => state.listings);
  const promotedUntil = useLetaoStore((state) => state.promotedUntil);
  const isRefreshing = useLetaoStore((state) => state.isRefreshing);
  const refresh = useLetaoStore((state) => state.refresh);

  const [category, setCategory] = useState(ALL_CATEGORY);
  const [query, setQuery] = useState('');
  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [offerPrice, setOfferPrice] = useState('');

  const cardWidth = Math.floor((width - GRID_GAP * 3) / 2);

  const visibleListings = useMemo(
    () =>
      listings.filter((listing) => {
        const matchesCategory = category === ALL_CATEGORY || listing.category === category;
        const matchesQuery = query.trim() === '' || listing.title.includes(query.trim());
        return matchesCategory && matchesQuery;
      }),
    [listings, category, query],
  );

  const openOffer = (listing: Listing) => {
    setOfferPrice('');
    setActiveListing(listing);
  };

  const submitOffer = () => {
    if (!activeListing) return;

    const condition = getCondition(activeListing.condition_rating);
    const minAllowed = Math.ceil(activeListing.price * condition.minRatio);
    const offer = Number.parseFloat(offerPrice);
    const listing = activeListing;

    if (!Number.isFinite(offer) || offer < minAllowed) {
      setActiveListing(null);
      showAlert({
        title: '⚠️ 出價遭系統攔截',
        tone: 'danger',
        message: `樂淘交易所防砍價機制：\n${
          condition.minRatio === 0.9 ? '【全新品】最低出價限制 90%' : '【二手品】最低出價限制 80%'
        }\n\n該單品最低接受金額為：NT$ ${minAllowed.toLocaleString('en-US')}`,
      });
      return;
    }

    setActiveListing(null);
    setTimeout(() => {
      const locationInfo =
        listing.logistics === '面交'
          ? (listing.meetup_location ?? '雙方約定之公共場所')
          : `${listing.logistics ?? '指定物流'}（設定的指定物流）`;
      showAlert({
        title: '🤝 樂淘媒合成功！準備面交囉',
        tone: 'success',
        message: `您與對方針對「${listing.title}」已達成交易共識。\n\n安全交手節點：${locationInfo}。\n\n樂淘提示您：請選擇人潮眾多、設有監視器的公共場所面交，安全更有保障。祝您交易愉快！`,
      });
    }, 900);
  };

  const minAllowedForActive = activeListing
    ? Math.ceil(activeListing.price * getCondition(activeListing.condition_rating).minRatio)
    : 0;

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
            onPress={() => openOffer(item)}
          />
        )}
      />

      <Modal
        visible={activeListing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveListing(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <View className="bg-background w-full max-w-sm rounded-2xl border border-neutral-200 p-5">
            <Text className="text-foreground text-base font-bold">出價與媒合</Text>
            <Text className="text-muted mt-2 text-[13px]" numberOfLines={2}>
              {activeListing?.title}
            </Text>
            <Text className="text-foreground mt-1 text-sm font-bold">
              賣家標價 NT$ {activeListing?.price.toLocaleString('en-US')}
            </Text>
            <Text className="mt-1 text-[11px] font-semibold text-red-600">
              最低可接受出價：NT$ {minAllowedForActive.toLocaleString('en-US')}
            </Text>

            <TextInput
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="number-pad"
              placeholder="輸入您的出價金額"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-canvas text-foreground mt-4 h-11 rounded-xl border border-neutral-200 px-4 text-sm"
            />

            <View className="mt-4 flex-row gap-2">
              <Button variant="secondary" className="flex-1" onPress={() => setActiveListing(null)}>
                <Button.Label>取消</Button.Label>
              </Button>
              <Button className="flex-1" onPress={submitOffer}>
                <Button.Label>送出出價</Button.Label>
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
