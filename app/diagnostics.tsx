import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { CircleAlert, CircleCheck, CircleHelp, RefreshCw } from 'lucide-react-native';

import MapView, { isMapRuntimeAvailable } from '@/components/MapView';
import type { LatLng } from '@/components/MapView.types';
import { SAGE } from '@/lib/constants';
import { TAIWAN_REGION_VIEW } from '@/lib/geo';
import {
  locationFailureMessage,
  readLocationPermission,
  readLocationServicesEnabled,
  requestUserLocation,
} from '@/lib/location';
import { useLetaoStore } from '@/lib/store';
import {
  type PickedPhoto,
  pickPhotosFromLibrary,
  runStorageRoundTrip,
  takePhotoWithCamera,
  uploadFailureMessage,
  uploadListingPhoto,
} from '@/lib/uploads';

type CheckState = 'ok' | 'fail' | 'unknown';

const RUNTIME_LABEL: Record<string, string> = {
  [ExecutionEnvironment.StoreClient]: 'Expo Go',
  [ExecutionEnvironment.Standalone]: '正式版 / TestFlight',
  [ExecutionEnvironment.Bare]: '開發版本 (dev build)',
};

function permissionLabel(status: string, granted: boolean): string {
  if (granted) return '已允許';
  if (status === 'denied') return '已拒絕';
  if (status === 'undetermined') return '尚未詢問';
  return status;
}

