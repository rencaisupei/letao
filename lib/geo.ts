import type { LatLng, MapRegion } from '@/components/MapView.types';

export type TaiwanRegion = {
  name: string;
  latitude: number;
  longitude: number;
};

/** Taiwan cities / counties used for the location filter and map presets. */
export const TAIWAN_REGIONS: TaiwanRegion[] = [
  { name: '台北', latitude: 25.0375, longitude: 121.5637 },
  { name: '新北', latitude: 25.0169, longitude: 121.4627 },
  { name: '基隆', latitude: 25.1276, longitude: 121.7392 },
  { name: '桃園', latitude: 24.9937, longitude: 121.297 },
  { name: '新竹', latitude: 24.8039, longitude: 120.9647 },
  { name: '苗栗', latitude: 24.5602, longitude: 120.8214 },
  { name: '台中', latitude: 24.1477, longitude: 120.6736 },
  { name: '彰化', latitude: 24.0759, longitude: 120.5445 },
  { name: '南投', latitude: 23.9609, longitude: 120.9718 },
  { name: '雲林', latitude: 23.7092, longitude: 120.4313 },
  { name: '嘉義', latitude: 23.4801, longitude: 120.4491 },
  { name: '台南', latitude: 22.9999, longitude: 120.2269 },
  { name: '高雄', latitude: 22.6273, longitude: 120.3014 },
  { name: '屏東', latitude: 22.5519, longitude: 120.5487 },
  { name: '宜蘭', latitude: 24.7021, longitude: 121.7378 },
  { name: '花蓮', latitude: 23.9871, longitude: 121.6015 },
  { name: '台東', latitude: 22.7583, longitude: 121.1444 },
  { name: '澎湖', latitude: 23.5712, longitude: 119.5793 },
  { name: '金門', latitude: 24.4321, longitude: 118.3171 },
  { name: '連江', latitude: 26.1608, longitude: 119.9499 },
];

export const TAIWAN_CENTER: LatLng = { latitude: 23.75, longitude: 120.95 };

export const TAIWAN_REGION_VIEW: MapRegion = {
  ...TAIWAN_CENTER,
  latitudeDelta: 3.6,
  longitudeDelta: 3.6,
};

export const CITY_REGION_VIEW = { latitudeDelta: 0.09, longitudeDelta: 0.09 };

export function regionByName(name: string | null | undefined): TaiwanRegion | null {
  if (!name) return null;
  return TAIWAN_REGIONS.find((region) => region.name === name) ?? null;
}

/** "台北 ∙ 信義區" -> the 台北 preset. */
export function regionFromLocationText(text: string | null | undefined): TaiwanRegion | null {
  if (!text) return null;
  return TAIWAN_REGIONS.find((region) => text.includes(region.name)) ?? null;
}

/** Stable pseudo-random offset so listings in the same city do not stack up. */
function jitterFor(seed: string, index: number): number {
  let hash = 0;
  for (let position = 0; position < seed.length; position += 1) {
    hash = (hash * 31 + seed.charCodeAt(position)) % 100_000;
  }
  const normalized = ((hash >> (index * 3)) % 200) / 200 - 0.5;
  return normalized * 0.045;
}

export type MappableListing = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  meetup_location: string | null;
};

/**
 * Coordinates for a listing: the seller's exact pin when present, otherwise a
 * jittered city centroid derived from the written location.
 */
export function resolveListingCoords(listing: MappableListing): LatLng | null {
  if (listing.latitude !== null && listing.longitude !== null) {
    return { latitude: listing.latitude, longitude: listing.longitude };
  }

  const region = regionFromLocationText(listing.meetup_location);
  if (!region) return null;

  return {
    latitude: region.latitude + jitterFor(listing.id, 0),
    longitude: region.longitude + jitterFor(listing.id, 1),
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(from: LatLng, to: LatLng): number {
  const earthRadiusKm = 6371;

  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} 公尺`;
  if (km < 10) return `${km.toFixed(1)} 公里`;
  return `${Math.round(km)} 公里`;
}
