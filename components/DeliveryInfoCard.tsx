import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { MapPin, Store, UserRound } from 'lucide-react-native';

import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import type { Order } from '@/lib/orderStore';
import { type CarrierMeta, type StoreChoice, useShipmentStore } from '@/lib/shipments';

type DeliveryInfoCardProps = {
  order: Order;
  carrier: CarrierMeta;
  /** Only the buyer can edit, and only until a shipment exists. */
  canEdit: boolean;
  onSaved: () => void;
};

/** 收件資訊: who picks the parcel up, and where. */
export function DeliveryInfoCard({ order, carrier, canEdit, onSaved }: DeliveryInfoCardProps) {
  const saveDelivery = useShipmentStore((state) => state.saveDelivery);
  const pickStore = useShipmentStore((state) => state.pickStore);

  const [name, setName] = useState(order.recipient_name ?? '');
  const [phone, setPhone] = useState(order.recipient_phone ?? '');
  const [storeCode, setStoreCode] = useState(order.pickup_store_id ?? '');
  const [storeName, setStoreName] = useState(order.pickup_store_name ?? '');
  const [storeAddress, setStoreAddress] = useState(order.pickup_store_address ?? '');
  const [zip, setZip] = useState(order.ship_zip ?? '');
  const [address, setAddress] = useState(order.ship_address ?? '');
  const [isBusy, setIsBusy] = useState(false);
  const [testStores, setTestStores] = useState<StoreChoice[] | null>(null);

  const applyStore = (store: StoreChoice) => {
    setStoreCode(store.code);
    setStoreName(store.name ?? '');
    setStoreAddress(store.addr ?? '');
    setTestStores(null);
  };

  const handlePickStore = async () => {
    setIsBusy(true);
    const outcome = await pickStore(order.id, carrier.storeCate);
    setIsBusy(false);

    if (outcome.kind === 'store') {
      applyStore(outcome.store);
      showAlert({
        title: '門市已帶入',
        tone: 'success',
        message: `${outcome.store.name ?? outcome.store.code}。別忘了按下方「儲存收件資訊」。`,
      });
      return;
    }
    if (outcome.kind === 'options') {
      setTestStores(outcome.stores);
      return;
    }

    showAlert({
      title: '沒有取得門市',
      tone: 'danger',
      message:
        outcome.reason === 'timeout'
          ? '等太久了。請再按一次「選擇取件門市」重新開啟地圖。'
          : outcome.reason === 'unsupported'
            ? '這個寄送方式沒有電子地圖，請直接填寫門市名稱。'
            : '開啟門市地圖時發生問題，請稍後再試。',
    });
  };

  const handleSave = async () => {
    if (name.trim() === '' || phone.trim() === '') {
      showAlert({ title: '還差一點', message: '請填寫收件人姓名與手機號碼。' });
      return;
    }
    if (carrier.needsStore && storeCode.trim() === '' && storeName.trim() === '') {
      showAlert({ title: '還差一點', message: '請選擇或填寫取件門市。' });
      return;
    }
    if (carrier.needsAddress && address.trim() === '') {
      showAlert({ title: '還差一點', message: '請填寫收件地址。' });
      return;
    }

    setIsBusy(true);
    const ok = await saveDelivery(order.id, {
      recipientName: name,
      recipientPhone: phone,
      storeId: storeCode,
      storeName,
      storeAddress,
      zip,
      address,
    });
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: '沒有儲存成功',
        tone: 'danger',
        message: '賣家可能已經建立出貨單，或交易狀態已改變。重新整理後再看一次。',
      });
      return;
    }

    onSaved();
    showAlert({ title: '收件資訊已儲存', tone: 'success', message: '賣家可以開始建立出貨單了。' });
  };

  const filledLines = [
    name === '' ? null : `${name} ∙ ${phone}`,
    carrier.needsStore && storeName !== ''
      ? `${storeName}${storeCode === '' ? '' : ` (${storeCode})`}`
      : null,
    carrier.needsStore && storeAddress !== '' ? storeAddress : null,
    carrier.needsAddress && address !== '' ? `${zip === '' ? '' : `${zip} `}${address}` : null,
  ].filter((line): line is string => line !== null);

  return (
    <View className="bg-background mt-2.5 rounded-2xl border border-neutral-200 p-3.5">
      <View className="flex-row items-center gap-1.5">
        <UserRound size={14} color={SAGE} strokeWidth={2.2} />
        <Text className="text-foreground text-[12px] font-bold">收件資訊</Text>
      </View>

      {!canEdit ? (
        <View className="mt-2">
          {filledLines.length === 0 ? (
            <Text className="text-muted text-[11px] leading-4">買家還沒填寫收件資訊。</Text>
          ) : (
            filledLines.map((line) => (
              <Text key={line} className="text-foreground text-[12px] leading-5">
                {line}
              </Text>
            ))
          )}
        </View>
      ) : (
        <View className="mt-2.5">
          <View className="flex-row gap-2">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="收件人姓名"
              placeholderTextColorClassName="accent-neutral-400"
              accessibilityLabel="收件人姓名"
              className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="09xxxxxxxx"
              placeholderTextColorClassName="accent-neutral-400"
              accessibilityLabel="收件人手機"
              className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
            />
          </View>
          <Text className="text-muted mt-1.5 text-[10px] leading-4">
            超商取件通知簡訊會寄到這個號碼，請填 09 開頭的 10 碼手機。
          </Text>

          {carrier.needsStore ? (
            <View className="mt-3">
              {carrier.storeCate === null ? (
                <View className="flex-row gap-2">
                  <TextInput
                    value={storeName}
                    onChangeText={setStoreName}
                    placeholder="取件門市名稱"
                    placeholderTextColorClassName="accent-neutral-400"
                    accessibilityLabel="取件門市名稱"
                    className="bg-canvas text-foreground h-10 flex-[1.4] rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
                  />
                  <TextInput
                    value={storeCode}
                    onChangeText={setStoreCode}
                    placeholder="店號（選填）"
                    placeholderTextColorClassName="accent-neutral-400"
                    accessibilityLabel="取件門市店號"
                    className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
                  />
                </View>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={isBusy}
                    onPress={() => {
                      void handlePickStore();
                    }}
                  >
                    <Store size={13} color={SAGE} strokeWidth={2.2} />
                    <Button.Label>{isBusy ? '開啟中...' : '選擇取件門市'}</Button.Label>
                  </Button>
                  {storeName === '' ? (
                    <Text className="text-muted mt-1.5 text-[10px] leading-4">
                      會開啟 ezShip 電子地圖，選好門市後回到這裡就會自動帶入。
                    </Text>
                  ) : (
                    <View className="bg-canvas mt-2 rounded-xl px-3 py-2">
                      <Text className="text-foreground text-[12px] font-semibold">
                        {storeName} {storeCode === '' ? '' : `(${storeCode})`}
                      </Text>
                      {storeAddress === '' ? null : (
                        <Text className="text-muted mt-0.5 text-[11px] leading-4">
                          {storeAddress}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}

              {testStores === null ? null : (
                <View className="bg-canvas mt-2 rounded-xl p-2.5">
                  <Text className="text-foreground text-[11px] font-bold">
                    模擬模式：選一間測試門市
                  </Text>
                  <Text className="text-muted mt-0.5 text-[10px] leading-4">
                    正式模式會改為開啟 ezShip 電子地圖選擇真實門市。
                  </Text>
                  {testStores.map((store) => (
                    <Button
                      key={store.code}
                      size="sm"
                      variant="tertiary"
                      className="mt-1.5 self-start"
                      onPress={() => applyStore(store)}
                    >
                      <Button.Label>
                        {store.name ?? store.code} ({store.code})
                      </Button.Label>
                    </Button>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {carrier.needsAddress ? (
            <View className="mt-3">
              <View className="flex-row gap-2">
                <TextInput
                  value={zip}
                  onChangeText={setZip}
                  keyboardType="number-pad"
                  placeholder="郵遞區號"
                  placeholderTextColorClassName="accent-neutral-400"
                  accessibilityLabel="郵遞區號"
                  className="bg-canvas text-foreground h-10 w-24 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
                />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="收件地址"
                  placeholderTextColorClassName="accent-neutral-400"
                  accessibilityLabel="收件地址"
                  className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
                />
              </View>
              <View className="mt-1.5 flex-row items-start gap-1.5">
                <MapPin size={12} color={SAGE} strokeWidth={2.2} />
                <Text className="text-muted flex-1 text-[10px] leading-4">
                  宅配需要完整地址與郵遞區號，配送專員會用上面的手機號碼聯絡。
                </Text>
              </View>
            </View>
          ) : null}

          <Button
            size="sm"
            className="mt-3"
            isDisabled={isBusy}
            onPress={() => {
              void handleSave();
            }}
          >
            <Button.Label>{isBusy ? '儲存中...' : '儲存收件資訊'}</Button.Label>
          </Button>
        </View>
      )}
    </View>
  );
}
