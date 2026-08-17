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
import { BadgeCheck, ChevronRight, Flag, Leaf, MessageCircle } from 'lucide-react-native';

import { ConditionBadge } from '@/components/ConditionBadge';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ModerationBadge } from '@/components/ModerationBadge';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { showAlert } from '@/lib/alert';
import { useChatStore } from '@/lib/chatStore';
import { MINT, REPORT_REASONS, SAGE, getCondition, getModeration } from '@/lib/constants';
import { resolveListingImage } from '@/lib/demoImages';
import { goBackOrReplace } from '@/lib/navigation';
import { fetchListingById } from '@/lib/queries';
import { requireAccount } from '@/lib/requireAccount';
import { type Listing, useLetaoStore } from '@/lib/store';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const userId = useLetaoStore((state) => state.userId);
  const listings = useLetaoStore((state) => state.listings);
  const reportListing = useLetaoStore((state) => state.reportListing);
  const startConversation = useChatStore((state) => state.startConversation);

  const storeListing = useMemo(
    () => listings.find((item) => item.id === id) ?? null,
    [listings, id],
  );

  const [fetched, setFetched] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [offerVisible, setOfferVisible] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [reportVisible, setReportVisible] = useState(false);
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

  const isMine = listing?.seller_id === userId;
  const condition = getCondition(listing?.condition_rating);
  const minAllowed = listing ? Math.ceil(listing.price * condition.minRatio) : 0;
  const images = listing?.images ?? [];
  const heroHeight = Math.round(width * 0.92);

  const submitOffer = () => {
    if (!listing) return;
    const offer = Number.parseFloat(offerPrice);

    if (!Number.isFinite(offer) || offer < minAllowed) {
      setOfferVisible(false);
      showAlert({
        title: '⚠️ 出價遭系統攔截',
        tone: 'danger',
        message: `樂淘交易所防砍價機制：\n${
          condition.minRatio === 0.9 ? '【全新品】最低出價限制 90%' : '【二手品】最低出價限制 80%'
        }\n\n該單品最低接受金額為：NT$ ${minAllowed.toLocaleString('en-US')}`,
      });
      return;
    }

    setOfferVisible(false);
    setTimeout(() => {
      const locationInfo =
        listing.logistics === '面交'
          ? (listing.meetup_location ?? '雙方約定之公共場所')
          : `${listing.logistics ?? '指定物流'}（設定的指定物流）`;
      showAlert({
        title: '🤝 樂淘媒合成功！準備面交囉',
        tone: 'success',
        message: `您與對方針對「${listing.title}」已達成交易共識。\n\n安全交手節點：${locationInfo}。\n\n接下來可以在「即時私訊」和賣家確認細節，完成後別忘了給賣家評價。`,
        confirmLabel: '前往私訊',
        dismissLabel: '稍後再說',
        onConfirm: () => {
          void openConversation();
        },
      });
    }, 700);
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
        ? '樂淘管理員會在後台看到這筆檢舉並人工複審。感謝你協助維護交易品質。'
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
                {listing.category ?? '樂淘好物'}
              </Text>
            </LinearGradient>
          )}

          <ConditionBadge code={listing.condition_rating} className="absolute top-3 left-3" />
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

          <View className="bg-background mt-4 rounded-2xl border border-neutral-200 p-4">
            <DetailRow label="商品類別" value={`🏷️ ${listing.category ?? '未分類'}`} />
            <DetailRow label="新舊程度" value={`${condition.label} ∙ ${condition.hint}`} />
            <DetailRow label="運送方式" value={`🚚 ${listing.logistics ?? '面交'}`} />
            <DetailRow
              label={listing.logistics === '面交' ? '面交地點' : '所在地'}
              value={listing.meetup_location ?? '台灣本島'}
            />
          </View>

          <Text className="text-foreground mt-4 text-[13px] font-semibold">商品描述</Text>
          <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
            <Text className="text-muted text-[13px] leading-5">
              {listing.description ?? '賣家沒有填寫描述，可以直接私訊詢問細節。'}
            </Text>
          </View>

          <Text className="text-foreground mt-4 text-[13px] font-semibold">賣家資訊</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/seller/[id]', params: { id: listing.seller_id } })
            }
            className="bg-background mt-2 flex-row items-center rounded-2xl border border-neutral-200 p-4"
          >
            <View className="bg-mint h-11 w-11 items-center justify-center rounded-full">
              <Text className="text-sage-deep text-[15px] font-bold">
                {(listing.seller?.username ?? 'L').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <View className="flex-row items-center gap-1">
                <Text className="text-foreground text-[14px] font-bold">
                  {listing.seller?.username ?? '樂淘賣家'}
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
              onPress={() => {
                if (!requireAccount('出價')) return;
                setOfferPrice('');
                setOfferVisible(true);
              }}
            >
              <Button.Label>出價與媒合</Button.Label>
            </Button>
          </View>
        )}
      </View>

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
          <View className="bg-background w-full max-w-sm rounded-2xl border border-neutral-200 p-5">
            <Text className="text-foreground text-base font-bold">出價與媒合</Text>
            <Text className="text-muted mt-2 text-[13px]" numberOfLines={2}>
              {listing.title}
            </Text>
            <Text className="text-foreground mt-1 text-sm font-bold">
              賣家標價 NT$ {listing.price.toLocaleString('en-US')}
            </Text>
            <Text className="mt-1 text-[11px] font-semibold text-red-600">
              最低可接受出價：NT$ {minAllowed.toLocaleString('en-US')}
            </Text>

            <TextInput
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="number-pad"
              placeholder="輸入您的出價金額"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-canvas text-foreground mt-4 h-11 rounded-xl border border-neutral-200 px-4 text-sm"
            />

            <View className="mt-4 flex-row gap-2">
              <Button variant="secondary" className="flex-1" onPress={() => setOfferVisible(false)}>
                <Button.Label>取消</Button.Label>
              </Button>
              <Button className="flex-1" onPress={submitOffer}>
                <Button.Label>送出出價</Button.Label>
              </Button>
            </View>
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
