import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  ChevronRight,
  Flag,
  Leaf,
  MapPin,
  MessageCircle,
  Star,
  Truck,
  Wallet,
} from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { ConditionBadge } from '@/components/ConditionBadge';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ListingStatusBadge } from '@/components/ListingStatusBadge';
import { ModerationBadge } from '@/components/ModerationBadge';
import { PaymentChoiceList } from '@/components/PaymentPicker';
import { PaymentMethodsSheet } from '@/components/PaymentMethodsSheet';
import { QuantityStepper } from '@/components/QuantityStepper';
import { SelectChip } from '@/components/SelectChip';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { showAlert } from '@/lib/alert';
import { useChatStore } from '@/lib/chatStore';
import {
  MEETUP_METHOD,
  MINT,
  ORDER_STATUS_META,
  REPORT_REASONS,
  SAGE,
  type PaymentCode,
  cheapestShipping,
  formatShippingFee,
  getCondition,
  getModeration,
  getOrderStatus,
  getPayment,
  hasAutoShipping,
  paymentLabel,
  paymentSummary,
  paymentsFor,
  remainingQuantity,
  stockLabel,
} from '@/lib/constants';
import { resolveListingImage } from '@/lib/demoImages';
import { goBackOrReplace } from '@/lib/navigation';
import { orderTotal, useOrderStore } from '@/lib/orderStore';
import { fetchListingById } from '@/lib/queries';
import { TAIWAN_REGIONS } from '@/lib/regions';
import { requireAccount } from '@/lib/requireAccount';
import {
  type ListingShippingQuote,
  cheapestQuote,
  quoteListingShipping,
  sourceLabel,
} from '@/lib/shipping';
import { type Listing, useAppStore } from '@/lib/store';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const userId = useAppStore((state) => state.userId);
  const listings = useAppStore((state) => state.listings);
  const reportListing = useAppStore((state) => state.reportListing);
  const setListingPayments = useAppStore((state) => state.setListingPayments);
  const refreshFeed = useAppStore((state) => state.refresh);
  const startConversation = useChatStore((state) => state.startConversation);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.load);
  const createOrder = useOrderStore((state) => state.createOrder);
  const completeOrder = useOrderStore((state) => state.completeOrder);
  const cancelOrder = useOrderStore((state) => state.cancelOrder);

  const storeListing = useMemo(
    () => listings.find((item) => item.id === id) ?? null,
    [listings, id],
  );

  const [fetched, setFetched] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [offerVisible, setOfferVisible] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState(1);
  const [offerMethod, setOfferMethod] = useState<string | null>(null);
  const [offerPayment, setOfferPayment] = useState<PaymentCode | null>(null);
  const [destRegion, setDestRegion] = useState<string | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<ListingShippingQuote[]>([]);
  const [isQuoting, setIsQuoting] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [paymentEditVisible, setPaymentEditVisible] = useState(false);
  const [isSavingPayments, setIsSavingPayments] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetail, setReportDetail] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const listing = storeListing ?? fetched;

  const loadListing = useCallback(async () => {
    if (!id || storeListing) return;
    setIsLoading(true);
    const result = await fetchListingById(id);
    setFetched(result);
    setIsLoading(false);
  }, [id, storeListing]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  useEffect(() => {
    if (!userId) return;
    void loadOrders(userId);
  }, [userId, loadOrders]);

  const isMine = listing?.seller_id === userId;
  const condition = getCondition(listing?.condition_rating);
  const minAllowed = listing ? Math.ceil(listing.price * condition.minRatio) : 0;
  const images = listing?.images ?? [];
  const heroHeight = Math.round(width * 0.92);

  const totalStock = listing?.quantity ?? 1;
  const remaining = listing ? remainingQuantity(listing.quantity, listing.sold_quantity) : 0;
  const isMultiStock = totalStock > 1;
  const isSoldOut = remaining <= 0 || listing?.status === 'sold';
  const maxOrderable = Math.max(1, remaining);

  const shippingOptions = listing?.shipping_options ?? [];
  const offersMeetup = shippingOptions.some((option) => option.method === MEETUP_METHOD);
  const isAutoPriced = hasAutoShipping(shippingOptions);
  const cheapest = cheapestShipping(shippingOptions);

  const fallbackMethod = offerMethod ?? cheapest?.method ?? listing?.logistics ?? MEETUP_METHOD;
  const fallbackFee =
    shippingOptions.find((option) => option.method === fallbackMethod)?.fee ?? cheapest?.fee ?? 0;

  const chosenQuote =
    liveQuotes.find((quote) => quote.method === offerMethod) ?? cheapestQuote(liveQuotes);
  const chosenMethod = chosenQuote?.method ?? fallbackMethod;
  const chosenFee = chosenQuote?.fee ?? fallbackFee;
  const needsRegion = chosenMethod !== MEETUP_METHOD;

  const offerValue = Number.parseFloat(offerPrice);
  const offerUnits = Math.min(Math.max(offerQuantity, 1), maxOrderable);
  const offerTotal = Number.isFinite(offerValue)
    ? Math.max(offerValue, 0) * offerUnits + chosenFee
    : chosenFee;

  const paymentOptions = listing?.payment_methods ?? [];
  const usablePayments = paymentsFor(paymentOptions, chosenMethod);
  // The seller may accept cash only for meetup, so the choice always falls back
  // to something valid for the delivery method the buyer currently has picked.
  const chosenPayment =
    offerPayment && usablePayments.includes(offerPayment)
      ? offerPayment
      : (usablePayments[0] ?? null);

  useEffect(() => {
    if (!offerVisible || !id) return undefined;

    let isStale = false;
    setIsQuoting(true);

    const run = async () => {
      const rows = await quoteListingShipping(id, destRegion);
      if (isStale) return;
      setLiveQuotes(rows);
      setIsQuoting(false);
    };
    void run();

    return () => {
      isStale = true;
    };
  }, [offerVisible, id, destRegion]);

  const offerRows: ListingShippingQuote[] =
    liveQuotes.length > 0
      ? liveQuotes
      : shippingOptions.map((option) => ({
          method: option.method,
          available: true,
          fee: option.fee,
          tier: null,
          note: null,
          source: option.mode === 'auto' ? 'rate_table' : 'seller',
          mode: option.mode,
          sellerFee: option.fee,
        }));

  const myOrder = useMemo(
    () =>
      orders.find(
        (order) =>
          order.listing_id === id && order.buyer_id === userId && order.status !== 'cancelled',
      ) ?? null,
    [orders, id, userId],
  );

  const incomingOrders = useMemo(
    () =>
      isMine
        ? orders.filter((order) => order.listing_id === id && order.status !== 'cancelled')
        : [],
    [orders, id, isMine],
  );

  const submitOffer = async () => {
    if (!listing) return;
    const offer = Number.parseFloat(offerPrice);

    if (!Number.isFinite(offer) || offer < minAllowed) {
      setOfferVisible(false);
      showAlert({
        title: '⚠️ 出價遭系統攔截',
        tone: 'danger',
        message: `易拍通交易所防砍價機制：\n${
          condition.minRatio === 0.9 ? '【全新品】最低出價限制 90%' : '【二手品】最低出價限制 80%'
        }\n\n該單品最低接受金額為：NT$ ${minAllowed.toLocaleString('en-US')}`,
      });
      return;
    }

    if (needsRegion && !destRegion) {
      showAlert({
        title: '請選擇收件縣市',
        tone: 'danger',
        message: '運費會依收件縣市計算（離島與偏遠地區另有加價），選好之後才能送出出價。',
      });
      return;
    }

    if (chosenQuote && !chosenQuote.available) {
      showAlert({
        title: '這個方式無法配送',
        tone: 'danger',
        message: chosenQuote.note ?? '請改選其他運送方式。',
      });
      return;
    }

    if (paymentOptions.length > 0 && !chosenPayment) {
      showAlert({
        title: '請選擇付款方式',
        tone: 'danger',
        message: `賣家設定的付款方式不適用於${chosenMethod}，請改選其他運送方式，或先私訊賣家確認。`,
      });
      return;
    }

    if (remaining <= 0) {
      showAlert({
        title: '這件商品已售完',
        message: '目前庫存都被其他買家訂走了，可以私訊賣家問問還會不會補貨。',
      });
      return;
    }

    setIsBusy(true);
    const result = await createOrder(
      listing.id,
      offer,
      chosenMethod,
      destRegion,
      chosenPayment,
      offerUnits,
    );
    setIsBusy(false);
    setOfferVisible(false);

    if (!result.ok) {
      if (result.reason === 'lowball') {
        showAlert({
          title: '⚠️ 出價遭系統攔截',
          tone: 'danger',
          message: `伺服器再次驗算防砍價門檻後仍未通過。\n\n該單品最低接受金額為：NT$ ${result.minPrice.toLocaleString('en-US')}`,
        });
        return;
      }
      if (result.reason === 'sold') {
        showAlert({
          title: '商品已完成交易',
          message: '這件商品已經售出，看看其他相似的好物吧。',
        });
        await refreshFeed();
        return;
      }
      if (result.reason === 'stock') {
        showAlert({
          title: '數量不夠了',
          tone: 'danger',
          message:
            result.remaining > 0
              ? `其他買家剛剛訂走了一部分，目前只剩 ${result.remaining} 件。請調整數量後再送出。`
              : '這件商品的庫存剛剛被訂完了，可以私訊賣家問問補貨。',
        });
        setOfferQuantity(Math.max(1, result.remaining));
        await refreshFeed();
        return;
      }
      if (result.reason === 'unavailable') {
        showAlert({
          title: '商品目前無法出價',
          message: '這件商品還在審核或已被賣家下架。',
        });
        return;
      }
      if (result.reason === 'logistics') {
        showAlert({
          title: '運送方式已變更',
          tone: 'danger',
          message: '賣家剛剛調整了這件商品的運送方式，請重新整理後再選一次。',
        });
        await refreshFeed();
        return;
      }
      if (result.reason === 'shipping') {
        showAlert({
          title: '這個方式無法配送',
          tone: 'danger',
          message:
            '伺服器依包裝尺寸與收件縣市重算後，這個運送方式不可用（可能超材積或不到貨），請改選其他方式。',
        });
        return;
      }
      if (result.reason === 'payment') {
        showAlert({
          title: '付款方式已變更',
          tone: 'danger',
          message: '賣家剛剛調整了可接受的付款方式，請重新整理後再選一次。',
        });
        await refreshFeed();
        return;
      }
      showAlert({
        title: '出價沒有送出',
        tone: 'danger',
        message: '請確認網路狀態後再試一次。',
      });
      return;
    }

    if (userId) await loadOrders(userId);
    await refreshFeed();

    const method = result.logistics ?? chosenMethod;
    const fee = result.shippingFee;
    const units = result.quantity;
    const locationInfo =
      method === MEETUP_METHOD
        ? `面交 ∙ ${listing.meetup_location ?? '雙方約定之公共場所'}`
        : `${method} ∙ 寄至${destRegion ?? '本島'} ∙ 運費 ${formatShippingFee(fee)}`;
    const payMeta = getPayment(result.paymentMethod);

    showAlert({
      title: '🤝 易拍通媒合成功！交易單已建立',
      tone: 'success',
      message: `您與賣家針對「${listing.title}」已達成共識，出價 NT$ ${offer.toLocaleString('en-US')}${units > 1 ? ` × ${units} 件` : ''}。\n\n運送方式：${locationInfo}\n付款方式：${paymentLabel(result.paymentMethod)}${payMeta ? `\n${payMeta.hint}` : ''}\n應付總計：NT$ ${(offer * units + fee).toLocaleString('en-US')}（商品 ${offer.toLocaleString('en-US')}${units > 1 ? ` × ${units}` : ''} + 運費 ${fee.toLocaleString('en-US')}）\n\n交付完成後回到「我的交易」標記完成，就能給賣家評價。`,
      confirmLabel: '前往私訊',
      dismissLabel: '稍後再說',
      onConfirm: () => {
        void openConversation();
      },
    });
  };

  const handleSavePayments = async (payments: PaymentCode[]) => {
    if (!listing) return;

    setIsSavingPayments(true);
    const ok = await setListingPayments(listing.id, payments);
    setIsSavingPayments(false);

    if (!ok) {
      showAlert({
        title: '沒有儲存成功',
        tone: 'danger',
        message: '請確認網路狀態後再試一次。',
      });
      return;
    }

    setPaymentEditVisible(false);
    setFetched((current) => (current ? { ...current, payment_methods: payments } : current));
    showAlert({
      title: '付款方式已更新',
      tone: 'success',
      message: `買家在商品頁會看到：${paymentSummary(payments)}，出價時從中選一種。`,
    });
  };

  const handleCompleteOrder = async (orderId: string) => {
    setIsBusy(true);
    const ok = await completeOrder(orderId);
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: '沒有更新成功',
        tone: 'danger',
        message: '這筆交易可能已被對方處理過，請稍後再試。',
      });
      return;
    }

    if (userId) await loadOrders(userId);
    await refreshFeed();
    showAlert({
      title: '交易已完成',
      tone: 'success',
      message: '雙方都收到通知了。買家可以到賣家主頁留下評價。',
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    setIsBusy(true);
    const ok = await cancelOrder(orderId);
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: '沒有取消成功',
        tone: 'danger',
        message: '這筆交易可能已被對方處理過，請稍後再試。',
      });
      return;
    }

    if (userId) await loadOrders(userId);
    await refreshFeed();
    showAlert({ title: '交易已取消', message: '商品重新開放出價，對方也收到通知了。' });
  };

  const openConversation = async () => {
    if (!listing) return;
    if (!requireAccount('與賣家私訊')) return;
    if (isMine) {
      showAlert({ title: '這是您自己的商品', message: '無法對自己的商品發起對話。' });
      return;
    }

    setIsBusy(true);
    const conversationId = await startConversation(listing.id);
    setIsBusy(false);

    if (!conversationId) {
      showAlert({
        title: '無法開啟對話',
        tone: 'danger',
        message: '對話沒有建立成功，請確認網路狀態後再試一次。',
      });
      return;
    }
    router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
  };

  const submitReport = async () => {
    if (!listing) return;
    setIsBusy(true);
    const ok = await reportListing(listing.id, reportReason, reportDetail);
    setIsBusy(false);
    setReportVisible(false);
    setReportDetail('');

    showAlert({
      title: ok ? '已送出檢舉' : '檢舉沒有送出',
      tone: ok ? 'success' : 'danger',
      message: ok
        ? '易拍通管理員會在後台看到這筆檢舉並人工複審。感謝你協助維護交易品質。'
        : '請稍後再試一次。',
    });
  };

  if (!listing) {
    return (
      <View className="bg-canvas flex-1 items-center justify-center px-8">
        <Stack.Screen options={{ title: '商品詳情' }} />
        {isLoading ? (
          <ActivityIndicator color={SAGE} />
        ) : (
          <>
            <Text className="text-muted text-center text-[13px]">
              找不到這件商品，可能已下架或未通過審核。
            </Text>
            <Button className="mt-4" onPress={() => goBackOrReplace('/')}>
              <Button.Label>回到探索首頁</Button.Label>
            </Button>
          </>
        )}
      </View>
    );
  }

  const moderation = getModeration(listing.moderation_status);

  return (
    <View className="bg-canvas flex-1">
      <Stack.Screen options={{ title: '商品詳情' }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width, height: heroHeight }} className="bg-neutral-100">
          {images.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {images.map((uri) => {
                const source = resolveListingImage(uri);
                return source ? (
                  <Image
                    key={uri}
                    source={source}
                    style={{ width, height: heroHeight }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    key={uri}
                    style={{ width, height: heroHeight }}
                    className="items-center justify-center"
                  >
                    <Leaf size={34} color={SAGE} strokeWidth={1.6} />
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <LinearGradient
              colors={[MINT, '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width, height: heroHeight }}
              className="items-center justify-center"
            >
              <Leaf size={40} color={SAGE} strokeWidth={1.5} />
              <Text className="text-sage-deep mt-2 text-[12px] font-semibold">
                {listing.category ?? '易拍通好物'}
              </Text>
            </LinearGradient>
          )}

          <ConditionBadge code={listing.condition_rating} className="absolute top-3 left-3" />
          {listing.status === 'available' ? null : (
            <ListingStatusBadge status={listing.status} className="absolute top-11 left-3" />
          )}
          <FavoriteButton listingId={listing.id} size={20} className="absolute top-2.5 right-3" />
          {images.length > 1 ? (
            <View className="absolute right-3 bottom-3 rounded-md bg-black/50 px-2 py-1">
              <Text className="text-[10px] font-bold text-white">
                左右滑動 ∙ {images.length} 張
              </Text>
            </View>
          ) : null}
        </View>

        <View className="px-4 pt-4">
          {listing.moderation_status !== 'approved' ? (
            <View className="bg-background mb-3 rounded-xl border border-neutral-200 p-3.5">
              <ModerationBadge status={listing.moderation_status} className="self-start" />
              <Text className="text-muted mt-2 text-[12px] leading-4">{moderation.hint}</Text>
              {listing.moderation_reason ? (
                <Text className="mt-1.5 text-[12px] leading-4 font-medium text-red-700">
                  審核備註：{listing.moderation_reason}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text className="text-foreground text-[17px] leading-6 font-bold">{listing.title}</Text>
          <Text className="text-foreground mt-2 text-2xl font-bold">
            NT$ {listing.price.toLocaleString('en-US')}
          </Text>
          <Text className="mt-1 text-[11px] font-semibold text-red-600">
            最低可接受出價 NT$ {minAllowed.toLocaleString('en-US')}（{condition.label} ∙{' '}
            {Math.round(condition.minRatio * 100)}%）
          </Text>
          {isMultiStock ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <View className={`rounded-md px-2 py-1 ${isSoldOut ? 'bg-neutral-200' : 'bg-mint'}`}>
                <Text
                  className={`text-[11px] font-bold ${
                    isSoldOut ? 'text-neutral-600' : 'text-sage-deep'
                  }`}
                >
                  {isSoldOut ? '庫存已售完' : `${stockLabel(totalStock, listing.sold_quantity)}`}
                </Text>
              </View>
              <Text className="text-muted text-[11px]">同款商品可一次購買多件</Text>
            </View>
          ) : null}

          <View className="bg-background mt-4 rounded-2xl border border-neutral-200 p-4">
            <DetailRow label="商品類別" value={`🏷️ ${listing.category ?? '未分類'}`} />
            <DetailRow label="新舊程度" value={`${condition.label} ∙ ${condition.hint}`} />
            <DetailRow
              label="商品數量"
              value={
                isMultiStock
                  ? `${remaining} 件可購買（總數 ${totalStock} 件，已成交 ${listing.sold_quantity} 件）`
                  : '單件商品（僅 1 件）'
              }
            />
            <DetailRow
              label="運費"
              value={
                cheapest
                  ? `${formatShippingFee(cheapest.fee)}起 ∙ ${shippingOptions.length} 種方式${
                      isAutoPriced ? '（本島價，依收件地重算）' : ''
                    }`
                  : '賣家尚未設定'
              }
            />
            <DetailRow
              label={offersMeetup ? '面交地點' : '出貨地'}
              value={listing.meetup_location ?? '台灣本島'}
            />
            <DetailRow label="付款方式" value={paymentSummary(paymentOptions)} />
          </View>

          <Text className="text-foreground mt-4 text-[13px] font-semibold">
            賣家提供的運送方式（買家出價時選一種）
          </Text>
          <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
            {shippingOptions.length === 0 ? (
              <Text className="text-muted text-[12px] leading-4">
                賣家尚未設定運送方式，出價前建議先私訊確認。
              </Text>
            ) : (
              shippingOptions.map((option, index) => (
                <View
                  key={option.method}
                  className={`py-2 ${index === 0 ? '' : 'border-t border-neutral-100'}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-1.5">
                      <Truck size={13} color={SAGE} strokeWidth={2.2} />
                      <Text className="text-foreground text-[12px] font-medium">
                        {option.method}
                      </Text>
                      {option.mode === 'auto' && option.method !== MEETUP_METHOD ? (
                        <View className="bg-mint rounded px-1.5 py-0.5">
                          <Text className="text-sage-deep text-[9px] font-bold">自動試算</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      className={`text-[12px] font-bold ${
                        option.fee <= 0 ? 'text-sage-deep' : 'text-foreground'
                      }`}
                    >
                      {formatShippingFee(option.fee)}
                      {option.mode === 'auto' && option.method !== MEETUP_METHOD ? ' 起' : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
            <Text className="text-muted mt-2 text-[11px] leading-4">
              {isAutoPriced
                ? '「自動試算」的運費依包裝重量、材積與收件縣市計算，出價時會即時重算並加到您的應付總計；離島與偏遠地區另有加價。'
                : '運費由賣家自訂，會在出價時加到您的應付總計。'}
            </Text>
          </View>

          <Text className="text-foreground mt-4 text-[13px] font-semibold">
            買家的取貨與付款方式（出價時選一種）
          </Text>
          <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
            {paymentOptions.length === 0 ? (
              <Text className="text-muted text-[12px] leading-4">
                {isMine
                  ? '您還沒設定付款方式，買家出價後只能在私訊中另外確認怎麼付款。'
                  : '賣家尚未設定付款方式，出價成立後請在私訊中確認怎麼付款。'}
              </Text>
            ) : (
              paymentOptions.map((code, index) => {
                const meta = getPayment(code);
                if (!meta) return null;
                return (
                  <View
                    key={code}
                    className={`py-2 ${index === 0 ? '' : 'border-t border-neutral-100'}`}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Wallet size={13} color={SAGE} strokeWidth={2.2} />
                      <Text className="text-foreground flex-1 text-[12px] font-medium">
                        {meta.emoji} {meta.label}
                      </Text>
                      <Text className="text-muted text-[10px] font-semibold">
                        {meta.scope === 'meetup'
                          ? '限面交'
                          : meta.scope === 'shipped'
                            ? '限寄送'
                            : '面交／寄送皆可'}
                      </Text>
                    </View>
                    <Text className="text-muted mt-1 text-[11px] leading-4">{meta.hint}</Text>
                  </View>
                );
              })
            )}
            <Text className="text-muted mt-2 text-[11px] leading-4">
              取貨方式就是上面選定的運送方式：超商店到店到店取貨、宅配送到指定地址、面交則由雙方碰面交付。
            </Text>
            {isMine ? (
              <Button
                size="sm"
                variant={paymentOptions.length === 0 ? 'primary' : 'secondary'}
                className="mt-3"
                onPress={() => setPaymentEditVisible(true)}
              >
                <Button.Label>
                  {paymentOptions.length === 0 ? '補設定付款方式' : '調整付款方式'}
                </Button.Label>
              </Button>
            ) : null}
          </View>

          <Text className="text-foreground mt-4 text-[13px] font-semibold">商品描述</Text>
          <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
            <Text className="text-muted text-[13px] leading-5">
              {listing.description ?? '賣家沒有填寫描述，可以直接私訊詢問細節。'}
            </Text>
          </View>

          {listing.meetup_location ? (
            <>
              <Text className="text-foreground mt-4 text-[13px] font-semibold">
                {offersMeetup ? '面交地點' : '商品所在地'}
              </Text>
              <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
                <View className="flex-row items-center gap-1.5">
                  <MapPin size={13} color={SAGE} strokeWidth={2.2} />
                  <Text className="text-foreground flex-1 text-[13px] font-medium">
                    {listing.meetup_location}
                  </Text>
                </View>
                <Text className="text-muted mt-2 text-[11px] leading-4">
                  {offersMeetup
                    ? '碰面請選人潮多、有監視器的公共場所，並在私訊中先確認時間。'
                    : '寄送前請與賣家確認包裝方式，並保留寄件單據。'}
                </Text>
              </View>
            </>
          ) : null}

          {myOrder ? (
            <>
              <Text className="text-foreground mt-4 text-[13px] font-semibold">我的交易</Text>
              <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
                <View
                  className={`self-start rounded-md px-1.5 py-0.5 ${
                    ORDER_STATUS_META[getOrderStatus(myOrder.status)].bgClass
                  }`}
                >
                  <Text
                    className={`text-[9px] font-bold ${
                      ORDER_STATUS_META[getOrderStatus(myOrder.status)].textClass
                    }`}
                  >
                    {ORDER_STATUS_META[getOrderStatus(myOrder.status)].label}
                  </Text>
                </View>
                <Text className="text-foreground mt-2 text-[14px] font-bold">
                  成交價 NT$ {myOrder.offer_price.toLocaleString('en-US')}
                  {myOrder.quantity > 1 ? ` × ${myOrder.quantity} 件` : ''}
                </Text>
                <Text className="text-sage-deep mt-0.5 text-[11px] font-semibold">
                  {myOrder.logistics ?? '面交'}
                  {myOrder.dest_region ? ` ∙ 寄至${myOrder.dest_region}` : ''} ∙ 運費{' '}
                  {formatShippingFee(myOrder.shipping_fee)} ∙ 應付總計 NT${' '}
                  {orderTotal(myOrder).toLocaleString('en-US')}
                </Text>
                <Text className="text-muted mt-0.5 text-[11px] font-medium">
                  付款方式：{paymentLabel(myOrder.payment_method)}
                </Text>
                <Text className="text-muted mt-1 text-[11px] leading-4">
                  {ORDER_STATUS_META[getOrderStatus(myOrder.status)].hint}
                </Text>

                <View className="mt-3 flex-row gap-2">
                  {myOrder.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={isBusy}
                        onPress={() => {
                          void handleCancelOrder(myOrder.id);
                        }}
                      >
                        <Button.Label>取消交易</Button.Label>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        isDisabled={isBusy}
                        onPress={() => {
                          void handleCompleteOrder(myOrder.id);
                        }}
                      >
                        <Button.Label>標記完成交易</Button.Label>
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      onPress={() =>
                        router.push({
                          pathname: '/seller/[id]',
                          params: { id: listing.seller_id },
                        })
                      }
                    >
                      <Star size={13} color="#FFFFFF" strokeWidth={2.2} />
                      <Button.Label>評價這位賣家</Button.Label>
                    </Button>
                  )}
                </View>
              </View>
            </>
          ) : null}

          {incomingOrders.length > 0 ? (
            <>
              <Text className="text-foreground mt-4 text-[13px] font-semibold">
                買家出價（{incomingOrders.length}）
              </Text>
              <View className="mt-2 gap-2">
                {incomingOrders.map((order) => {
                  const meta = ORDER_STATUS_META[getOrderStatus(order.status)];
                  return (
                    <View
                      key={order.id}
                      className="bg-background rounded-2xl border border-neutral-200 p-4"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-foreground text-[13px] font-bold">
                          {order.counterpartName ?? '易拍通買家'}
                        </Text>
                        <View className={`rounded-md px-1.5 py-0.5 ${meta.bgClass}`}>
                          <Text className={`text-[9px] font-bold ${meta.textClass}`}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-foreground mt-1.5 text-[14px] font-bold">
                        出價 NT$ {order.offer_price.toLocaleString('en-US')}
                        {order.quantity > 1 ? ` × ${order.quantity} 件` : ''}
                      </Text>
                      <Text className="text-sage-deep mt-0.5 text-[11px] font-semibold">
                        買家選擇 {order.logistics ?? '面交'}
                        {order.dest_region ? ` ∙ 寄至${order.dest_region}` : ''} ∙ 運費{' '}
                        {formatShippingFee(order.shipping_fee)} ∙ 應收總計 NT${' '}
                        {orderTotal(order).toLocaleString('en-US')}
                      </Text>
                      <Text className="text-muted mt-0.5 text-[11px] font-medium">
                        付款方式：{paymentLabel(order.payment_method)}
                      </Text>
                      {order.status === 'pending' ? (
                        <View className="mt-3 flex-row gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            isDisabled={isBusy}
                            onPress={() => {
                              void handleCancelOrder(order.id);
                            }}
                          >
                            <Button.Label>取消</Button.Label>
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            isDisabled={isBusy}
                            onPress={() => {
                              void handleCompleteOrder(order.id);
                            }}
                          >
                            <Button.Label>已交付，標記完成</Button.Label>
                          </Button>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text className="text-foreground mt-4 text-[13px] font-semibold">賣家資訊</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/seller/[id]', params: { id: listing.seller_id } })
            }
            className="bg-background mt-2 flex-row items-center rounded-2xl border border-neutral-200 p-4"
          >
            <Avatar name={listing.seller?.username} size={44} />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center gap-1">
                <Text className="text-foreground text-[14px] font-bold">
                  {listing.seller?.username ?? '易拍通賣家'}
                </Text>
                {listing.seller?.verified_status ? (
                  <BadgeCheck size={14} color={SAGE} strokeWidth={2} />
                ) : null}
              </View>
              <Text className="text-sage-deep mt-0.5 text-[11px] font-semibold">
                信任度 {listing.seller?.trust_score ?? 80}% ∙ 查看評價與其他商品
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!requireAccount('檢舉商品')) return;
              setReportVisible(true);
            }}
            className="mt-4 flex-row items-center justify-center gap-1.5 py-2"
          >
            <Flag size={13} color="#9CA3AF" strokeWidth={2} />
            <Text className="text-muted text-[12px] font-medium">檢舉這件商品給管理員</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View className="bg-background pb-safe-offset-3 border-t border-neutral-200 px-4 pt-3">
        {isMine ? (
          <Button variant="secondary" onPress={() => router.push('/(tabs)/profile')}>
            <Button.Label>這是您的商品 ∙ 前往個人主頁管理</Button.Label>
          </Button>
        ) : (
          <View className="flex-row gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              isDisabled={isBusy}
              onPress={() => {
                void openConversation();
              }}
            >
              <MessageCircle size={15} color={SAGE} strokeWidth={2.2} />
              <Button.Label>私訊賣家</Button.Label>
            </Button>
            <Button
              className="flex-1"
              isDisabled={isSoldOut || myOrder?.status === 'pending'}
              onPress={() => {
                if (!requireAccount('出價')) return;
                setOfferPrice('');
                setOfferQuantity(1);
                setOfferMethod(cheapest?.method ?? null);
                setOfferPayment(null);
                setOfferVisible(true);
              }}
            >
              <Button.Label>
                {isSoldOut ? '已售完' : myOrder?.status === 'pending' ? '交易進行中' : '出價與媒合'}
              </Button.Label>
            </Button>
          </View>
        )}
      </View>

      <PaymentMethodsSheet
        listing={paymentEditVisible && isMine ? listing : null}
        isSaving={isSavingPayments}
        onCancel={() => setPaymentEditVisible(false)}
        onSave={(payments) => {
          void handleSavePayments(payments);
        }}
      />

      <Modal
        visible={offerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOfferVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <View className="bg-background max-h-[86%] w-full max-w-sm rounded-2xl border border-neutral-200">
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-foreground text-base font-bold">出價與媒合</Text>
              <Text className="text-muted mt-2 text-[13px]" numberOfLines={2}>
                {listing.title}
              </Text>
              <Text className="text-foreground mt-1 text-sm font-bold">
                賣家標價 NT$ {listing.price.toLocaleString('en-US')}
              </Text>
              <Text className="mt-1 text-[11px] font-semibold text-red-600">
                最低可接受出價：NT$ {minAllowed.toLocaleString('en-US')}
                {isMultiStock ? '（每件）' : ''}
              </Text>

              <TextInput
                value={offerPrice}
                onChangeText={setOfferPrice}
                keyboardType="number-pad"
                placeholder={isMultiStock ? '輸入每件的出價金額' : '輸入您的出價金額'}
                placeholderTextColorClassName="accent-neutral-400"
                className="bg-canvas text-foreground mt-4 h-11 rounded-xl border border-neutral-200 px-4 text-sm"
              />

              {isMultiStock ? (
                <>
                  <Text className="text-foreground mt-4 text-[12px] font-semibold">
                    購買數量（剩 {remaining} 件）
                  </Text>
                  <QuantityStepper
                    value={offerUnits}
                    onChange={setOfferQuantity}
                    max={maxOrderable}
                    className="mt-2"
                    hint="出價金額是單件價格，運費以一次寄送計算。"
                  />
                </>
              ) : null}
              {shippingOptions.some((option) => option.method !== MEETUP_METHOD) ? (
                <>
                  <Text className="text-foreground mt-4 text-[12px] font-semibold">
                    收件縣市（決定運費）
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-1.5">
                    {TAIWAN_REGIONS.map((name) => (
                      <SelectChip
                        key={name}
                        size="sm"
                        label={name}
                        isSelected={destRegion === name}
                        onPress={() => setDestRegion(name)}
                        className="rounded-md"
                      />
                    ))}
                  </View>
                  <Text className="text-muted mt-1.5 text-[11px] leading-4">
                    澎湖／金門／連江為離島加價，花蓮／台東為偏遠加價，選好後下方運費會即時重算。
                  </Text>
                </>
              ) : null}

              {offerRows.length > 0 ? (
                <>
                  <Text className="text-foreground mt-4 text-[12px] font-semibold">
                    選擇運送方式
                  </Text>
                  <View className="mt-2 gap-1.5">
                    {offerRows.map((option) => {
                      const isChosen = chosenMethod === option.method;
                      return (
                        <Pressable
                          key={option.method}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isChosen, disabled: !option.available }}
                          onPress={() => {
                            if (!option.available) return;
                            setOfferMethod(option.method);
                          }}
                          className={`rounded-xl border px-3 py-2.5 ${
                            !option.available
                              ? 'border-neutral-200 bg-neutral-50'
                              : isChosen
                                ? 'border-sage bg-mint'
                                : 'bg-canvas border-neutral-200'
                          }`}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text
                              className={`flex-1 text-[12px] ${
                                !option.available
                                  ? 'text-muted font-medium'
                                  : isChosen
                                    ? 'text-sage-deep font-bold'
                                    : 'text-muted font-medium'
                              }`}
                            >
                              {option.method}
                            </Text>
                            <Text
                              className={`text-[12px] font-bold ${
                                !option.available
                                  ? 'text-neutral-400'
                                  : isChosen
                                    ? 'text-sage-deep'
                                    : 'text-muted'
                              }`}
                            >
                              {option.available ? formatShippingFee(option.fee) : '無法配送'}
                            </Text>
                          </View>
                          {option.note ? (
                            <Text className="text-muted mt-1 text-[10px] leading-4">
                              {option.available && option.tier ? `${option.tier} ∙ ` : ''}
                              {option.note}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text className="text-foreground mt-4 text-[12px] font-semibold">付款方式</Text>
              <View className="mt-2">
                <PaymentChoiceList
                  options={paymentOptions}
                  logistics={chosenMethod}
                  value={chosenPayment}
                  onChange={setOfferPayment}
                />
              </View>

              <View className="bg-canvas mt-3 rounded-xl px-3 py-2.5">
                {isMultiStock ? (
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-muted flex-1 text-[11px]">商品（{offerUnits} 件）</Text>
                    <Text className="text-foreground text-[11px] font-semibold">
                      {Number.isFinite(offerValue)
                        ? `NT$ ${(Math.max(offerValue, 0) * offerUnits).toLocaleString('en-US')}`
                        : '請先輸入出價'}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted flex-1 text-[11px]">
                    運費（{chosenMethod}
                    {chosenQuote ? ` ∙ ${sourceLabel(chosenQuote.source)}` : ''}）
                  </Text>
                  {isQuoting ? (
                    <ActivityIndicator size="small" color={SAGE} />
                  ) : (
                    <Text className="text-foreground text-[11px] font-semibold">
                      {formatShippingFee(chosenFee)}
                    </Text>
                  )}
                </View>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-foreground text-[12px] font-bold">應付總計</Text>
                  <Text className="text-foreground text-[14px] font-bold">
                    NT$ {offerTotal.toLocaleString('en-US')}
                  </Text>
                </View>
                <Text className="text-muted mt-1 text-[11px]">
                  取貨：{chosenMethod} ∙ 付款：{paymentLabel(chosenPayment)}
                  {isMultiStock ? ` ∙ 數量 ${offerUnits} 件` : ''}
                </Text>
              </View>

              <View className="mt-4 flex-row gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onPress={() => setOfferVisible(false)}
                >
                  <Button.Label>取消</Button.Label>
                </Button>
                <Button
                  className="flex-1"
                  isDisabled={isBusy}
                  onPress={() => {
                    void submitOffer();
                  }}
                >
                  <Button.Label>{isBusy ? '送出中...' : '送出出價'}</Button.Label>
                </Button>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <View className="bg-background w-full max-w-sm rounded-2xl border border-neutral-200 p-5">
            <Text className="text-foreground text-base font-bold">檢舉商品</Text>
            <Text className="text-muted mt-2 text-[12px] leading-4">
              檢舉會直接進入管理員後台的待處理清單，並保留你的帳號紀錄。
            </Text>

            <View className="mt-3 gap-1.5">
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  accessibilityRole="button"
                  accessibilityState={{ selected: reportReason === reason }}
                  onPress={() => setReportReason(reason)}
                  className={`h-10 justify-center rounded-xl border px-3 ${
                    reportReason === reason ? 'border-sage bg-mint' : 'bg-canvas border-neutral-200'
                  }`}
                >
                  <Text
                    className={`text-[12px] ${
                      reportReason === reason
                        ? 'text-sage-deep font-bold'
                        : 'text-muted font-medium'
                    }`}
                  >
                    {reason}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={reportDetail}
              onChangeText={setReportDetail}
              multiline
              textAlignVertical="top"
              placeholder="補充說明（選填）"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-canvas text-foreground mt-3 h-20 rounded-xl border border-neutral-200 px-3 pt-2.5 text-[13px]"
            />

            <View className="mt-4 flex-row gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => setReportVisible(false)}
              >
                <Button.Label>取消</Button.Label>
              </Button>
              <Button
                className="flex-1"
                isDisabled={isBusy}
                onPress={() => {
                  void submitReport();
                }}
              >
                <Button.Label>送出檢舉</Button.Label>
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between py-1.5">
      <Text className="text-muted text-[12px]">{label}</Text>
      <Text className="text-foreground ml-4 flex-1 text-right text-[12px] font-medium">
        {value}
      </Text>
    </View>
  );
}
