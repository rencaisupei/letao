import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import {
  Leaf,
  MessageCircle,
  PackageCheck,
  Star,
  Truck,
  UserPlus,
  XCircle,
} from 'lucide-react-native';

import { SelectChip } from '@/components/SelectChip';
import { showAlert } from '@/lib/alert';
import { useChatStore } from '@/lib/chatStore';
import {
  ORDER_STATUS_META,
  SAGE,
  formatShippingFee,
  getOrderStatus,
  paymentLabel,
} from '@/lib/constants';
import { resolveListingImage } from '@/lib/demoImages';
import { goBackOrReplace } from '@/lib/navigation';
import { type Order, orderTotal, useOrderStore } from '@/lib/orderStore';
import { useAppStore } from '@/lib/store';

type Tab = 'buying' | 'selling';

export default function OrdersScreen() {
  const userId = useAppStore((state) => state.userId);
  const refreshFeed = useAppStore((state) => state.refresh);
  const orders = useOrderStore((state) => state.orders);
  const isLoading = useOrderStore((state) => state.isLoading);
  const load = useOrderStore((state) => state.load);
  const completeOrder = useOrderStore((state) => state.completeOrder);
  const cancelOrder = useOrderStore((state) => state.cancelOrder);
  const startConversation = useChatStore((state) => state.startConversation);

  const [tab, setTab] = useState<Tab>('buying');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!userId) return;
    void load(userId);
  }, [userId, load]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const visible = useMemo(
    () =>
      orders.filter((order) =>
        tab === 'buying' ? order.buyer_id === userId : order.seller_id === userId,
      ),
    [orders, tab, userId],
  );

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === 'pending').length,
    [orders],
  );

  const handleComplete = async (order: Order) => {
    setBusyId(order.id);
    const ok = await completeOrder(order.id);
    setBusyId(null);

    if (!ok) {
      showAlert({
        title: '沒有更新成功',
        tone: 'danger',
        message: '這筆交易可能已被對方處理過。下拉重新整理後再看一次。',
      });
      refresh();
      return;
    }

    await refreshFeed();
    showAlert({
      title: '交易已完成',
      tone: 'success',
      message:
        order.buyer_id === userId
          ? '感謝完成交易。到賣家主頁給一個評價，能幫助後續買家判斷。'
          : '商品已標記為已售出，買家可以開始給你評價。',
      confirmLabel: order.buyer_id === userId ? '去評價賣家' : '我知道了',
      onConfirm: () => {
        if (order.buyer_id === userId) {
          router.push({ pathname: '/seller/[id]', params: { id: order.seller_id } });
        }
      },
    });
  };

  const handleCancel = async (order: Order) => {
    setBusyId(order.id);
    const ok = await cancelOrder(order.id);
    setBusyId(null);

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
    showAlert({
      title: '交易已取消',
      message: '商品重新開放出價，對方也收到通知了。',
    });
  };

  const openChat = async (order: Order) => {
    setBusyId(order.id);
    const conversationId = await startConversation(order.listing_id);
    setBusyId(null);

    if (!conversationId) {
      router.push('/(tabs)/chat');
      return;
    }
    router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
  };

  if (!userId) {
    return (
      <View className="bg-canvas flex-1 p-4">
        <Stack.Screen options={{ title: '我的交易' }} />
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={30} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">交易紀錄需要註冊帳號</Text>
          <Text className="text-muted mt-2 text-center text-[13px] leading-5">
            出價媒合成功後會產生交易單，完成後才能互相評價。
          </Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊 / 登入</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-canvas flex-1">
      <Stack.Screen options={{ title: '我的交易' }} />

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={refresh}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <View className="flex-row gap-1.5">
              <SelectChip
                label="我買的"
                isSelected={tab === 'buying'}
                onPress={() => setTab('buying')}
                className="flex-1 rounded-xl"
              />
              <SelectChip
                label="我賣的"
                isSelected={tab === 'selling'}
                onPress={() => setTab('selling')}
                className="flex-1 rounded-xl"
              />
            </View>
            <Text className="text-muted mt-2.5 px-1 text-[11px] leading-4">
              目前有 {pendingCount}{' '}
              筆待完成交付的交易。交付完成後，雙方任一方都可以標記完成，之後買家就能評價賣家。
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-8 py-14">
            <PackageCheck size={30} color={SAGE} strokeWidth={1.6} />
            <Text className="text-foreground mt-4 text-base font-bold">
              {tab === 'buying' ? '還沒有出價成功的交易' : '還沒有收到成交的出價'}
            </Text>
            <Text className="text-muted mt-2 text-center text-[13px] leading-5">
              {tab === 'buying'
                ? '在商品詳情頁按「出價與媒合」，出價達到門檻就會建立交易單。'
                : '買家出價達到防砍價門檻後，交易單就會出現在這裡。'}
            </Text>
            <Button className="mt-4" variant="secondary" onPress={() => goBackOrReplace('/')}>
              <Button.Label>回到探索首頁</Button.Label>
            </Button>
          </View>
        }
        renderItem={({ item }) => {
          const meta = ORDER_STATUS_META[getOrderStatus(item.status)];
          const source = resolveListingImage(item.listing_images?.[0]);
          const isBuyer = item.buyer_id === userId;
          const isBusy = busyId === item.id;

          return (
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
                  <Text numberOfLines={1} className="text-foreground mt-1.5 text-[13px] font-bold">
                    {item.listing_title}
                  </Text>
                  <Text className="text-foreground mt-1 text-[14px] font-bold">
                    成交 NT$ {item.offer_price.toLocaleString('en-US')}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    <Text className="text-muted text-[10px] font-medium">
                      {'  '}標價 {item.listing_price.toLocaleString('en-US')}
                    </Text>
                  </Text>
                  <Text className="text-foreground mt-0.5 text-[11px] font-semibold">
                    運費 {formatShippingFee(item.shipping_fee)} ∙ 總計 NT${' '}
                    {orderTotal(item).toLocaleString('en-US')}
                  </Text>
                  <Text className="text-sage-deep mt-0.5 text-[11px] font-medium">
                    {isBuyer ? '賣家' : '買家'}：{item.counterpartName ?? '易拍通用戶'}
                  </Text>
                </View>
              </View>

              <View className="bg-canvas mt-2.5 rounded-xl px-3 py-2">
                <Text className="text-muted text-[11px] leading-4">
                  🚚 {item.logistics ?? '面交'}
                  {item.dest_region ? ` ∙ 寄至${item.dest_region}` : ''} ∙{' '}
                  {item.meetup_location ?? '台灣本島'}
                </Text>
                <Text className="text-muted mt-1 text-[11px] leading-4">
                  💳 {paymentLabel(item.payment_method)}
                </Text>
                <Text className="text-muted mt-1 text-[11px] leading-4">{meta.hint}</Text>
              </View>

              <View className="mt-2.5 flex-row flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="tertiary"
                  isDisabled={isBusy}
                  onPress={() => {
                    void openChat(item);
                  }}
                >
                  <MessageCircle size={13} color={SAGE} strokeWidth={2.2} />
                  <Button.Label>私訊</Button.Label>
                </Button>

                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
                >
                  <Truck size={13} color={SAGE} strokeWidth={2.2} />
                  <Button.Label>取貨與付款</Button.Label>
                </Button>

                {item.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={isBusy}
                      onPress={() => {
                        void handleCancel(item);
                      }}
                    >
                      <XCircle size={13} color={SAGE} strokeWidth={2.2} />
                      <Button.Label>取消</Button.Label>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      isDisabled={isBusy}
                      onPress={() => {
                        void handleComplete(item);
                      }}
                    >
                      <Button.Label>{isBusy ? '處理中...' : '標記完成交易'}</Button.Label>
                    </Button>
                  </>
                ) : null}

                {item.status === 'completed' && isBuyer ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    onPress={() =>
                      router.push({ pathname: '/seller/[id]', params: { id: item.seller_id } })
                    }
                  >
                    <Star size={13} color="#FFFFFF" strokeWidth={2.2} />
                    <Button.Label>評價這位賣家</Button.Label>
                  </Button>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
