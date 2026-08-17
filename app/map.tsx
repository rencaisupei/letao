import { useCallback, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import { Crosshair, Leaf, MapPin, X } from 'lucide-react-native';

import MapView from '@/components/MapView';
import type { LatLng, MapMarker } from '@/components/MapView.types';
import { showAlert } from '@/lib/alert';
import { MINT, SAGE } from '@/lib/constants';
import { locationFailureMessage, requestUserLocation } from '@/lib/location';
import { resolveListingImage } from '@/lib/demoImages';
import { isBrowsable } from '@/lib/filters';
import {
  CITY_REGION_VIEW,
  TAIWAN_REGION_VIEW,
  formatDistance,
  haversineKm,
  resolveListingCoords,
} from '@/lib/geo';
import type { Listing } from '@/lib/store';
import { useLetaoStore } from '@/lib/store';

type PinnedListing = {
  listing: Listing;
  coords: LatLng;
  distanceKm: number | null;
};

export default function MapScreen() {
  const listings = useLetaoStore((state) => state.listings);
  const promotedUntil = useLetaoStore((state) => state.promotedUntil);

  const [userCoords, setUserCoords] = useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const pinned = useMemo<PinnedListing[]>(() => {
    const items: PinnedListing[] = [];
    for (const listing of listings) {
      if (!isBrowsable(listing)) continue;
      const coords = resolveListingCoords(listing);
      if (!coords) continue;
      items.push({
        listing,
        coords,
        distanceKm: userCoords ? haversineKm(userCoords, coords) : null,
      });
    }

    return [...items].sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      const aPromoted = Boolean(promotedUntil[a.listing.id]);
      const bPromoted = Boolean(promotedUntil[b.listing.id]);
      if (aPromoted !== bPromoted) return aPromoted ? -1 : 1;
      return b.listing.created_at.localeCompare(a.listing.created_at);
    });
  }, [listings, userCoords, promotedUntil]);

  const selected = pinned.find((item) => item.listing.id === selectedId) ?? null;

  const markers = useMemo<MapMarker[]>(
    () =>
      pinned.map((item) => ({
        id: item.listing.id,
        coordinate: item.coords,
        title: item.listing.title,
        description: `NT$ ${item.listing.price.toLocaleString('en-US')} ∙ ${
          item.listing.meetup_location ?? '台灣本島'
        }`,
        color: item.listing.id === selectedId ? '#D97706' : SAGE,
        onPress: () => setSelectedId(item.listing.id),
      })),
    [pinned, selectedId],
  );

  const initialRegion = useMemo(() => {
    if (userCoords) return { ...userCoords, ...CITY_REGION_VIEW };
    const first = pinned[0];
    if (first) return { ...first.coords, ...CITY_REGION_VIEW };
    return TAIWAN_REGION_VIEW;
  }, [userCoords, pinned]);

  const locateMe = useCallback(async () => {
    setIsLocating(true);
    const outcome = await requestUserLocation();
    setIsLocating(false);

    if (!outcome.ok) {
      showAlert({
        title: outcome.reason === 'permission' ? '沒有取得定位權限' : '無法取得目前位置',
        tone: outcome.reason === 'permission' ? 'default' : 'danger',
        message: locationFailureMessage(outcome.reason),
      });
      return;
    }

    setUserCoords(outcome.coords);

    if (outcome.isApproximate) {
      showAlert({
        title: '使用最近一次的位置',
        message: '目前收不到新的定位訊號，先用裝置最近一次記錄的位置估算距離。',
      });
    }
  }, []);

  return (
    <View className="bg-canvas flex-1">
      <Stack.Screen options={{ title: '面交地圖' }} />

      <MapView
        key={userCoords ? 'located' : 'default'}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        markers={markers}
        showsUserLocation={userCoords !== null && Platform.OS !== 'web'}
        onMarkerPress={(marker) => setSelectedId(marker.id ?? null)}
        onPress={() => setSelectedId(null)}
      />

      <View className="absolute top-3 right-3 left-3 flex-row items-center justify-between">
        <View className="bg-background/95 rounded-xl border border-neutral-200 px-3 py-2">
          <Text className="text-foreground text-[11px] font-bold">
            {pinned.length} 件商品有交付地點
          </Text>
          <Text className="text-muted mt-0.5 text-[10px]">
            {userCoords ? '已依你的位置由近到遠排序' : '開啟定位可依距離排序'}
          </Text>
        </View>
        <Button
          size="sm"
          isDisabled={isLocating}
          onPress={() => {
            void locateMe();
          }}
        >
          <Crosshair size={13} color="#FFFFFF" strokeWidth={2.2} />
          <Button.Label>{isLocating ? '定位中...' : '我的位置'}</Button.Label>
        </Button>
      </View>

      <View className="pb-safe-offset-3 absolute right-0 bottom-0 left-0">
        {selected ? (
          <View className="bg-background mx-3 rounded-2xl border border-neutral-200 p-3.5">
            <View className="flex-row">
              <ListingThumb listing={selected.listing} size={64} />
              <View className="ml-3 flex-1">
                <Text numberOfLines={1} className="text-foreground text-[13px] font-bold">
                  {selected.listing.title}
                </Text>
                <Text className="text-foreground mt-1 text-[15px] font-bold">
                  NT$ {selected.listing.price.toLocaleString('en-US')}
                </Text>
                <View className="mt-1 flex-row items-center gap-1">
                  <MapPin size={11} color={SAGE} strokeWidth={2.2} />
                  <Text className="text-sage-deep flex-1 text-[11px] font-medium" numberOfLines={1}>
                    {selected.listing.meetup_location ?? '台灣本島'}
                    {selected.distanceKm === null
                      ? ''
                      : ` ∙ 距離約 ${formatDistance(selected.distanceKm)}`}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="關閉"
                onPress={() => setSelectedId(null)}
                className="h-7 w-7 items-center justify-center"
              >
                <X size={16} color="#9CA3AF" strokeWidth={2.2} />
              </Pressable>
            </View>

            <Button
              size="sm"
              className="mt-2.5"
              onPress={() =>
                router.push({
                  pathname: '/listing/[id]',
                  params: { id: selected.listing.id },
                })
              }
            >
              <Button.Label>查看商品詳情</Button.Label>
            </Button>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          >
            {pinned.slice(0, 20).map((item) => (
              <Pressable
                key={item.listing.id}
                accessibilityRole="button"
                onPress={() => setSelectedId(item.listing.id)}
                style={{ width: 168 }}
                className="bg-background flex-row items-center rounded-2xl border border-neutral-200 p-2"
              >
                <ListingThumb listing={item.listing} size={44} />
                <View className="ml-2 flex-1">
                  <Text numberOfLines={1} className="text-foreground text-[11px] font-bold">
                    {item.listing.title}
                  </Text>
                  <Text className="text-foreground mt-0.5 text-[12px] font-bold">
                    NT$ {item.listing.price.toLocaleString('en-US')}
                  </Text>
                  <Text numberOfLines={1} className="text-sage-deep mt-0.5 text-[10px]">
                    {item.distanceKm === null
                      ? (item.listing.meetup_location ?? '台灣本島')
                      : `距離約 ${formatDistance(item.distanceKm)}`}
                  </Text>
                </View>
              </Pressable>
            ))}

            {pinned.length === 0 ? (
              <View className="bg-background mx-1 rounded-2xl border border-neutral-200 px-4 py-3">
                <Text className="text-muted text-[12px]">
                  目前沒有標註交付地點的商品。上架時選擇地區就會出現在地圖上。
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function ListingThumb({ listing, size }: { listing: Listing; size: number }) {
  const source = resolveListingImage(listing.images?.[0]);

  return (
    <View
      style={{ width: size, height: size, backgroundColor: MINT }}
      className="items-center justify-center overflow-hidden rounded-xl"
    >
      {source ? (
        <Image source={source} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Leaf size={Math.round(size * 0.4)} color={SAGE} strokeWidth={1.7} />
      )}
    </View>
  );
}
