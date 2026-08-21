import { View } from 'react-native';

import { Button } from 'heroui-native';
import { ExternalLink } from 'lucide-react-native';

import { Text } from '@/components/ui/primitives/Text';
import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import { type EcpayMapForm, storeSelectionFormHtml } from '@/lib/ecpay';

/**
 * Web 版的門市電子地圖。綠界禁止把 `/Express/map` 放在 iframe 裡，所以這裡開一個
 * 彈出視窗並在裡面送出表單。彈出視窗必須由使用者的點擊直接觸發（否則會被瀏覽器
 * 攔下來），所以這裡刻意不自動開啟，而是先顯示一顆按鈕。
 */

export type StoreMapViewProps = {
  form: EcpayMapForm;
  onDismiss: () => void;
};

export function StoreMapView({ form, onDismiss }: StoreMapViewProps) {
  const openMap = () => {
    const popup = window.open('', 'ecpay-store-map', 'width=520,height=760');
    if (!popup) {
      showAlert({
        title: '瀏覽器擋住了新視窗',
        tone: 'danger',
        message: '請允許本站開啟彈出視窗後再試一次，綠界的電子地圖無法內嵌顯示。',
      });
      return;
    }
    popup.document.write(storeSelectionFormHtml(form));
    popup.document.close();
  };

  return (
    <View className="bg-mint mt-3 rounded-xl p-4">
      <View className="flex-row items-center gap-1.5">
        <ExternalLink size={14} color={SAGE} strokeWidth={2.2} />
        <Text className="text-sage-deep text-xs font-bold">綠界電子地圖已準備好</Text>
      </View>
      <Text className="text-sage-deep text-2xs mt-1.5 leading-4">
        點下方按鈕會開啟綠界的選店視窗。選好門市後回到這個頁面，系統會自動帶回門市資料。
      </Text>
      <View className="mt-3 flex-row gap-2">
        <Button size="sm" className="flex-1" onPress={openMap}>
          <Button.Label>開啟選店視窗</Button.Label>
        </Button>
        <Button size="sm" variant="secondary" onPress={onDismiss}>
          <Button.Label>取消</Button.Label>
        </Button>
      </View>
    </View>
  );
}
