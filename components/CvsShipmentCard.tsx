import { useCallback, useState } from 'react';
import { View } from 'react-native';

import * as Clipboard from 'expo-clipboard';
import { Button } from 'heroui-native';
import { router, useFocusEffect } from 'expo-router';
import { Copy, PackageCheck, RefreshCw, Truck } from 'lucide-react-native';

import { CvsStoreSummary } from '@/components/CvsStoreSummary';
import { Text } from '@/components/ui/primitives/Text';
import { showAlert } from '@/lib/alert';
import { SAGE, paymentLabel } from '@/lib/constants';
import {
  ECPAY_DISABLED,
  type EcpayConfig,
  type EcpayLogisticsEvent,
  type EcpayLogisticsOrder,
  type EcpaySenderProfile,
  type EcpaySubType,
  collectionBreakdown,
  createLogisticsOrder,
  ecpayFailureMessage,
  ecpaySubTypeFor,
  fetchEcpayConfig,
  fetchLogisticsEvents,
  fetchLogisticsOrder,
  fetchSenderProfile,
  refreshLogisticsOrder,
  shipmentCode,
  subTypeInfo,
  toEcpaySubType,
} from '@/lib/ecpay';
import {
  SHIPMENT_TIMELINE,
  STAGE_META,
  type ShipmentStage,
  codeLabel,
  stageForCode,
  timelineIndex,
} from '@/lib/ecpayStatus';
import { type Order } from '@/lib/orderStore';

/** 這些階段代表包裹還在線上，同一筆交易不需要（也不能）再建一張物流單。 */
const ACTIVE_STAGES: ShipmentStage[] = [
  'created',
  'shipped',
  'in_transit',
  'arrived',
  'picked_up',
  'returning',
];

const VISIBLE_EVENTS = 5;

function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 事件紀錄裡走到過的最後一個正常階段，用來畫時間軸。 */
function reachedIndex(stage: ShipmentStage, events: EcpayLogisticsEvent[]): number {
  let best = Math.max(timelineIndex(stage), 0);
  for (const event of events) {
    const eventStage = stageForCode(event.code);
    if (eventStage === null) continue;
    best = Math.max(best, timelineIndex(eventStage));
  }
  return best;
}

