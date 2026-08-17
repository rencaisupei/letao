import type { ImageSourcePropType } from 'react-native';

import cameraImage from '@/assets/demo/camera.png';
import jacketImage from '@/assets/demo/jacket.png';
import lampImage from '@/assets/demo/lamp.png';
import vinylImage from '@/assets/demo/vinyl.png';

/**
 * Demo listings ship their photos inside the bundle, so the database stores a
 * stable key instead of a remote URL. Real listings keep storing plain URLs.
 */
const DEMO_SCHEME = 'letao-demo://';

const DEMO_IMAGES = {
  camera: cameraImage,
  jacket: jacketImage,
  lamp: lampImage,
  vinyl: vinylImage,
};

export type DemoImageKey = keyof typeof DEMO_IMAGES;

export function demoImageUri(key: DemoImageKey): string {
  return `${DEMO_SCHEME}${key}`;
}

function isDemoImageKey(key: string): key is DemoImageKey {
  return key in DEMO_IMAGES;
}

export function resolveListingImage(uri: string | null | undefined): ImageSourcePropType | null {
  if (!uri) return null;
  if (uri.startsWith(DEMO_SCHEME)) {
    const key = uri.slice(DEMO_SCHEME.length);
    return isDemoImageKey(key) ? DEMO_IMAGES[key] : null;
  }
  return { uri };
}
