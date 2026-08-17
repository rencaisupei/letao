import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { CircleAlert, CircleCheck, CircleHelp, RefreshCw } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import {
  type ModerationSelfTest,
  moderationErrorMessage,
  runModerationSelfTest,
} from '@/lib/queries';
import { type SelfTestResult, runShippingSelfTest } from '@/lib/shipping';
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

  const [moderation, setModeration] = useState<ModerationSelfTest | null>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);

  const [shippingTest, setShippingTest] = useState<SelfTestResult | null>(null);
  const [isTestingShipping, setIsTestingShipping] = useState(false);

  const runtimeLabel =
    RUNTIME_LABEL[Constants.executionEnvironment] ?? Constants.executionEnvironment;

  const refreshPermissions = useCallback(async () => {
    const [library, camera] = await Promise.all([
      ImagePicker.getMediaLibraryPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
    ]);

    setLibraryPermission(permissionLabel(library.status, library.granted));
    setLibraryState(library.granted ? 'ok' : 'unknown');
    setCameraPermission(permissionLabel(camera.status, camera.granted));
    setCameraState(camera.granted ? 'ok' : 'unknown');
  }, []);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

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

  const testModeration = async () => {
    if (!userId) return;
    setIsTestingAi(true);
    const outcome = await runModerationSelfTest();
    setIsTestingAi(false);
    setModeration(outcome);
  };

  const testShipping = async () => {
    if (!userId) return;
    setIsTestingShipping(true);
    const outcome = await runShippingSelfTest();
    setIsTestingShipping(false);
    setShippingTest(outcome);
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

      <Section title="AI 內容審核">
        <Row
          label="語意審核"
          value={
            moderation === null
              ? '尚未測試'
              : moderation.ok
                ? `已啟用（${moderation.model ?? 'OpenAI'}，${moderation.latencyMs ?? 0} ms）`
                : moderationErrorMessage(moderation.error)
          }
          state={moderation === null ? 'unknown' : moderation.ok ? 'ok' : 'fail'}
        />
        <Row
          label="關鍵字規則"
          value={moderation?.ruleTokens ? `${moderation.ruleTokens} 組關鍵字` : '送出測試後顯示'}
          state={moderation?.ruleTokens ? 'ok' : 'unknown'}
        />
        <Text className="text-muted mt-1 text-[11px] leading-4">
          測試會用一件合規的範例商品呼叫審核服務，不會影響你的任何商品。
        </Text>
        <Button
          size="sm"
          className="mt-2.5"
          isDisabled={isTestingAi || !userId}
          onPress={() => {
            void testModeration();
          }}
        >
          <Button.Label>
            {!userId ? '需要先註冊帳號' : isTestingAi ? '測試中...' : '測試 AI 審核'}
          </Button.Label>
        </Button>
      </Section>

      <Section title="運費試算引擎">
        <Row
          label="費率表"
          value={
            shippingTest === null
              ? '尚未測試'
              : shippingTest.rateTableOk
                ? `正常（範例：黑貓 2.5kg / 40×30×20 台北→高雄 = NT$ ${shippingTest.sampleFee ?? 0}）`
                : '無法取得費率，請稍後再試'
          }
          state={shippingTest === null ? 'unknown' : shippingTest.rateTableOk ? 'ok' : 'fail'}
        />
        <Row
          label="級距"
          value={shippingTest?.sampleTier ?? '送出測試後顯示'}
          state={shippingTest?.sampleTier ? 'ok' : 'unknown'}
        />
        <Row
          label="Lalamove 報價"
          value={
            shippingTest === null
              ? '尚未測試'
              : shippingTest.lalamoveConfigured
                ? `已設定金鑰（${shippingTest.lalamoveEnv ?? 'sandbox'}）`
                : '未設定金鑰，改用車資估算'
          }
          state={
            shippingTest === null ? 'unknown' : shippingTest.lalamoveConfigured ? 'ok' : 'unknown'
          }
        />
        <Text className="text-muted mt-1 text-[11px] leading-4">
          超商店到店與黑貓宅急便的運費由費率表計算（重量、材積、離島／偏遠加價）。Lalamove
          目前為估算，補上 LALAMOVE_API_KEY 與 LALAMOVE_API_SECRET 後才會改抓即時車資。
        </Text>
        <Button
          size="sm"
          className="mt-2.5"
          isDisabled={isTestingShipping || !userId}
          onPress={() => {
            void testShipping();
          }}
        >
          <Button.Label>
            {!userId ? '需要先註冊帳號' : isTestingShipping ? '測試中...' : '測試運費試算'}
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
