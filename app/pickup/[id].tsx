import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PackageSearch, Store, UserPlus } from 'lucide-react-native';

import { CvsStoreSummary } from '@/components/CvsStoreSummary';
import { StoreMapView } from '@/components/StoreMapView';
import { Text, TextInput } from '@/components/ui/primitives/Text';
import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import {
  type EcpayConfig,
  ECPAY_DISABLED,
  type EcpayMapForm,
  type EcpayStoreSelection,
  type EcpaySubType,
  attachStoreToOrder,
  beginStoreSelection,
  ecpayFailureMessage,
  ecpaySubTypeFor,
  fetchEcpayConfig,
  fetchStoreSelection,
  isValidCellphone,
  isValidEcpayName,
  subTypeInfo,
} from '@/lib/ecpay';
import { screenContent } from '@/lib/layout';
import { goBackOrReplace } from '@/lib/navigation';
import { useOrderStore } from '@/lib/orderStore';
import { useAppStore } from '@/lib/store';

/** 選店結果由綠界 POST 回 callback，App 這端只能輪詢。 */
const SELECTION_POLL_MS = 3000;

export default function PickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id ?? '';

  const userId = useAppStore((state) => state.userId);
  const username = useAppStore((state) => state.username);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.load);

  const [config, setConfig] = useState<EcpayConfig>(ECPAY_DISABLED);
  const [mapForm, setMapForm] = useState<EcpayMapForm | null>(null);
  /**
   * 選店工作階段的 token 與地圖畫面分開存：使用者可能先關掉地圖再回來，
   * 或在 Web 的彈出視窗裡選完店，這時仍要繼續輪詢綠界寫回來的結果。
   */
  const [token, setToken] = useState<string | null>(null);
  const [selection, setSelection] = useState<EcpayStoreSelection | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const order = useMemo(
    () => orders.find((item) => item.id === orderId) ?? null,
    [orders, orderId],
  );

  const subType: EcpaySubType | null = useMemo(() => {
    if (order === null) return null;
    return ecpaySubTypeFor(order.logistics);
  }, [order]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || orderId === '') return;
      void loadOrders(userId);
    }, [userId, orderId, loadOrders]),
  );

  useEffect(() => {
    let isActive = true;
    void fetchEcpayConfig().then((next) => {
      if (isActive) setConfig(next);
    });
    return () => {
      isActive = false;
    };
  }, []);

  // 進畫面時先用暱稱與訂單既有資料填好收件人，姓名不合綠界規則就留空讓使用者重填。
  useEffect(() => {
    if (order === null) return;
    setReceiverName((current) => {
      if (current !== '') return current;
      if (order.receiver_name !== null) return order.receiver_name;
      return username !== null && isValidEcpayName(username) ? username : '';
    });
    setReceiverPhone((current) => (current !== '' ? current : (order.receiver_cellphone ?? '')));
    setReceiverEmail((current) => (current !== '' ? current : (order.receiver_email ?? '')));
  }, [order, username]);

  // 選店工作階段開著時輪詢，直到綠界把門市寫回來或連結逾時。
  const isWaiting = token !== null && selection?.status !== 'selected';

  useEffect(() => {
    if (token === null || !isWaiting) return undefined;

    let isActive = true;
    const poll = async () => {
      const next = await fetchStoreSelection(token);
      if (!isActive || next === null) return;
      setSelection(next);
      if (next.status === 'selected') {
        setMapForm(null);
      }
      if (next.status === 'expired') {
        setMapForm(null);
        setToken(null);
        showAlert({
          title: '選店連結已逾時',
          message: '選店連結只有 30 分鐘有效，請重新選一次取貨門市。',
        });
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, SELECTION_POLL_MS);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [token, isWaiting]);

  const openMap = async () => {
    if (subType === null) return;

    setIsBusy(true);
    const result = await beginStoreSelection(subType, orderId);
    setIsBusy(false);

    if (!result.ok) {
      showAlert({
        title: '沒辦法開啟選店',
        tone: 'danger',
        message: ecpayFailureMessage(result.reason),
      });
      return;
    }

    setSelection(null);
    setToken(result.form.token);
    setMapForm(result.form);
  };

  const handleSave = async () => {
    if (selection === null || selection.status !== 'selected' || selection.storeId === null) {
      showAlert({
        title: '請先選取貨門市',
        tone: 'danger',
        message: '需要先在綠界的電子地圖選一間門市，才能填收件資料。',
      });
      return;
    }
    if (!isValidEcpayName(receiverName)) {
      showAlert({
        title: '收件人姓名不符規則',
        tone: 'danger',
        message: '請填 2 至 5 個中文字（或 4 至 10 個英文字），且不可含數字與符號。',
      });
      return;
    }
    if (!isValidCellphone(receiverPhone)) {
      showAlert({
        title: '手機號碼不正確',
        tone: 'danger',
        message: '請填 09 開頭的 10 碼數字，超商會用它通知你取貨。',
      });
      return;
    }

    setIsBusy(true);
    const result = await attachStoreToOrder(orderId, selection.token, {
      name: receiverName,
      cellphone: receiverPhone,
      email: receiverEmail.trim() === '' ? null : receiverEmail.trim(),
    });
    setIsBusy(false);

    if (!result.ok) {
      showAlert({
        title: '沒有儲存成功',
        tone: 'danger',
        message: ecpayFailureMessage(result.reason),
      });
      return;
    }

    if (userId) await loadOrders(userId);
    showAlert({
      title: '取貨資料已送出',
      tone: 'success',
      message: '賣家會看到你的取貨門市，建立物流單並寄件後你會收到通知。',
      onConfirm: () => goBackOrReplace({ pathname: '/order/[id]', params: { id: orderId } }),
    });
  };

  if (!userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={screenContent}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ title: '選擇取貨門市' }} />
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={30} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">需要先登入</Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊 / 登入</Button.Label>
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (order === null || subType === null || order.buyer_id !== userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={screenContent}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ title: '選擇取貨門市' }} />
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <PackageSearch size={30} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">這筆交易不用選門市</Text>
          <Text className="text-muted mt-2 text-center text-sm leading-5">
            只有由買家本人、且運送方式是超商店到店的進行中交易才需要選取貨門市。
          </Text>
          <Button className="mt-4" variant="secondary" onPress={() => goBackOrReplace('/orders')}>
            <Button.Label>回到我的交易</Button.Label>
          </Button>
        </View>
      </ScrollView>
    );
  }

  const info = subTypeInfo(subType);
  const isSupported = config.isEnabled && config.enabledSubTypes.includes(subType) && !info.retired;
  const isSelected = selection?.status === 'selected' && selection.storeId !== null;

  return (
    <KeyboardAvoidingView
      className="bg-canvas flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: '選擇取貨門市' }} />

      <ScrollView
        contentContainerStyle={screenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background rounded-2xl border border-neutral-200 p-4">
          <Text numberOfLines={2} className="text-foreground text-base font-bold">
            {order.listing_title}
          </Text>
          <Text className="text-foreground mt-1 text-sm font-semibold">
            {info.label} ∙ 代收 NT${' '}
            {(order.offer_price * order.quantity + order.shipping_fee).toLocaleString('en-US')}
          </Text>
          <Text className="text-muted text-2xs mt-1 leading-4">
            到門市取貨時付款，取件後綠界才會把款項撥給賣家。
          </Text>
        </View>

        {isSupported ? null : (
          <View className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <Text className="text-xs font-bold text-orange-700">這個通路目前無法選店</Text>
            <Text className="text-2xs mt-1 leading-4 text-orange-700">
              {info.retired
                ? info.note
                : '平台尚未開通這家超商的取貨付款，請在私訊中與賣家改約其他方式。'}
            </Text>
          </View>
        )}

        <View className="bg-background mt-3 rounded-2xl border border-neutral-200 p-4">
          <View className="flex-row items-center gap-1.5">
            <Store size={14} color={SAGE} strokeWidth={2.2} />
            <Text className="text-foreground text-xs font-bold">步驟 1 ∙ 取貨門市</Text>
          </View>

          {isSelected && selection !== null && selection.storeId !== null ? (
            <View className="mt-3">
              <CvsStoreSummary
                subType={selection.subType}
                storeId={selection.storeId}
                storeName={selection.storeName}
                storeAddress={selection.storeAddress}
                storeTelephone={selection.storeTelephone}
                isOutlying={selection.isOutlying}
              />
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 self-start"
                isDisabled={isBusy || !isSupported}
                onPress={() => {
                  void openMap();
                }}
              >
                <Button.Label>換一間門市</Button.Label>
              </Button>
            </View>
          ) : (
            <>
              <Text className="text-muted text-2xs mt-2 leading-4">
                {order.cvs_store_name === null
                  ? '選店畫面由綠界提供，選好後會自動帶回門市名稱與地址。'
                  : `目前訂單上的門市是「${order.cvs_store_name}」，重新選一次就會覆蓋掉。`}
              </Text>
              <Button
                className="mt-3"
                isDisabled={isBusy || !isSupported}
                onPress={() => {
                  void openMap();
                }}
              >
                <Button.Label>{isWaiting ? '等待選店結果...' : '開啟綠界電子地圖'}</Button.Label>
              </Button>
              {isWaiting ? (
                <Text className="text-muted text-2xs mt-2 leading-4">
                  選好門市後回到這個畫面就會自動更新，若已關掉選店視窗可以再開一次。
                </Text>
              ) : null}
            </>
          )}

          {mapForm === null ? null : (
            <StoreMapView form={mapForm} onDismiss={() => setMapForm(null)} />
          )}
        </View>

        <View className="bg-background mt-3 rounded-2xl border border-neutral-200 p-4">
          <Text className="text-foreground text-xs font-bold">步驟 2 ∙ 收件人資料</Text>
          <Text className="text-muted text-2xs mt-1 leading-4">
            超商會用這組姓名與手機通知取貨，請填實際到店取件的人。
          </Text>

          <Text className="text-foreground mt-4 text-sm font-semibold">收件人姓名</Text>
          <TextInput
            value={receiverName}
            onChangeText={setReceiverName}
            maxLength={10}
            editable={!isBusy}
            placeholder="2 至 5 個中文字"
            placeholderTextColorClassName="accent-neutral-400"
            className="bg-background text-foreground mt-2 min-h-11 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
          />

          <Text className="text-foreground mt-4 text-sm font-semibold">收件人手機</Text>
          <TextInput
            value={receiverPhone}
            onChangeText={setReceiverPhone}
            keyboardType="number-pad"
            maxLength={10}
            editable={!isBusy}
            placeholder="09 開頭 10 碼"
            placeholderTextColorClassName="accent-neutral-400"
            className="bg-background text-foreground mt-2 min-h-11 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
          />

          <Text className="text-foreground mt-4 text-sm font-semibold">Email（選填）</Text>
          <TextInput
            value={receiverEmail}
            onChangeText={setReceiverEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={50}
            editable={!isBusy}
            placeholder="想收綠界的貨態信件時再填"
            placeholderTextColorClassName="accent-neutral-400"
            className="bg-background text-foreground mt-2 min-h-11 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
          />
        </View>

        <Button
          className="mt-5"
          isDisabled={isBusy || !isSelected}
          onPress={() => {
            void handleSave();
          }}
        >
          <Button.Label>{isBusy ? '處理中...' : '儲存取貨資料'}</Button.Label>
        </Button>
        <Text className="text-muted text-2xs mt-2 text-center leading-4">
          儲存後賣家才能建立物流單。門市選錯可以在賣家寄件前隨時改。
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
