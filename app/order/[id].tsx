import { useCallback, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Leaf,
  MessageCircle,
  PackageSearch,
  Star,
  Truck,
  UserPlus,
  XCircle,
} from 'lucide-react-native';

import { DeliveryInfoCard } from '@/components/DeliveryInfoCard';
import { ShipmentCard } from '@/components/ShipmentCard';
import { showAlert } from '@/lib/alert';
import { useChatStore } from '@/lib/chatStore';
import { ORDER_STATUS_META, SAGE, formatShippingFee, getOrderStatus } from '@/lib/constants';
import { resolveListingImage } from '@/lib/demoImages';
import { goBackOrReplace } from '@/lib/navigation';
import { useOrderStore } from '@/lib/orderStore';
import { carrierFor, useShipmentStore } from '@/lib/shipments';
import { useLetaoStore } from '@/lib/store';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id ?? '';

  const userId = useLetaoStore((state) => state.userId);
  const refreshFeed = useLetaoStore((state) => state.refresh);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.load);
  const completeOrder = useOrderStore((state) => state.completeOrder);
  const cancelOrder = useOrderStore((state) => state.cancelOrder);
  const startConversation = useChatStore((state) => state.startConversation);
  const byOrder = useShipmentStore((state) => state.byOrder);
  const loadShipment = useShipmentStore((state) => state.load);

  const [isBusy, setIsBusy] = useState(false);

  const order = useMemo(
    () => orders.find((item) => item.id === orderId) ?? null,
    [orders, orderId],
  );
  const entry = byOrder[orderId] ?? null;

  const refresh = useCallback(() => {
    if (!userId || orderId === '') return;
    void loadOrders(userId);
    void loadShipment(orderId);
  }, [userId, orderId, loadOrders, loadShipment]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!userId) {
    return (
      <View className="bg-canvas flex-1 p-4">
        <Stack.Screen options={{ title: '交易詳情' }} />
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={30} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">交易詳情需要註冊帳號</Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊 / 登入</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="bg-canvas flex-1 p-4">
        <Stack.Screen options={{ title: '交易詳情' }} />
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <PackageSearch size={30} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">找不到這筆交易</Text>
          <Text className="text-muted mt-2 text-center text-[13px] leading-5">
            它可能已被取消，或不屬於這個帳號。
          </Text>
          <Button className="mt-4" variant="secondary" onPress={() => goBackOrReplace('/orders')}>
            <Button.Label>回到我的交易</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  const isBuyer = order.buyer_id === userId;
  const isSeller = order.seller_id === userId;
  const meta = ORDER_STATUS_META[getOrderStatus(order.status)];
  const source = resolveListingImage(order.listing_images?.[0]);
  const carrier = carrierFor(order.logistics);
  const shipment = entry?.shipment ?? null;
  const events = entry?.events ?? [];
  const canEditDelivery =
    isBuyer && order.status === 'pending' && (shipment === null || shipment.status === 'cancelled');

  const handleComplete = async () => {
    setIsBusy(true);
    const ok = await completeOrder(order.id);
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: '沒有更新成功',
        tone: 'danger',
        message: '這筆交易可能已被對方處理過，請重新整理後再看一次。',
      });
      refresh();
      return;
    }

    await refreshFeed();
    refresh();
    showAlert({
      title: '交易已完成',
      tone: 'success',
      message: isBuyer
        ? '感謝完成交易。到賣家主頁給一個評價，能幫助後續買家判斷。'
        : '商品已標記為已售出，買家可以開始給你評價。',
    });
  };

  const handleCancel = async () => {
    setIsBusy(true);
    const ok = await cancelOrder(order.id);
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: '沒有取消成功',
        tone: 'danger',
        message: '這筆交易可能已被對方處理過，請重新整理後再試。',
      });
      refresh();
      return;
    }

    await refreshFeed();
    refresh();
    showAlert({ title: '交易已取消', message: '商品重新開放出價，對方也收到通知了。' });
  };

  const openChat = async () => {
    setIsBusy(true);
    const conversationId = await startConversation(order.listing_id);
    setIsBusy(false);

    if (!conversationId) {
      router.push('/(tabs)/chat');
      return;
    }
    router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
  };

  return (
    <KeyboardAvoidingView
      className="bg-canvas flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: '交易詳情' }} />

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        <View className="bg-background rounded-2xl border border-neutral-200 p-3.5">
          <View className="flex-row">
            <View className="bg-mint h-16 w-16 items-center justify-center overflow-hidden rounded-xl">
              {source ? (
                <Image source={source} style={{ width: 64, height: 64 }} resizeMode="cover" />
              ) : (
                <Leaf size={22} color={SAGE} strokeWidth={1.7} />
              )}
            </View>

            <View className="ml-3 flex-1">
              <View className={`self-start rounded-md px-1.5 py-0.5 ${meta.bgClass}`}>
                <Text className={`text-[9px] font-bold ${meta.textClass}`}>{meta.label}</Text>
              </View>
              <Text numberOfLines={2} className="text-foreground mt-1.5 text-[13px] font-bold">
                {order.listing_title}
              </Text>
              <Text className="text-foreground mt-1 text-[14px] font-bold">
                成交 NT$ {order.offer_price.toLocaleString('en-US')}
              </Text>
              <Text className="text-foreground mt-0.5 text-[11px] font-semibold">
                運費 {formatShippingFee(order.shipping_fee)} ∙ 總計 NT${' '}
                {(order.offer_price + order.shipping_fee).toLocaleString('en-US')}
              </Text>
              <Text className="text-sage-deep mt-0.5 text-[11px] font-medium">
                {isBuyer ? '賣家' : '買家'}：{order.counterpartName ?? '樂淘用戶'}
              </Text>
            </View>
          </View>

          <Text className="text-muted mt-2.5 text-[11px] leading-4">{meta.hint}</Text>
        </View>

        <View className="bg-background mt-2.5 rounded-2xl border border-neutral-200 p-3.5">
          <View className="flex-row items-center gap-1.5">
            <Truck size={14} color={SAGE} strokeWidth={2.2} />
            <Text className="text-foreground text-[12px] font-bold">寄送方式</Text>
          </View>
          <Text className="text-foreground mt-2 text-[12px] font-semibold">
            {order.logistics ?? '面交'}
            {order.dest_region === null ? '' : ` ∙ 寄至${order.dest_region}`}
          </Text>
          <Text className="text-muted mt-1 text-[11px] leading-4">{carrier.note}</Text>
          {order.meetup_location === null ? null : (
            <Text className="text-muted mt-1 text-[11px] leading-4">
              出貨地：{order.meetup_location}
            </Text>
          )}
        </View>

        {carrier.provider === 'none' ? null : (
          <DeliveryInfoCard
            key={order.id}
            order={order}
            carrier={carrier}
            canEdit={canEditDelivery}
            onSaved={refresh}
          />
        )}

        <ShipmentCard
          order={order}
          shipment={shipment}
          events={events}
          isSeller={isSeller}
          carrier={carrier}
          onChanged={refresh}
        />

        <View className="mt-3 flex-row flex-wrap gap-2">
          <Button
            size="sm"
            variant="tertiary"
            isDisabled={isBusy}
            onPress={() => {
              void openChat();
            }}
          >
            <MessageCircle size={13} color={SAGE} strokeWidth={2.2} />
            <Button.Label>私訊</Button.Label>
          </Button>

          {order.status === 'pending' ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                isDisabled={isBusy}
                onPress={() => {
                  void handleCancel();
                }}
              >
                <XCircle size={13} color={SAGE} strokeWidth={2.2} />
                <Button.Label>取消交易</Button.Label>
              </Button>
              <Button
                size="sm"
                className="flex-1"
                isDisabled={isBusy}
                onPress={() => {
                  void handleComplete();
                }}
              >
                <Button.Label>{isBusy ? '處理中...' : '標記完成交易'}</Button.Label>
              </Button>
            </>
          ) : null}

          {order.status === 'completed' && isBuyer ? (
            <Button
              size="sm"
              className="flex-1"
              onPress={() =>
                router.push({ pathname: '/seller/[id]', params: { id: order.seller_id } })
              }
            >
              <Star size={13} color="#FFFFFF" strokeWidth={2.2} />
              <Button.Label>評價這位賣家</Button.Label>
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