export default function DiagnosticsScreen() {
  const userId = useLetaoStore((state) => state.userId);

  const [locationServices, setLocationServices] = useState<CheckState>('unknown');
  const [locationPermission, setLocationPermission] = useState('讀取中...');
  const [locationPermissionState, setLocationPermissionState] = useState<CheckState>('unknown');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [coordsNote, setCoordsNote] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [libraryPermission, setLibraryPermission] = useState('讀取中...');
  const [libraryState, setLibraryState] = useState<CheckState>('unknown');
  const [cameraPermission, setCameraPermission] = useState('讀取中...');
  const [cameraState, setCameraState] = useState<CheckState>('unknown');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const [uploadState, setUploadState] = useState<CheckState>('unknown');
  const [uploadNote, setUploadNote] = useState('尚未測試');
  const [isUploading, setIsUploading] = useState(false);

  const [tappedPoint, setTappedPoint] = useState<LatLng | null>(null);

  const mapAvailable = isMapRuntimeAvailable();
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const androidKeySet = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? '') !== '';
  const runtimeLabel =
    RUNTIME_LABEL[Constants.executionEnvironment] ?? Constants.executionEnvironment;

  const refreshPermissions = useCallback(async () => {
    const [services, location, library, camera] = await Promise.all([
      readLocationServicesEnabled(),
      readLocationPermission(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
    ]);

    setLocationServices(services ? 'ok' : 'fail');
    setLocationPermission(permissionLabel(location.status, location.granted));
    setLocationPermissionState(location.granted ? 'ok' : 'unknown');
    setLibraryPermission(permissionLabel(library.status, library.granted));
    setLibraryState(library.granted ? 'ok' : 'unknown');
    setCameraPermission(permissionLabel(camera.status, camera.granted));
    setCameraState(camera.granted ? 'ok' : 'unknown');
  }, []);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const locate = async () => {
    setIsLocating(true);
    const outcome = await requestUserLocation();
    setIsLocating(false);
    await refreshPermissions();

    if (!outcome.ok) {
      setCoords(null);
      setCoordsNote(locationFailureMessage(outcome.reason));
      setLocationPermissionState(outcome.reason === 'permission' ? 'fail' : 'unknown');
      return;
    }

    setCoords(outcome.coords);
    setCoordsNote(outcome.isApproximate ? '使用裝置最近一次記錄的位置' : '取得即時定位');
    setLocationPermissionState('ok');
  };

  const pick = async (source: 'library' | 'camera') => {
    setIsPicking(true);
    const result =
      source === 'library' ? await pickPhotosFromLibrary(1) : await takePhotoWithCamera();
    setIsPicking(false);
    await refreshPermissions();

    if (!result.ok) {
      setPhotoNote(result.reason === 'permission' ? '權限被拒絕' : '已取消選取');
      return;
    }

    const picked = result.photos[0];
    if (!picked) {
      setPhotoNote('沒有取得相片');
      return;
    }

    setPhoto(picked);
    setPhotoNote(
      picked.byteLength === 0
        ? '裝置無法在本機壓縮，將以原檔上傳'
        : `已壓縮為 ${picked.width}×${picked.height}，約 ${Math.round(picked.byteLength / 1024)} KB`,
    );
  };

  const testUpload = async () => {
    if (!userId) return;
    setIsUploading(true);

    if (photo) {
      const outcome = await uploadListingPhoto(userId, photo, 0);
      setIsUploading(false);
      setUploadState(outcome.ok ? 'ok' : 'fail');
      setUploadNote(
        outcome.ok ? '相片上傳成功（已存進雲端）' : uploadFailureMessage(outcome.reason),
      );
      return;
    }

    const outcome = await runStorageRoundTrip(userId);
    setIsUploading(false);
    setUploadState(outcome.ok ? 'ok' : 'fail');
    setUploadNote(outcome.detail);
  };

  return (
    <ScrollView
      className="bg-canvas flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
    >
      <Stack.Screen options={{ title: '裝置檢查' }} />

      <Section title="執行環境">
        <Row label="平台" value={`${Platform.OS} ${String(Platform.Version)}`} state="ok" />
        <Row label="執行方式" value={runtimeLabel} state="ok" />
        <Row
          label="Android 地圖金鑰"
          value={
            Platform.OS !== 'android'
              ? '此平台不需要'
              : isExpoGo
                ? 'Expo Go 內建金鑰'
                : androidKeySet
                  ? '已設定'
                  : '未設定（地圖會空白）'
          }
          state={Platform.OS !== 'android' || isExpoGo ? 'ok' : androidKeySet ? 'ok' : 'fail'}
        />
      </Section>

      <Section title="地圖">
        <Row
          label="原生地圖模組"
          value={mapAvailable ? '可以顯示地圖' : '這個版本沒有地圖模組'}
          state={mapAvailable ? 'ok' : 'fail'}
        />
        <Row
          label="點擊測試"
          value={
            tappedPoint
              ? `${tappedPoint.latitude.toFixed(4)}, ${tappedPoint.longitude.toFixed(4)}`
              : '在下方地圖點一下'
          }
          state={tappedPoint ? 'ok' : 'unknown'}
        />
        <View className="mt-2 overflow-hidden rounded-xl border border-neutral-200">
          <MapView
            style={{ height: 190 }}
            initialRegion={
              coords ? { ...coords, latitudeDelta: 0.09, longitudeDelta: 0.09 } : TAIWAN_REGION_VIEW
            }
            markers={
              tappedPoint
                ? [{ id: 'tap', coordinate: tappedPoint, title: '測試標記', color: SAGE }]
                : []
            }
            showsUserLocation={coords !== null && Platform.OS !== 'web'}
            onPress={(event) => setTappedPoint(event.coordinate)}
          />
        </View>
        <Text className="text-muted mt-1.5 text-[11px] leading-4">
          地圖要能拖曳、縮放，並在點擊處放上標記。標記沒出現代表手勢事件沒傳到原生地圖。
        </Text>
      </Section>

      <Section title="定位">
        <Row
          label="定位服務"
          value={
            locationServices === 'ok'
              ? '已開啟'
              : locationServices === 'fail'
                ? '已關閉'
                : '讀取中...'
          }
          state={locationServices}
        />
        <Row label="App 定位權限" value={locationPermission} state={locationPermissionState} />
        <Row
          label="目前座標"
          value={
            coords
              ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
              : (coordsNote ?? '尚未取得')
          }
          state={coords ? 'ok' : coordsNote ? 'fail' : 'unknown'}
        />
        {coords && coordsNote ? (
          <Text className="text-muted mt-1 text-[11px]">{coordsNote}</Text>
        ) : null}
        <Button
          size="sm"
          className="mt-2.5"
          isDisabled={isLocating}
          onPress={() => {
            void locate();
          }}
        >
          <Button.Label>{isLocating ? '定位中...' : '要求定位並取得座標'}</Button.Label>
        </Button>
      </Section>

      <Section title="相片與相機">
        <Row label="相簿權限" value={libraryPermission} state={libraryState} />
        <Row label="相機權限" value={cameraPermission} state={cameraState} />
        <Row
          label="最近一次選取"
          value={photoNote ?? '尚未測試'}
          state={photo ? 'ok' : 'unknown'}
        />
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            style={{ width: 96, height: 96, borderRadius: 12, marginTop: 8 }}
            resizeMode="cover"
          />
        ) : null}
        <View className="mt-2.5 flex-row gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            isDisabled={isPicking}
            onPress={() => {
              void pick('library');
            }}
          >
            <Button.Label>選相簿照片</Button.Label>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            isDisabled={isPicking}
            onPress={() => {
              void pick('camera');
            }}
          >
            <Button.Label>用相機拍一張</Button.Label>
          </Button>
        </View>
      </Section>

      <Section title="雲端上傳">
        <Row label="上傳測試" value={uploadNote} state={uploadState} />
        <Text className="text-muted mt-1 text-[11px] leading-4">
          {photo
            ? '會把上面那張相片實際上傳到雲端儲存。'
            : '沒有選相片時，會上傳一張 1×1 測試圖並立刻刪除。'}
        </Text>
        <Button
          size="sm"
          className="mt-2.5"
          isDisabled={isUploading || !userId}
          onPress={() => {
            void testUpload();
          }}
        >
          <Button.Label>
            {!userId ? '需要先註冊帳號' : isUploading ? '上傳中...' : '執行上傳測試'}
          </Button.Label>
        </Button>
      </Section>

      <Button
        variant="tertiary"
        onPress={() => {
          void refreshPermissions();
        }}
      >
        <RefreshCw size={14} color={SAGE} strokeWidth={2.2} />
        <Button.Label>重新讀取權限狀態</Button.Label>
      </Button>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-background rounded-2xl border border-neutral-200 p-4">
      <Text className="text-foreground text-[13px] font-bold">{title}</Text>
      <View className="mt-2.5">{children}</View>
    </View>
  );
}

function Row({ label, value, state }: { label: string; value: string; state: CheckState }) {
  return (
    <View className="flex-row items-start gap-2 py-1">
      <View className="mt-0.5">
        {state === 'ok' ? (
          <CircleCheck size={14} color={SAGE} strokeWidth={2.2} />
        ) : state === 'fail' ? (
          <CircleAlert size={14} color="#DC2626" strokeWidth={2.2} />
        ) : (
          <CircleHelp size={14} color="#9CA3AF" strokeWidth={2.2} />
        )}
      </View>
      <Text className="text-muted w-28 text-[12px]">{label}</Text>
      <Text className="text-foreground flex-1 text-[12px] font-semibold">{value}</Text>
    </View>
  );
}
