import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Switch } from 'heroui-native';
import { BellRing } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import { showAlert } from '@/lib/alert';
import {
  type PushMode,
  type PushPermission,
  disablePush,
  enablePush,
  getPushPermission,
  getPushPreference,
  pushMode,
} from '@/lib/push';

function describe(mode: PushMode, enabled: boolean, permission: PushPermission): string {
  if (mode === 'unsupported') {
    return '這個環境不支援系統通知，請直接在通知中心查看訊息。';
  }
  if (!enabled) {
    return permission === 'denied'
      ? '已被系統封鎖。請到裝置的通知設定允許易拍通傳送通知，再回來開啟。'
      : '關閉中。訊息仍會留在通知中心，只是不會主動提醒您。';
  }
  if (mode === 'remote') {
    return '已開啟。收到私訊、出價、交易變更、審核結果與客服回覆時，會立刻推播到這台裝置。';
  }
  return '已開啟。這個環境（Expo Go、模擬器或網頁）只能在易拍通開啟時提醒；安裝正式版或開發版後才會有背景推播。';
}

/** Per-device push switch. Registering also asks for the system notification permission. */
export function PushToggle() {
  const [mode, setMode] = useState<PushMode>('unsupported');
  const [permission, setPermission] = useState<PushPermission>('undetermined');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const sync = useCallback(async () => {
    const [nextPermission, preference] = await Promise.all([
      getPushPermission(),
      getPushPreference(),
    ]);
    setMode(pushMode());
    setPermission(nextPermission);
    setEnabled(preference !== 'off' && nextPermission === 'granted');
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  const onChange = useCallback(
    (next: boolean) => {
      if (busy) return;
      setBusy(true);

      void (async () => {
        if (!next) {
          await disablePush();
          await sync();
          setBusy(false);
          return;
        }

        const result = await enablePush();
        await sync();
        setBusy(false);

        if (result.ok) return;

        if (result.reason === 'denied') {
          showAlert({
            title: '需要通知權限',
            message:
              '系統目前不允許易拍通傳送通知。請到裝置的「設定 → 通知」允許易拍通，再回來開啟推播。',
          });
          return;
        }
        if (result.reason === 'unsupported') {
          showAlert({
            title: '此環境不支援推播',
            message: '目前的執行環境沒有系統通知功能，請改用通知中心查看訊息。',
          });
          return;
        }
        showAlert({
          title: '推播註冊失敗',
          message: '無法完成這台裝置的推播註冊，請稍後再試一次。訊息仍會出現在通知中心。',
        });
      })();
    },
    [busy, sync],
  );

  return (
    <View className="bg-background mb-2 rounded-2xl border border-neutral-200 p-3.5">
      <View className="flex-row items-center">
        <BellRing size={18} color={SAGE} strokeWidth={1.8} />
        <View className="ml-2.5 flex-1">
          <Text className="text-foreground text-[13px] font-bold">推播通知</Text>
          <Text className="text-muted mt-0.5 text-[11px]">所有新訊息都會主動提醒</Text>
        </View>
        <Switch
          isSelected={enabled}
          isDisabled={busy || mode === 'unsupported'}
          onSelectedChange={onChange}
        />
      </View>
      <Text className="text-muted mt-2 text-[11px] leading-4">
        {describe(mode, enabled, permission)}
      </Text>
    </View>
  );
}
