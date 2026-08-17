import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

export default ({ config }: ConfigContext): ExpoConfig => {
  // Android needs a Google Maps key to render tiles in a dev/production build.
  // Expo Go ships its own key, so the map only goes blank once you build the app.
  const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? '';
  const mapsPlugin: ExpoPlugins[number] =
    androidGoogleMapsApiKey === ''
      ? 'react-native-maps'
      : ['react-native-maps', { androidGoogleMapsApiKey }];

  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }], mapsPlugin]
      : [];

  return {
    ...config,
    name: 'EcoSwap',
    slug: 'ecoswap',
    newArchEnabled: true,
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'ecoswap',
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      supportsTablet: true,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'com.yourcompany.yourapp',
    },
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'com.yourcompany.yourapp',
    },
    web: {
      bundler: 'metro',
      // 'single' = SPA export: one index.html + client routing, so edge serving
      // needs only a single 404→index.html fallback rule.
      output: 'single',
      favicon: './public/icons/icon-192.png',
    },
    extra: {
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-image-picker',
        {
          photosPermission: '樂淘需要讀取相簿，讓您挑選要上架的商品照片。',
          cameraPermission: '樂淘需要使用相機，讓您直接拍攝商品照片。',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            '樂淘需要您的位置，用來計算與面交地點的距離並排出附近的好物。',
        },
      ],
      ...nativePlugins,
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
