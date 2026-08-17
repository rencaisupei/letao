import { useState } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { AlertTriangle, PackageCheck, Printer, RefreshCw, Truck } from 'lucide-react-native';

import { ShipmentTimeline } from '@/components/ShipmentTimeline';
import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import type { Order } from '@/lib/orderStore';
import {
  type CarrierMeta,
  SHIPMENT_STATUS_META,
  type Shipment,
  type ShipmentEvent,
  openShipmentMessage,
  useShipmentStore,
} from '@/lib/shipments';

type ShipmentCardProps = {
  order: Order;
  shipment: Shipment | null;
  events: ShipmentEvent[];
  isSeller: boolean;
  carrier: CarrierMeta;
  onChanged: () => void;
};

/** 出貨單: label creation, tracking number, status moves and the timeline. */
export function ShipmentCard({
  order,
  shipment,
  events,
  isSeller,
  carrier,
  onChanged,
}: ShipmentCardProps) {
  const openShipment = useShipmentStore((state) => state.openShipment);
  const requestLabel = useShipmentStore((state) => state.requestLabel);
  const syncTracking = useShipmentStore((state) => state.syncTracking);
  const saveManualTracking = useShipmentStore((state) => state.saveManualTracking);
  const advanceStatus = useShipmentStore((state) => state.advanceStatus);
  const cancelShipment = useShipmentStore((state) => state.cancelShipment);

  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderZip, setSenderZip] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [trackingDraft, setTrackingDraft] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleOpen = async () => {
    setIsBusy(true);
    const result = await openShipment(order.id, {
      name: senderName,
      phone: senderPhone,
      zip: senderZip,
      address: senderAddress,
    });

    if (!result.ok) {
      setIsBusy(false);
      showAlert({
        title: '還不能建立出貨單',
        tone: 'danger',
        message: openShipmentMessage(result.reason),
      });
      return;
    }

    if (carrier.provider === 'ezship') {
      const label = await requestLabel(result.shipmentId, order.id);
      setIsBusy(false);
      onChanged();
      showAlert({
        title: label.ok ? '出貨單已建立' : '出貨單已建立，但取號失敗',
        tone: label.ok ? 'success' : 'danger',
        message: label.message,
      });
      return;
    }

    setIsBusy(false);
    onChanged();
    showAlert({
      title: '出貨單已建立',
      tone: 'success',
      message: '這個寄送方式需要您自行取號，取得寄貨編號後填入即可讓買家追蹤。',
    });
  };

  const handleLabel = async () => {
    if (!shipment) return;
    setIsBusy(true);
    const result = await requestLabel(shipment.id, order.id);
    setIsBusy(false);
    onChanged();
    showAlert({
      title: result.ok ? '已取得寄貨編號' : '取號沒有成功',
      tone: result.ok ? 'success' : 'danger',
      message: result.message,
    });
  };

  const handleSync = async () => {
    if (!shipment) return;
    setIsBusy(true);
    const result = await syncTracking(shipment.id, order.id);
    setIsBusy(false);
    onChanged();
    showAlert({
      title: result.ok ? '已向 ezShip 查詢' : '查詢沒有成功',
      tone: result.ok ? 'default' : 'danger',
      message: result.message,
    });
  };

  const handleManualTracking = async () => {
    if (!shipment) return;
    if (trackingDraft.trim() === '') {
      showAlert({ title: '還差一點', message: '請填入物流商給的寄貨編號或託運單號。' });
      return;
    }
    setIsBusy(true);
    const ok = await saveManualTracking(shipment.id, order.id, trackingDraft);
    setIsBusy(false);
    onChanged();
    showAlert({
      title: ok ? '編號已儲存' : '沒有儲存成功',
      tone: ok ? 'success' : 'danger',
      message: ok ? '買家已收到通知，可以開始追蹤了。' : '這張出貨單的狀態已改變，請重新整理。',
    });
  };

  const handleAdvance = async (status: 'in_transit' | 'arrived' | 'delivered', detail: string) => {
    if (!shipment) return;
    setIsBusy(true);
    const ok = await advanceStatus(shipment.id, order.id, status, detail);
    setIsBusy(false);
    onChanged();
    if (!ok) {
      showAlert({
        title: '沒有更新成功',
        tone: 'danger',
        message: '這張出貨單可能已被對方更新，請重新整理後再試。',
      });
    }
  };

  const handleCancel = async () => {
    if (!shipment) return;
    setIsBusy(true);
    const ok = await cancelShipment(shipment.id, order.id);
    setIsBusy(false);
    onChanged();
    showAlert({
      title: ok ? '出貨單已作廢' : '沒有作廢成功',
      tone: ok ? 'default' : 'danger',
      message: ok ? '可以重新建立一張新的出貨單。' : '已寄出的出貨單不能作廢。',
    });
  };

  if (carrier.provider === 'none') {
    return (
      <View className="bg-background mt-2.5 rounded-2xl border border-neutral-200 p-3.5">
        <View className="flex-row items-center gap-1.5">
          <Truck size={14} color={SAGE} strokeWidth={2.2} />
          <Text className="text-foreground text-[12px] font-bold">出貨與追蹤</Text>
        </View>
        <Text className="text-muted mt-2 text-[11px] leading-4">{carrier.note}</Text>
      </View>
    );
  }

  if (!shipment) {
    return (
      <View className="bg-background mt-2.5 rounded-2xl border border-neutral-200 p-3.5">
        <View className="flex-row items-center gap-1.5">
          <Truck size={14} color={SAGE} strokeWidth={2.2} />
          <Text className="text-foreground text-[12px] font-bold">出貨單</Text>
        </View>
        <Text className="text-muted mt-2 text-[11px] leading-4">{carrier.note}</Text>

        {!isSeller ? (
          <Text className="text-muted mt-2 text-[11px] leading-4">
            填好收件資訊後，等賣家建立出貨單並取得寄貨編號，這裡就會出現配送進度。
          </Text>
        ) : order.status !== 'pending' ? (
          <Text className="text-muted mt-2 text-[11px] leading-4">
            這筆交易已結束，不能再建立出貨單。
          </Text>
        ) : (
          <View className="mt-3">
            <Text className="text-foreground text-[11px] font-bold">寄件人資訊</Text>
            <View className="mt-2 flex-row gap-2">
              <TextInput
                value={senderName}
                onChangeText={setSenderName}
                placeholder="寄件人姓名"
                placeholderTextColorClassName="accent-neutral-400"
                accessibilityLabel="寄件人姓名"
                className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
              />
              <TextInput
                value={senderPhone}
                onChangeText={setSenderPhone}
                keyboardType="phone-pad"
                placeholder="聯絡電話"
                placeholderTextColorClassName="accent-neutral-400"
                accessibilityLabel="寄件人電話"
                className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
              />
            </View>

            {carrier.needsAddress ? (
              <View className="mt-2 flex-row gap-2">
                <TextInput
                  value={senderZip}
                  onChangeText={setSenderZip}
                  keyboardType="number-pad"
                  placeholder="郵遞區號"
                  placeholderTextColorClassName="accent-neutral-400"
                  accessibilityLabel="寄件人郵遞區號"
                  className="bg-canvas text-foreground h-10 w-24 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
                />
                <TextInput
                  value={senderAddress}
                  onChangeText={setSenderAddress}
                  placeholder="取件地址"
                  placeholderTextColorClassName="accent-neutral-400"
                  accessibilityLabel="寄件人地址"
                  className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
                />
              </View>
            ) : null}

            <Button
              size="sm"
              className="mt-3"
              isDisabled={isBusy}
              onPress={() => {
                void handleOpen();
              }}
            >
              <Button.Label>
                {isBusy
                  ? '處理中...'
                  : carrier.provider === 'ezship'
                    ? '建立出貨單並取號'
                    : '建立出貨單'}
              </Button.Label>
            </Button>
          </View>
        )}
      </View>
    );
  }

  const meta = SHIPMENT_STATUS_META[shipment.status];
  const canManualMove = shipment.provider === 'manual' || shipment.is_simulated;
  const canSync = shipment.provider === 'ezship' && !shipment.is_simulated;
  const isClosed = shipment.status === 'cancelled';

  return (
    <View className="bg-background mt-2.5 rounded-2xl border border-neutral-200 p-3.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Truck size={14} color={SAGE} strokeWidth={2.2} />
          <Text className="text-foreground text-[12px] font-bold">出貨單</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          {shipment.is_simulated ? (
            <View className="rounded-md bg-neutral-100 px-1.5 py-0.5">
              <Text className="text-[9px] font-bold text-neutral-500">模擬</Text>
            </View>
          ) : null}
          <View className={`rounded-md px-1.5 py-0.5 ${meta.bgClass}`}>
            <Text className={`text-[9px] font-bold ${meta.textClass}`}>{meta.label}</Text>
          </View>
        </View>
      </View>

      <Text className="text-muted mt-2 text-[11px] leading-4">
        {shipment.status_detail ?? meta.hint}
      </Text>

      <View className="bg-canvas mt-2.5 rounded-xl px-3 py-2.5">
        <Text className="text-muted text-[10px] font-semibold">寄貨編號</Text>
        <Text selectable className="text-foreground mt-0.5 text-[15px] font-bold">
          {shipment.tracking_no ?? '尚未取號'}
        </Text>
        <Text className="text-muted mt-1 text-[10px] leading-4">
          {shipment.provider === 'ezship' ? 'ezShip 台灣便利配' : '賣家自行取號'} ∙{' '}
          {shipment.method}
          {shipment.ezship_order_no === null ? '' : ` ∙ 訂單 ${shipment.ezship_order_no}`}
        </Text>
      </View>

      {shipment.provider_error === null ? null : (
        <View className="mt-2 flex-row items-start gap-1.5 rounded-xl bg-red-50 px-3 py-2">
          <AlertTriangle size={12} color="#B91C1C" strokeWidth={2.2} />
          <Text className="flex-1 text-[11px] leading-4 text-red-700">
            {shipment.provider_error}
          </Text>
        </View>
      )}

      {isClosed ? null : (
        <View className="mt-2.5 flex-row flex-wrap gap-2">
          {isSeller &&
          shipment.provider === 'ezship' &&
          (shipment.status === 'created' || shipment.status === 'failed') ? (
            <Button
              size="sm"
              isDisabled={isBusy}
              onPress={() => {
                void handleLabel();
              }}
            >
              <Button.Label>{isBusy ? '取號中...' : '向 ezShip 取號'}</Button.Label>
            </Button>
          ) : null}

          {canSync ? (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={isBusy}
              onPress={() => {
                void handleSync();
              }}
            >
              <RefreshCw size={13} color={SAGE} strokeWidth={2.2} />
              <Button.Label>更新配送狀態</Button.Label>
            </Button>
          ) : null}

          {isSeller && canManualMove && shipment.status === 'label_ready' ? (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={isBusy}
              onPress={() => {
                void handleAdvance('in_transit', '賣家已將包裹交寄。');
              }}
            >
              <Button.Label>標記已寄出</Button.Label>
            </Button>
          ) : null}

          {isSeller && canManualMove && shipment.status === 'in_transit' ? (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={isBusy}
              onPress={() => {
                void handleAdvance('arrived', '包裹已送達取件地點。');
              }}
            >
              <Button.Label>標記已到店</Button.Label>
            </Button>
          ) : null}

          {!isSeller &&
          canManualMove &&
          (shipment.status === 'arrived' ||
            shipment.status === 'in_transit' ||
            shipment.status === 'label_ready') ? (
            <Button
              size="sm"
              isDisabled={isBusy}
              onPress={() => {
                void handleAdvance('delivered', '買家已完成取貨。');
              }}
            >
              <PackageCheck size={13} color="#FFFFFF" strokeWidth={2.2} />
              <Button.Label>我已取貨</Button.Label>
            </Button>
          ) : null}

          {shipment.label_url === null ? null : (
            <Button
              size="sm"
              variant="tertiary"
              onPress={() => {
                void Linking.openURL(shipment.label_url ?? '');
              }}
            >
              <Printer size={13} color={SAGE} strokeWidth={2.2} />
              <Button.Label>列印寄件單</Button.Label>
            </Button>
          )}

          {isSeller &&
          (shipment.status === 'created' ||
            shipment.status === 'label_ready' ||
            shipment.status === 'failed') ? (
            <Button
              size="sm"
              variant="tertiary"
              isDisabled={isBusy}
              onPress={() => {
                void handleCancel();
              }}
            >
              <Button.Label>作廢出貨單</Button.Label>
            </Button>
          ) : null}
        </View>
      )}

      {isSeller &&
      shipment.provider === 'manual' &&
      (shipment.status === 'created' || shipment.status === 'failed') ? (
        <View className="mt-2.5">
          <Text className="text-foreground text-[11px] font-bold">填入寄貨編號</Text>
          <View className="mt-1.5 flex-row gap-2">
            <TextInput
              value={trackingDraft}
              onChangeText={setTrackingDraft}
              placeholder="物流商給的編號"
              placeholderTextColorClassName="accent-neutral-400"
              accessibilityLabel="寄貨編號"
              autoCapitalize="characters"
              className="bg-canvas text-foreground h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold"
            />
            <Button
              size="sm"
              isDisabled={isBusy}
              onPress={() => {
                void handleManualTracking();
              }}
            >
              <Button.Label>儲存</Button.Label>
            </Button>
          </View>
          <Text className="text-muted mt-1.5 text-[10px] leading-4">{carrier.note}</Text>
        </View>
      ) : null}

      <View className="mt-3.5 border-t border-neutral-100 pt-3">
        <Text className="text-foreground text-[11px] font-bold">配送進度</Text>
        <View className="mt-3">
          <ShipmentTimeline status={shipment.status} events={events} />
        </View>
        {canSync ? (
          <Text className="text-muted mt-2 text-[10px] leading-4">
            狀態由 ezShip 回報，按「更新配送狀態」會即時查詢一次。
          </Text>
        ) : (
          <Text className="text-muted mt-2 text-[10px] leading-4">
            {shipment.is_simulated
              ? '模擬模式：狀態由雙方手動推進，用來驗證整條流程。'
              : '這個寄送方式沒有自動回拋，狀態由賣家與買家手動更新。'}
          </Text>
        )}
      </View>
    </View>
  );
}
