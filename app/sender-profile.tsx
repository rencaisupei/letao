import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { PackageCheck, UserPlus } from 'lucide-react-native';

import { StoreMapView } from '@/components/StoreMapView';
import { Text, TextInput } from '@/components/ui/primitives/Text';
import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import {
  ECPAY_SUB_TYPES,
  type EcpayMapForm,
  beginStoreSelection,
  ecpayFailureMessage,
  fetchSenderProfile,
  fetchStoreSelection,
  isValidCellphone,
  isValidEcpayName,
  isValidLandline,
  saveSenderProfile,
} from '@/lib/ecpay';
import { screenContent } from '@/lib/layout';
import { goBackOrReplace } from '@/lib/navigation';
import { useAppStore } from '@/lib/store';

const SELECTION_POLL_MS = 3000;

/** 退貨門市只有 7-ELEVEN 交貨便吃得到（ReturnStoreID）。 */
const RETURN_STORE_SUB_TYPE = 'UNIMARTC2C';

export default function SenderProfileScreen() {
  const userId = useAppStore((state) => state.userId);
  const username = useAppStore((state) => state.username);

  const [name, setName] = useState('');
  const [cellphone, setCellphone] = useState('');
  const [phone, setPhone] = useState('');
  const [returnStoreId, setReturnStoreId] = useState('');
  const [mapForm, setMapForm] = useState<EcpayMapForm | null>(null);
  /** 與地圖畫面分開存，關掉地圖後仍要繼續輪詢綠界寫回來的門市。 */
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const profile = await fetchSenderProfile(userId);
    if (profile !== null) {
      setName(profile.senderName);
      setCellphone(profile.senderCellphone);
      setPhone(profile.senderPhone ?? '');
      setReturnStoreId(profile.returnStoreId ?? '');
    } else if (username !== null && isValidEcpayName(username)) {
      setName((current) => (current === '' ? username : current));
    }
    setIsLoaded(true);
  }, [userId, username]);

  useFocusEffect(
    useCallback(() => {
      if (isLoaded) return;
      void load();
    }, [isLoaded, load]),
  );

  // 用電子地圖挑退貨門市，避免賣家得自己去查店號。
  useEffect(() => {
    if (token === null) return undefined;

    let isActive = true;
    const poll = async () => {
      const next = await fetchStoreSelection(token);
      if (!isActive || next === null) return;
      if (next.status === 'selected' && next.storeId !== null) {
        setReturnStoreId(next.storeId);
        setMapForm(null);
        setToken(null);
      }
      if (next.status === 'expired') {
        setMapForm(null);
        setToken(null);
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
  }, [token]);

  const pickReturnStore = async () => {
    setIsBusy(true);
    const result = await beginStoreSelection(RETURN_STORE_SUB_TYPE, null);
    setIsBusy(false);

    if (!result.ok) {
      showAlert({
        title: '沒辦法開啟選店',
        tone: 'danger',
        message: ecpayFailureMessage(result.reason),
      });
      return;
    }
    setToken(result.form.token);
    setMapForm(result.form);
  };

  const handleSave = async () => {
    if (!userId) return;

    if (!isValidEcpayName(name)) {
      showAlert({
        title: '寄件人姓名不符規則',
        tone: 'danger',
        message: '請填 2 至 5 個中文字（或 4 至 10 個英文字），且不可含數字與符號。',
      });
      return;
    }
    if (!isValidCellphone(cellphone)) {
      showAlert({
        title: '手機號碼不正確',
        tone: 'danger',
        message: '請填 09 開頭的 10 碼數字，超商會用它聯絡你。',
      });
      return;
    }
    if (!isValidLandline(phone)) {
      showAlert({
        title: '市話格式不正確',
        tone: 'danger',
        message: '市話只能填數字與 ( ) - # 符號，例如 02-27214234。',
      });
      return;
    }

    setIsBusy(true);
    const result = await saveSenderProfile(userId, {
      senderName: name,
      senderCellphone: cellphone,
      senderPhone: phone,
      returnStoreId: returnStoreId,
    });
    setIsBusy(false);

    if (!result.ok) {
      showAlert({ title: '沒有儲存成功', tone: 'danger', message: result.message });
      return;
    }

    showAlert({
      title: '寄件人資料已儲存',
      tone: 'success',
      message: '之後建立超商物流單時會自動帶入這組資料，不用每次重填。',
      onConfirm: () => goBackOrReplace('/(tabs)/profile'),
    });
  };

  if (!userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={screenContent}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ title: '寄件人資料' }} />
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

  return (
    <KeyboardAvoidingView
      className="bg-canvas flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: '寄件人資料' }} />

      <ScrollView
        contentContainerStyle={screenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background rounded-2xl border border-neutral-200 p-4">
          <View className="flex-row items-center gap-1.5">
            <PackageCheck size={14} color={SAGE} strokeWidth={2.2} />
            <Text className="text-foreground text-xs font-bold">超商店到店的寄件人</Text>
          </View>
          <Text className="text-muted text-2xs mt-2 leading-4">
            店到店的寄件人是賣家本人。這組資料會印在超商的服務單上，填一次就好，之後每筆物流單都會自動帶入。
          </Text>
        </View>

        <Text className="text-foreground mt-5 text-sm font-semibold">寄件人姓名</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={10}
          editable={!isBusy}
          placeholder="2 至 5 個中文字，需與證件相符"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 min-h-11 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
        />

        <Text className="text-foreground mt-4 text-sm font-semibold">寄件人手機</Text>
        <TextInput
          value={cellphone}
          onChangeText={setCellphone}
          keyboardType="number-pad"
          maxLength={10}
          editable={!isBusy}
          placeholder="09 開頭 10 碼"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 min-h-11 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
        />

        <Text className="text-foreground mt-4 text-sm font-semibold">市話（選填）</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          maxLength={20}
          editable={!isBusy}
          placeholder="例如 02-27214234"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 min-h-11 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
        />

        <Text className="text-foreground mt-4 text-sm font-semibold">退貨門市（選填）</Text>
        <Text className="text-muted text-2xs mt-1 leading-4">
          只有 {ECPAY_SUB_TYPES[0].label}{' '}
          支援指定退貨門市；留空的話買家未取的包裹會退回你原本的寄件門市。
        </Text>
        <TextInput
          value={returnStoreId}
          onChangeText={setReturnStoreId}
          keyboardType="number-pad"
          maxLength={10}
          editable={!isBusy}
          placeholder="門市店號，可用下方按鈕從地圖挑"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 min-h-11 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm"
        />
        <View className="mt-2 flex-row gap-2">
          <Button
            size="sm"
            variant="secondary"
            isDisabled={isBusy}
            onPress={() => {
              void pickReturnStore();
            }}
          >
            <Button.Label>{token === null ? '從地圖挑門市' : '等待選店結果...'}</Button.Label>
          </Button>
          {returnStoreId === '' ? null : (
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={isBusy}
              onPress={() => setReturnStoreId('')}
            >
              <Button.Label>清除</Button.Label>
            </Button>
          )}
        </View>

        {mapForm === null ? null : (
          <StoreMapView form={mapForm} onDismiss={() => setMapForm(null)} />
        )}

        <Button
          className="mt-6"
          isDisabled={isBusy}
          onPress={() => {
            void handleSave();
          }}
        >
          <Button.Label>{isBusy ? '處理中...' : '儲存寄件人資料'}</Button.Label>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
