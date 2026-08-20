import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

// Brand artwork shared by native icons, the splash screen and the PWA manifest.
// Both files live in public/ so the same masters are served on web (manifest +
// favicon read them from the exported site root) and bundled for native.
const APP_ICON = './public/icons/app-icon.png';
// Emblem centred inside a white square with generous padding: required for the
// Android adaptive-icon safe zone (outer ~1/3 gets masked away) and reused as
// the splash artwork.
const APP_ICON_PADDED = './public/icons/app-icon-padded.png';
// White-on-transparent glyph. Android draws the notification icon as a
// silhouette, so a full-colour icon would render as a white square.
const NOTIFICATION_ICON = './assets/notification-icon.png';

const BRAND_GREEN = '#4C7C59';
const CANVAS = '#F8F9FA';

export default ({ config }: ConfigContext): ExpoConfig => {
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }]]
      : [];

  return {
    ...config,
    name: '易拍通',
    slug: 'ecoswap',
    newArchEnabled: true,
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    // The app locks Uniwind to the light theme, so keep native chrome (keyboards,
    // action sheets, system dialogs) light instead of following the OS setting.
    userInterfaceStyle: 'light',
    backgroundColor: CANVAS,
    primaryColor: BRAND_GREEN,
    icon: APP_ICON,
    scheme: 'ecoswap',
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Dark status bar text on the light canvas, matching <StatusBar style="dark" />.
        // React Native's StatusBar module only takes effect when the
        // view-controller-based appearance flag is off.
        UIStatusBarStyle: 'UIStatusBarStyleDarkContent',
        UIViewControllerBasedStatusBarAppearance: false,
        CFBundleAllowMixedLocalizations: true,
      },
      supportsTablet: true,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'com.yourcompany.yourapp',
    },
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'com.yourcompany.yourapp',
      // Legacy launcher icon for pre-Android 8 devices; 8+ uses adaptiveIcon.
      icon: APP_ICON,
      adaptiveIcon: {
        foregroundImage: APP_ICON_PADDED,
        // Themed (monochrome) launcher icons on Android 13+.
        monochromeImage: NOTIFICATION_ICON,
        backgroundColor: '#FFFFFF',
      },
      edgeToEdgeEnabled: true,
      // Only what the app actually uses: camera + gallery for listing photos and
      // notification delivery. Everything else stays out of the store listing.
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.VIBRATE',
      ],
      // expo-location / react-native-maps ship these in their manifests, but the
      // product has no location or map feature, so strip them from the merged
      // manifest to avoid a location-permission declaration at review time.
      blockedPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
      ],
    },
    androidStatusBar: {
      barStyle: 'dark-content',
      translucent: true,
    },
    androidNavigationBar: {
      barStyle: 'dark-content',
    },
    web: {
      bundler: 'metro',
      // 'single' = SPA export: one index.html + client routing, so edge serving
      // needs only a single 404→index.html fallback rule.
      output: 'single',
      favicon: APP_ICON,
    },
    extra: {
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: APP_ICON_PADDED,
          imageWidth: 240,
          resizeMode: 'contain',
          backgroundColor: '#FFFFFF',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: '易拍通需要讀取相簿，讓您挑選要上架的商品照片。',
          cameraPermission: '易拍通需要使用相機，讓您直接拍攝商品照片。',
        },
      ],
      [
        'expo-notifications',
        {
          icon: NOTIFICATION_ICON,
          color: BRAND_GREEN,
          defaultChannel: 'default',
          // aps-environment entitlement. Remote pushes only exist in published
          // builds (dev/Expo Go fall back to local alerts in lib/push.ts), so the
          // production APNs environment is the one that has to be correct.
          mode: 'production',
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