function Timeline({ stage, events }: { stage: ShipmentStage; events: EcpayLogisticsEvent[] }) {
  const reached = reachedIndex(stage, events);

  return (
    <View className="mt-3">
      {SHIPMENT_TIMELINE.map((step, index) => {
        const meta = STAGE_META[step];
        const isDone = index < reached;
        const isCurrent = index === reached;
        const isLast = index === SHIPMENT_TIMELINE.length - 1;

        return (
          <View key={step} className="flex-row">
            <View className="w-5 items-center">
              <View
                className={`h-2.5 w-2.5 rounded-full ${
                  isCurrent ? 'bg-sage' : isDone ? 'bg-mint' : 'bg-neutral-200'
                }`}
              />
              {isLast ? null : (
                <View className={`w-0.5 flex-1 ${isDone ? 'bg-mint' : 'bg-neutral-200'}`} />
              )}
            </View>
            <View className={`flex-1 pl-2 ${isLast ? '' : 'pb-3'}`}>
              <Text
                className={`text-xs ${
                  isCurrent
                    ? 'text-foreground font-bold'
                    : isDone
                      ? 'text-sage-deep font-semibold'
                      : 'text-muted'
                }`}
              >
                {meta.label}
              </Text>
              {isCurrent ? (
                <Text className="text-muted text-2xs mt-0.5 leading-4">{meta.hint}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export type CvsShipmentCardProps = {
  order: Order;
  userId: string;
};

async function copy(label: string, value: string) {
  await Clipboard.setStringAsync(value);
  showAlert({ title: '已複製', message: `${label}已複製到剪貼簿。` });
}

/**
 * 交易詳情裡的超商取貨付款區塊。買家在這裡進到選店流程，賣家在這裡建立物流單、
 * 取得寄貨編號並追蹤貨態。只有運送方式是綠界支援的超商店到店時才會出現。
 */
export function CvsShipmentCard({ order, userId }: CvsShipmentCardProps) {
  const [config, setConfig] = useState<EcpayConfig>(ECPAY_DISABLED);
  const [shipment, setShipment] = useState<EcpayLogisticsOrder | null>(null);
  const [events, setEvents] = useState<EcpayLogisticsEvent[]>([]);
  const [sender, setSender] = useState<EcpaySenderProfile | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const isSeller = order.seller_id === userId;

  const load = useCallback(async () => {
    const [nextConfig, nextShipment] = await Promise.all([
      fetchEcpayConfig(),
      fetchLogisticsOrder(order.id),
    ]);
    setConfig(nextConfig);
    setShipment(nextShipment);
    setEvents(nextShipment === null ? [] : await fetchLogisticsEvents(nextShipment.id));
    if (isSeller) setSender(await fetchSenderProfile(userId));
  }, [order.id, isSeller, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const subType: EcpaySubType | null =
    order.cvs_sub_type !== null
      ? toEcpaySubType(order.cvs_sub_type)
      : ecpaySubTypeFor(order.logistics);

  if (subType === null) return null;

  const info = subTypeInfo(subType);
  const collection = collectionBreakdown(order);
  const hasStore = order.cvs_store_id !== null;
  const stage = shipment?.stage ?? null;
  const isActive = stage !== null && ACTIVE_STAGES.includes(stage);
  const canCreate = hasStore && order.status === 'pending' && !isActive;
  const senderReady = sender !== null;

  const handleCreate = async () => {
    setIsBusy(true);
    const result = await createLogisticsOrder(order.id);
    setIsBusy(false);

    if (!result.ok) {
      showAlert({
        title: '沒有建立成功',
        tone: 'danger',
        message: ecpayFailureMessage(result.reason, result.detail),
      });
      if (result.reason === 'already_created') void load();
      return;
    }

    await load();
    showAlert({
      title: '物流單已建立',
      tone: 'success',
      message: `請在 ${info.shipWithinDays} 天內帶包裹與寄貨編號到${info.label}門市寄件，逾期物流單會失效。`,
    });
  };

  const handleRefresh = async () => {
    if (shipment === null) return;
    setIsBusy(true);
    const ok = await refreshLogisticsOrder(shipment.merchantTradeNo);
    await load();
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: '查不到最新貨態',
        message: '綠界的貨態是批次更新的，剛寄件時可能還查不到。稍後再試一次即可。',
      });
    }
  };

  const code = shipment === null ? null : shipmentCode(shipment);
  const shownEvents = showAllEvents ? events : events.slice(0, VISIBLE_EVENTS);

  return (
    <View className="bg-background mt-3 rounded-2xl border border-neutral-200 p-4">
      <View className="flex-row items-center gap-1.5">
        <Truck size={14} color={SAGE} strokeWidth={2.2} />
        <Text className="text-foreground text-xs font-bold">
          {collection.collects ? '超商取貨付款' : '超商取貨（不代收）'}
        </Text>
        {stage === null ? null : (
          <View className={`ml-auto rounded-md px-2 py-1 ${STAGE_META[stage].bgClass}`}>
            <Text className={`text-2xs font-bold ${STAGE_META[stage].textClass}`}>
              {STAGE_META[stage].label}
            </Text>
          </View>
        )}
      </View>

      {!config.isEnabled && shipment === null ? (
        <Text className="text-muted text-2xs mt-2 leading-4">
          平台的超商取貨付款目前尚未開放，請雙方在私訊中確認寄件與付款方式。
        </Text>
      ) : null}

      {/* 步驟一：買家選門市 */}
      {hasStore && order.cvs_store_id !== null ? (
        <View className="mt-3">
          <CvsStoreSummary
            subType={subType}
            storeId={order.cvs_store_id}
            storeName={order.cvs_store_name}
            storeAddress={order.cvs_store_address}
            storeTelephone={order.cvs_store_telephone}
            isOutlying={order.cvs_outlying}
          />
          <Text className="text-muted text-2xs mt-2 leading-4">
            收件人 {order.receiver_name ?? '—'} ∙ {order.receiver_cellphone ?? '—'}
          </Text>
        </View>
      ) : (
        <View className="mt-2">
          <Text className="text-muted text-2xs leading-4">
            {isSeller
              ? '等買家選好取貨門市並填收件資料後，你才能建立物流單。可以在私訊中提醒一下。'
              : '請先選好要取貨的門市並填收件資料，賣家才能寄件。'}
          </Text>
          {isSeller || order.status !== 'pending' ? null : (
            <Button
              className="mt-3"
              isDisabled={!config.isEnabled}
              onPress={() => router.push({ pathname: '/pickup/[id]', params: { id: order.id } })}
            >
              <Button.Label>選擇取貨門市</Button.Label>
            </Button>
          )}
        </View>
      )}

      {/* 買家在賣家寄件前仍可改門市 */}
      {!isSeller && hasStore && order.status === 'pending' && !isActive ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 self-start"
          onPress={() => router.push({ pathname: '/pickup/[id]', params: { id: order.id } })}
        >
          <Button.Label>修改門市或收件人</Button.Label>
        </Button>
      ) : null}

      {/* 步驟二：賣家建立物流單 */}
      {isSeller && canCreate ? (
        <View className="mt-3">
          {senderReady ? (
            <>
              <Text className="text-muted text-2xs leading-4">
                寄件人 {sender.senderName} ∙ {sender.senderCellphone}
                {sender.returnStoreId === null ? '' : ` ∙ 退貨門市 ${sender.returnStoreId}`}
              </Text>
              <Text className="text-muted text-2xs mt-1 leading-4">
                {collection.collects
                  ? `代收金額 NT$ ${collection.amount.toLocaleString('en-US')}（商品 NT$ ${collection.goodsSubtotal.toLocaleString('en-US')} ＋ 運費 NT$ ${collection.shippingFee.toLocaleString('en-US')}）`
                  : `不代收貨款：買家用${paymentLabel(order.payment_method)}付款，超商不會再向買家收錢。`}
              </Text>
              <View className="mt-3 flex-row gap-2">
                <Button
                  className="flex-1"
                  isDisabled={isBusy || !config.isEnabled}
                  onPress={() => {
                    void handleCreate();
                  }}
                >
                  <Button.Label>
                    {isBusy ? '處理中...' : shipment === null ? '建立物流單' : '重新建立物流單'}
                  </Button.Label>
                </Button>
                <Button size="sm" variant="tertiary" onPress={() => router.push('/sender-profile')}>
                  <Button.Label>改寄件人</Button.Label>
                </Button>
              </View>
            </>
          ) : (
            <>
              <Text className="text-muted text-2xs leading-4">
                建立物流單前需要先填寄件人姓名與手機，這是超商服務單上的必填欄位。
              </Text>
              <Button className="mt-3" onPress={() => router.push('/sender-profile')}>
                <Button.Label>填寫寄件人資料</Button.Label>
              </Button>
            </>
          )}
        </View>
      ) : null}

      {/* 步驟三：寄貨編號與貨態 */}
      {shipment === null ? null : (
        <View className="mt-4 border-t border-neutral-100 pt-3">
          <View className="flex-row items-center gap-1.5">
            <PackageCheck size={14} color={SAGE} strokeWidth={2.2} />
            <Text className="text-foreground text-xs font-bold">
              {isSeller ? '寄件資訊' : '物流進度'}
            </Text>
          </View>

          {isSeller && code !== null ? (
            <View className="bg-mint mt-2 rounded-xl p-4">
              <Text className="text-sage-deep text-2xs font-bold">
                {subType === 'UNIMARTC2C' ? '交貨便代碼' : '寄貨編號'}
              </Text>
              <Text className="text-foreground mt-1 text-xl font-bold">{code}</Text>
              <Text className="text-sage-deep text-2xs mt-1 leading-4">
                到{info.label}門市的機台輸入這組代碼列印服務單，包好後交給店員。請在建單後{' '}
                {info.shipWithinDays} 天內寄出。
              </Text>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 self-start"
                onPress={() => {
                  void copy(subType === 'UNIMARTC2C' ? '交貨便代碼' : '寄貨編號', code);
                }}
              >
                <Copy size={13} color={SAGE} strokeWidth={2.2} />
                <Button.Label>複製</Button.Label>
              </Button>
            </View>
          ) : null}

          <Text className="text-muted text-2xs mt-2 leading-4">
            廠商交易編號 {shipment.merchantTradeNo}
            {shipment.allPayLogisticsId === null
              ? ''
              : ` ∙ 綠界物流單號 ${shipment.allPayLogisticsId}`}
          </Text>
          <Text className="text-muted text-2xs mt-0.5 leading-4">
            {shipment.collectionAmount > 0
              ? `代收金額 NT$ ${shipment.collectionAmount.toLocaleString('en-US')}`
              : '不代收貨款'}
            {shipment.statusUpdatedAt === null
              ? ''
              : ` ∙ 更新於 ${formatMoment(shipment.statusUpdatedAt)}`}
          </Text>

          {STAGE_META[shipment.stage].isAlert ? (
            <View className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <Text className="text-xs font-bold text-orange-700">
                {STAGE_META[shipment.stage].label}
              </Text>
              <Text className="text-2xs mt-1 leading-4 text-orange-700">
                {STAGE_META[shipment.stage].hint}
              </Text>
              <Text className="text-2xs mt-1 leading-4 text-orange-700">
                綠界回報：{codeLabel(shipment.rtnCode, shipment.rtnMsg)}
              </Text>
            </View>
          ) : (
            <Timeline stage={shipment.stage} events={events} />
          )}

          {events.length === 0 ? (
            <Text className="text-muted text-2xs mt-3 leading-4">
              還沒有貨態紀錄。綠界的貨態由物流中心批次更新，不是即時的。
            </Text>
          ) : (
            <View className="mt-3">
              <Text className="text-foreground text-2xs font-bold">貨態紀錄</Text>
              {shownEvents.map((event) => (
                <View key={event.id} className="mt-2 flex-row">
                  <Text className="text-muted text-2xs w-24">{formatMoment(event.happenedAt)}</Text>
                  <Text className="text-foreground text-2xs flex-1 leading-4">
                    {codeLabel(event.code, event.message)}
                    {event.code === null ? '' : `（${event.code}）`}
                  </Text>
                </View>
              ))}
              {events.length > VISIBLE_EVENTS ? (
                <Button
                  size="sm"
                  variant="tertiary"
                  className="mt-2 self-start"
                  onPress={() => setShowAllEvents((current) => !current)}
                >
                  <Button.Label>
                    {showAllEvents ? '收起' : `顯示全部 ${events.length} 筆`}
                  </Button.Label>
                </Button>
              ) : null}
            </View>
          )}

          <Button
            size="sm"
            variant="secondary"
            className="mt-3 self-start"
            isDisabled={isBusy}
            onPress={() => {
              void handleRefresh();
            }}
          >
            <RefreshCw size={13} color={SAGE} strokeWidth={2.2} />
            <Button.Label>{isBusy ? '查詢中...' : '重新查詢貨態'}</Button.Label>
          </Button>
        </View>
      )}
    </View>
  );
}
