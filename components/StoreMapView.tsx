import { Modal, View } from 'react-native';

import { Button } from 'heroui-native';

import { Text } from '@/components/ui/primitives/Text';
import { WebView } from '@/components/ui/primitives/WebView';
import { type EcpayMapForm, storeSelectionFormHtml } from '@/lib/ecpay';

/**
 * 綠界門市電子地圖（`/Express/map`）只吃 POST，而且綠界明文禁止放在 iframe 裡，
 * 所以原生端用 WebView 載入一張自動送出的表單。選完門市後綠界會 POST 回
 * `ecpay-callback?type=map`，那頁再導向 App scheme，我們攔下來關閉 WebView。
 * Web 版另有一份 StoreMapView.web.tsx（彈出視窗，iframe 一樣不能用）。
 */

/** callback 成功頁會導到這個 scheme，攔到就代表門市已選好。 */
const APP_SCHEME_PREFIX = 'ecoswap://';

export type StoreMapViewProps = {
  form: EcpayMapForm;
  onDismiss: () => void;
};

export function StoreMapView({ form, onDismiss }: StoreMapViewProps) {
  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss}>
      <View className="bg-background pt-safe flex-1">
        <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-3">
          <View className="flex-1 pr-3">
            <Text className="text-foreground text-base font-bold">選擇取貨門市</Text>
            <Text className="text-muted text-2xs mt-0.5">畫面由綠界提供，選好門市會自動返回</Text>
          </View>
          <Button size="sm" variant="secondary" onPress={onDismiss}>
            <Button.Label>關閉</Button.Label>
          </Button>
        </View>

        <WebView
          className="flex-1"
          originWhitelist={['*']}
          source={{ html: storeSelectionFormHtml(form), baseUrl: new URL(form.url).origin }}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith(APP_SCHEME_PREFIX)) {
              onDismiss();
              return false;
            }
            return true;
          }}
        />
      </View>
    </Modal>
  );
}
