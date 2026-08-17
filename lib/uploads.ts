import * as ImagePicker from 'expo-image-picker';

import { bilt } from '@/lib/bilt';
import { LISTING_PHOTO_BUCKET, MAX_LISTING_PHOTOS } from '@/lib/constants';

export type PickedPhoto = {
  /** Local preview uri */
  uri: string;
  base64: string;
  mimeType: string;
};

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Hermes has no reliable atob, so decode base64 into bytes by hand. */
function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let cursor = 0;

  for (let index = 0; index < clean.length; index += 4) {
    const c0 = BASE64_ALPHABET.indexOf(clean.charAt(index));
    const c1 = BASE64_ALPHABET.indexOf(clean.charAt(index + 1));
    const c2 = BASE64_ALPHABET.indexOf(clean.charAt(index + 2));
    const c3 = BASE64_ALPHABET.indexOf(clean.charAt(index + 3));
    const chunk =
      (Math.max(c0, 0) << 18) | (Math.max(c1, 0) << 12) | (Math.max(c2, 0) << 6) | Math.max(c3, 0);

    if (cursor < byteLength) bytes[cursor++] = (chunk >> 16) & 0xff;
    if (cursor < byteLength) bytes[cursor++] = (chunk >> 8) & 0xff;
    if (cursor < byteLength) bytes[cursor++] = chunk & 0xff;
  }

  return bytes;
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

function normalizeMime(mimeType: string | null | undefined): string {
  if (!mimeType) return 'image/jpeg';
  if (mimeType === 'image/jpg') return 'image/jpeg';
  if (mimeType.startsWith('image/')) return mimeType;
  return 'image/jpeg';
}

export type PickOutcome =
  | { ok: true; photos: PickedPhoto[] }
  | { ok: false; reason: 'permission' | 'cancelled' };

export async function pickPhotosFromLibrary(remainingSlots: number): Promise<PickOutcome> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: remainingSlots > 1,
    selectionLimit: Math.min(remainingSlots, MAX_LISTING_PHOTOS),
    quality: 0.7,
    base64: true,
  });

  if (result.canceled) return { ok: false, reason: 'cancelled' };

  return {
    ok: true,
    photos: result.assets.slice(0, remainingSlots).map((asset) => ({
      uri: asset.uri,
      base64: asset.base64 ?? '',
      mimeType: normalizeMime(asset.mimeType),
    })),
  };
}

export async function takePhotoWithCamera(): Promise<PickOutcome> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission' };

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.7,
    base64: true,
  });

  if (result.canceled) return { ok: false, reason: 'cancelled' };

  return {
    ok: true,
    photos: result.assets.map((asset) => ({
      uri: asset.uri,
      base64: asset.base64 ?? '',
      mimeType: normalizeMime(asset.mimeType),
    })),
  };
}

/** Uploads one picked photo into the user's own folder and returns its public URL. */
export async function uploadListingPhoto(
  userId: string,
  photo: PickedPhoto,
  index: number,
): Promise<string | null> {
  let bytes: Uint8Array | null = null;

  if (photo.base64 !== '') {
    bytes = base64ToBytes(photo.base64);
  } else {
    try {
      const response = await fetch(photo.uri);
      const buffer = await response.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  if (!bytes || bytes.byteLength === 0) return null;

  const path = `${userId}/${Date.now()}-${index}.${extensionFor(photo.mimeType)}`;
  const { error } = await bilt.storage.from(LISTING_PHOTO_BUCKET).upload(path, bytes, {
    contentType: photo.mimeType,
    upsert: false,
  });

  if (error) return null;

  const { data } = bilt.storage.from(LISTING_PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
