import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { bilt } from '@/lib/bilt';
import { AVATAR_BUCKET, LISTING_PHOTO_BUCKET, MAX_LISTING_PHOTOS } from '@/lib/constants';

export type PickedPhoto = {
  /** Local preview uri (the resized copy when processing succeeded). */
  uri: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  /** Decoded size in bytes; 0 when the photo could not be processed on device. */
  byteLength: number;
};

/** Phone cameras shoot 12MP+; downscale before upload so memory and time stay sane. */
const MAX_EDGE = 1440;
const JPEG_QUALITY = 0.72;

/** Must stay in sync with the storage buckets' file_size_limit. */
const LISTING_PHOTO_LIMIT_BYTES = 8 * 1024 * 1024;
const AVATAR_LIMIT_BYTES = 3 * 1024 * 1024;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** charCode -> 6-bit value lookup, so decoding does not run indexOf per character. */
const BASE64_LOOKUP = (() => {
  const table = new Int16Array(256).fill(-1);
  for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
    table[BASE64_ALPHABET.charCodeAt(index)] = index;
  }
  return table;
})();

/** Hermes has no reliable atob, so decode base64 into bytes by hand. */
function base64ToBytes(base64: string): Uint8Array {
  const sextets = new Uint8Array(base64.length);
  let sextetCount = 0;

  for (let index = 0; index < base64.length; index += 1) {
    const value = BASE64_LOOKUP[base64.charCodeAt(index)] ?? -1;
    if (value >= 0) sextets[sextetCount++] = value;
  }

  const byteLength = Math.floor((sextetCount * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let cursor = 0;

  for (let index = 0; index < sextetCount; index += 4) {
    const chunk =
      ((sextets[index] ?? 0) << 18) |
      ((sextets[index + 1] ?? 0) << 12) |
      ((sextets[index + 2] ?? 0) << 6) |
      (sextets[index + 3] ?? 0);

    if (cursor < byteLength) bytes[cursor++] = (chunk >> 16) & 0xff;
    if (cursor < byteLength) bytes[cursor++] = (chunk >> 8) & 0xff;
    if (cursor < byteLength) bytes[cursor++] = chunk & 0xff;
  }

  return bytes;
}

function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
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

/**
 * Downscales and re-encodes a picked asset to JPEG. Falls back to the raw asset
 * (uploaded by streaming the local uri) when the native pass fails.
 */
async function preparePhoto(asset: ImagePicker.ImagePickerAsset): Promise<PickedPhoto> {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;

  try {
    const context = ImageManipulator.manipulate(asset.uri);

    if (Math.max(width, height) > MAX_EDGE) {
      context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }

    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_QUALITY,
      base64: true,
    });
    const base64 = saved.base64 ?? '';

    if (base64 !== '') {
      return {
        uri: saved.uri,
        base64,
        mimeType: 'image/jpeg',
        width: saved.width,
        height: saved.height,
        byteLength: base64ByteLength(base64),
      };
    }
  } catch {
    // fall through to the raw asset
  }

  return {
    uri: asset.uri,
    base64: '',
    mimeType: normalizeMime(asset.mimeType),
    width,
    height,
    byteLength: 0,
  };
}

async function prepareAll(assets: ImagePicker.ImagePickerAsset[]): Promise<PickedPhoto[]> {
  const photos: PickedPhoto[] = [];
  // Sequential on purpose: parallel decoding of several full-size photos
  // is what pushes low-memory Android devices into a crash.
  for (const asset of assets) {
    photos.push(await preparePhoto(asset));
  }
  return photos;
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
    quality: 1,
  });

  if (result.canceled) return { ok: false, reason: 'cancelled' };

  return { ok: true, photos: await prepareAll(result.assets.slice(0, remainingSlots)) };
}

export async function takePhotoWithCamera(): Promise<PickOutcome> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission' };

  const result = await ImagePicker.launchCameraAsync({ quality: 1 });

  if (result.canceled) return { ok: false, reason: 'cancelled' };

  return { ok: true, photos: await prepareAll(result.assets) };
}

export type UploadFailureReason = 'decode' | 'too-large' | 'storage';

export type UploadOutcome = { ok: true; url: string } | { ok: false; reason: UploadFailureReason };

/** Human-readable copy for an upload failure. */
export function uploadFailureMessage(reason: UploadFailureReason): string {
  if (reason === 'too-large') return '相片檔案太大，請改用較小的圖片。';
  if (reason === 'decode') return '無法讀取這張相片，請換一張再試。';
  return '網路或雲端儲存忙碌中，請稍後再試一次。';
}

/** Uploads one picked photo into the user's own folder and returns its public URL. */
export function uploadListingPhoto(
  userId: string,
  photo: PickedPhoto,
  index: number,
): Promise<UploadOutcome> {
  return uploadToBucket(
    LISTING_PHOTO_BUCKET,
    userId,
    photo,
    `${Date.now()}-${index}`,
    LISTING_PHOTO_LIMIT_BYTES,
  );
}

/** Uploads a new avatar and returns its public URL. */
export function uploadAvatar(userId: string, photo: PickedPhoto): Promise<UploadOutcome> {
  return uploadToBucket(AVATAR_BUCKET, userId, photo, `avatar-${Date.now()}`, AVATAR_LIMIT_BYTES);
}

async function uploadToBucket(
  bucket: string,
  userId: string,
  photo: PickedPhoto,
  fileName: string,
  limitBytes: number,
): Promise<UploadOutcome> {
  let bytes: Uint8Array | null = null;

  if (photo.base64 !== '') {
    bytes = base64ToBytes(photo.base64);
  } else {
    try {
      const response = await fetch(photo.uri);
      const buffer = await response.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } catch {
      return { ok: false, reason: 'decode' };
    }
  }

  if (bytes.byteLength === 0) return { ok: false, reason: 'decode' };
  if (bytes.byteLength > limitBytes) return { ok: false, reason: 'too-large' };

  const path = `${userId}/${fileName}.${extensionFor(photo.mimeType)}`;
  const { error } = await bilt.storage.from(bucket).upload(path, bytes, {
    contentType: photo.mimeType,
    upsert: false,
  });

  if (error) return { ok: false, reason: 'storage' };

  const { data } = bilt.storage.from(bucket).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
