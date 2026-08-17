import { Platform } from 'react-native';
import * as Location from 'expo-location';

import type { LatLng } from '@/components/MapView.types';

export type LocationFailureReason = 'permission' | 'services-off' | 'timeout' | 'error';

export type LocationOutcome =
  | { ok: true; coords: LatLng; isApproximate: boolean }
  | { ok: false; reason: LocationFailureReason };

/** A cold GPS fix on a phone can take a while; do not block the UI forever. */
const FIX_TIMEOUT_MS = 8000;
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

export function locationFailureMessage(reason: LocationFailureReason): string {
  if (reason === 'permission') {
    return '樂淘只用定位計算你與面交地點的距離，不會儲存位置。可以到系統設定開啟定位權限後再試。';
  }
  if (reason === 'services-off') {
    return '裝置的定位服務目前是關閉的，請先在系統設定開啟定位，再回來試一次。';
  }
  if (reason === 'timeout') {
    return '一直收不到定位訊號，請走到窗邊或室外再試一次。';
  }
  return '定位失敗，請確認裝置定位功能已開啟後再試一次。';
}

function toLatLng(position: Location.LocationObject): LatLng {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

async function lastKnown(): Promise<LatLng | null> {
  try {
    const position = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
    });
    return position ? toLatLng(position) : null;
  } catch {
    return null;
  }
}

/**
 * Asks for foreground permission and returns a coordinate, falling back to the
 * last known position when a fresh fix does not arrive in time.
 */
export async function requestUserLocation(): Promise<LocationOutcome> {
  if (Platform.OS !== 'web') {
    const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!servicesEnabled) return { ok: false, reason: 'services-off' };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission' };

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), FIX_TIMEOUT_MS);
      }),
    ]);

    if (fix) return { ok: true, coords: toLatLng(fix), isApproximate: false };

    const cached = await lastKnown();
    if (cached) return { ok: true, coords: cached, isApproximate: true };
    return { ok: false, reason: 'timeout' };
  } catch {
    const cached = await lastKnown();
    if (cached) return { ok: true, coords: cached, isApproximate: true };
    return { ok: false, reason: 'error' };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export type PermissionSnapshot = {
  granted: boolean;
  status: string;
  canAskAgain: boolean;
};

/** Read-only permission read used by the diagnostics screen. */
export async function readLocationPermission(): Promise<PermissionSnapshot> {
  const permission = await Location.getForegroundPermissionsAsync();
  return {
    granted: permission.granted,
    status: permission.status,
    canAskAgain: permission.canAskAgain,
  };
}

export async function readLocationServicesEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  return Location.hasServicesEnabledAsync().catch(() => false);
}
