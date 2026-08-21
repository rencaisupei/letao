import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { listContent, screenContent } from '@/lib/layout';
import { Button } from 'heroui-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  BadgeCheck,
  Bell,
  Boxes,
  ChevronRight,
  CircleHelp,
  Coins,
  FileLock2,
  FileText,
  Flame,
  Heart,
  LifeBuoy,
  PackageCheck,
  Pencil,
  ShieldCheck,
  Star,
  Trash2,
  UserPlus,
  Wallet,
  Zap,
} from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { BumpFx } from '@/components/BumpFx';
import { ListingCard } from '@/components/ListingCard';
import { ModerationBadge } from '@/components/ModerationBadge';
import { PaymentMethodsSheet } from '@/components/PaymentMethodsSheet';
import { StockSheet } from '@/components/StockSheet';
import { showAlert } from '@/lib/alert';
import {
  BUMP_COST,
  BUMP_DURATION_LABEL,
  DAILY_STREAK_CAP,
  type PaymentCode,
  SAGE,
  dailyRewardFor,
  getModeration,
  getRoleLabel,
  paymentSummary,
  remainingQuantity,
} from '@/lib/constants';
import { useNotificationStore } from '@/lib/notificationStore';
import { useOrderStore } from '@/lib/orderStore';
import { type Listing, useAppStore } from '@/lib/store';
import { formatRemaining } from '@/lib/utils';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const userId = useAppStore((state) => state.userId);
  const username = useAppStore((state) => state.username);
  const avatarUrl = useAppStore((state) => state.avatarUrl);
  const role = useAppStore((state) => state.role);
  const trustScore = useAppStore((state) => state.trustScore);
  const verified = useAppStore((state) => state.verified);
  const balance = useAppStore((state) => state.balance);
  const lastClaimAt = useAppStore((state) => state.lastClaimAt);
  const claimStreak = useAppStore((state) => state.claimStreak);
  const listings = useAppStore((state) => state.listings);
  const favorites = useAppStore((state) => state.favorites);
  const promotedUntil = useAppStore((state) => state.promotedUntil);
  const isRefreshing = useAppStore((state) => state.isRefreshing);
  const refresh = useAppStore((state) => state.refresh);
  const bump = useAppStore((state) => state.bump);
  const claimDaily = useAppStore((state) => state.claimDaily);
  const setListingStatus = useAppStore((state) => state.setListingStatus);
  const setListingPayments = useAppStore((state) => state.setListingPayments);
  const setListingQuantity = useAppStore((state) => state.setListingQuantity);
  const deleteListing = useAppStore((state) => state.deleteListing);
  const signOut = useAppStore((state) => state.signOut);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.load);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const [playTokens, setPlayTokens] = useState<Record<string, number>>({});
  const [pendingBump, setPendingBump] = useState<Listing | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null);
  const [pendingPayments, setPendingPayments] = useState<Listing | null>(null);
  const [isSavingPayments, setIsSavingPayments] = useState(false);
  const [pendingStock, setPendingStock] = useState<Listing | null>(null);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [isBumping, setIsBumping] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const cardWidth = width - 36;
  const favoriteCount = Object.keys(favorites).length;

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void loadOrders(userId);
    }, [userId, loadOrders]),
  );

  const myListings = useMemo(
    () => listings.filter((listing) => listing.seller_id === userId),
    [listings, userId],
  );

  const publicCount = myListings.filter(
    (listing) => listing.moderation_status === 'approved',
  ).length;

  const pendingOrderCount = orders.filter((order) => order.status === 'pending').length;

  const nextClaimAt = lastClaimAt ? new Date(lastClaimAt).getTime() + DAY_MS : 0;
  const canClaim = Date.now() >= nextClaimAt;
  const nextReward = dailyRewardFor(canClaim ? claimStreak + 1 : claimStreak);

  const handleConfirmBump = async () => {
    const listing = pendingBump;
    if (!listing) return;

    setIsBumping(true);
    const result = await bump(listing.id);
    setIsBumping(false);
    setPendingBump(null);

    if (result.ok) {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setPlayTokens((previous) => ({
        ...previous,
        [listing.id]: (previous[listing.id] ?? 0) + 1,
      }));
      return;
    }

    if (result.reason === 'insufficient') {
      showAlert({
        title: '餘額不足',
        tone: 'danger',
        message: `提升排名需要 ${BUMP_COST} 枚 EcoCoins，您目前只有 ${result.balance} 枚。先領取每日 EcoCoins 再回來提升吧。`,
      });
      return;
    }

    if (result.reason === 'active') {
      showAlert({
        title: '置頂效果仍在進行中',
        message: '這件商品目前已在置頂曝光，等這一輪結束後就能再次提升排名。',
      });
      return;
    }

    showAlert({
      title: '提升失敗',
      tone: 'danger',
      message: '交易沒有完成，EcoCoins 不會被扣除。請稍後再試一次。',
    });
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    const result = await claimDaily();
    setIsClaiming(false);

    if (result.ok) {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      showAlert({
        title: `已入帳 ${result.amount} 枚 EcoCoins`,
        tone: 'success',
        message: `連續簽到 ${result.streak} 天，目前錢包餘額 ${result.balance} 枚。連續簽到到第 ${DAILY_STREAK_CAP} 天可拿到最高獎勵。`,
      });
      return;
    }

    showAlert({
      title: '今天已經領過了',
      message: result.nextClaimAt
        ? `每 24 小時可以領取一次。${formatRemaining(result.nextClaimAt)}後就能再領。`
        : '每 24 小時可以領取一次 EcoCoins，明天再回來吧。',
    });
  };

  const handleToggleHidden = async (listing: Listing) => {
    const nextStatus = listing.status === 'hidden' ? 'available' : 'hidden';
    const ok = await setListingStatus(listing.id, nextStatus);

    if (!ok) {
      showAlert({
        title: '沒有更新成功',
        tone: 'danger',
        message: '請確認網路狀態後再試一次。',
      });
      return;
    }

    showAlert({
      title: nextStatus === 'hidden' ? '商品已下架' : '商品已重新上架',
      tone: 'success',
      message:
        nextStatus === 'hidden'
          ? '買家在探索首頁上都看不到這件商品了，你隨時可以重新上架。'
          : '商品重新公開在探索首頁，開始接受出價。',
    });
  };

  const handleSavePayments = async (payments: PaymentCode[]) => {
    const listing = pendingPayments;
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

    setPendingPayments(null);
    showAlert({
      title: '付款方式已更新',
      tone: 'success',
      message: `買家在商品頁會看到：${paymentSummary(payments)}，出價時從中選一種。`,
    });
  };

  const handleSaveQuantity = async (quantity: number) => {
    const listing = pendingStock;
    if (!listing) return;

    setIsSavingStock(true);
    const result = await setListingQuantity(listing.id, quantity);
    setIsSavingStock(false);

    if (!result.ok) {
      if (result.reason === 'committed') {
        showAlert({
          title: '不能少於已成交的件數',
          tone: 'danger',
          message: `這件商品已有 ${result.committed} 件被成交或預訂，總數至少要 ${result.committed} 件。若要停售，請用「暫時下架」。`,
        });
        return;
      }
      showAlert({
        title: '沒有更新成功',
        tone: 'danger',
        message: '請確認網路狀態後再試一次。',
      });
      return;
    }

    setPendingStock(null);
    const remaining = remainingQuantity(result.quantity, result.soldQuantity);
    showAlert({
      title: '庫存已更新',
      tone: 'success',
      message:
        remaining > 0
          ? `總數 ${result.quantity} 件，買家目前可購買 ${remaining} 件。`
          : `總數 ${result.quantity} 件已全部售出或預訂，商品標記為${
              result.status === 'sold' ? '已售出' : '已預訂'
            }，補貨後會自動重新開放。`,
    });
  };

  const handleConfirmDelete = async () => {
    const listing = pendingDelete;
    if (!listing) return;

    setPendingDelete(null);
    const ok = await deleteListing(listing.id);

    showAlert({
      title: ok ? '商品已刪除' : '刪除失敗',
      tone: ok ? 'success' : 'danger',
      message: ok ? '商品與相關收藏紀錄都已移除，這個動作無法復原。' : '請確認網路狀態後再試一次。',
    });
  };

  if (!userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={32} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">建立您的易拍通帳號</Text>
          <Text className="text-muted mt-2 text-center text-sm leading-5">
            註冊後才會有 EcoCoins
            錢包、收藏清單、私訊、評價與信任度。買家與賣家共用同一組帳號，可隨時切換身分。
          </Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊 / 登入</Button.Label>
          </Button>
        </View>

        <View className="bg-background mt-3 rounded-2xl border border-neutral-200 p-4">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={16} color={SAGE} strokeWidth={2} />
            <Text className="text-foreground text-sm font-semibold">為什麼一定要註冊</Text>
          </View>
          <Text className="text-muted mt-2 text-xs leading-5">
            易拍通的防砍價機制、賣家信任度與內容審核都綁在帳號上。沒有帳號的訪客可以自由瀏覽商品，但無法出價、上架、私訊或收藏。
          </Text>
        </View>

        <View className="bg-background mt-3 rounded-2xl border border-neutral-200">
          <ProfileLink
            icon={<CircleHelp size={16} color={SAGE} strokeWidth={2} />}
            label="常見問題"
            value="運送、付款與糾紛處理"
            onPress={() => router.push('/faq')}
          />
          <ProfileLink
            icon={<LifeBuoy size={16} color={SAGE} strokeWidth={2} />}
            label="聯絡我們"
            value="客服與問題回報"
            onPress={() => router.push('/contact')}
          />
          <ProfileLink
            icon={<FileLock2 size={16} color={SAGE} strokeWidth={2} />}
            label="隱私權政策"
            value="資料如何被使用"
            onPress={() => router.push('/privacy')}
          />
          <ProfileLink
            icon={<FileText size={16} color={SAGE} strokeWidth={2} />}
            label="服務條款"
            value="使用規範與禁止行為"
            onPress={() => router.push('/terms')}
            isLast
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="bg-canvas flex-1">
      <FlatList
        data={myListings}
        keyExtractor={(item) => item.id}
        refreshing={isRefreshing}
        onRefresh={() => {
          void refresh();
        }}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          <View className="gap-3">
            <View className="bg-background flex-row items-center rounded-2xl border border-neutral-200 p-4">
              <Avatar uri={avatarUrl} name={username} size={48} />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-1">
                  <Text className="text-foreground text-base font-bold">
                    {username ?? '易拍通用戶'}
                  </Text>
                  {verified ? <BadgeCheck size={15} color={SAGE} strokeWidth={2} /> : null}
                </View>
                <Text className="text-sage-deep text-2xs mt-0.5 font-semibold">
                  {getRoleLabel(role)} ∙ 信任度 {trustScore}% ∙ 公開上架 {publicCount} 件
                </Text>
              </View>
              <Button size="sm" variant="tertiary" onPress={() => router.push('/account')}>
                <Pencil size={13} color={SAGE} strokeWidth={2.2} />
                <Button.Label>編輯</Button.Label>
              </Button>
            </View>

            <View className="bg-background rounded-2xl border border-neutral-200">
              <ProfileLink
                icon={<PackageCheck size={16} color={SAGE} strokeWidth={2} />}
                label="我的交易"
                value={
                  pendingOrderCount > 0 ? `${pendingOrderCount} 筆待完成` : `${orders.length} 筆`
                }
                onPress={() => router.push('/orders')}
              />
              <ProfileLink
                icon={<Bell size={16} color={SAGE} strokeWidth={2} />}
                label="通知中心"
                value={unreadCount > 0 ? `${unreadCount} 則未讀` : '沒有未讀'}
                onPress={() => router.push('/notifications')}
              />
              <ProfileLink
                icon={<Heart size={16} color={SAGE} strokeWidth={2} />}
                label="我的收藏"
                value={`${favoriteCount} 件`}
                onPress={() => router.push('/favorites')}
              />
              <ProfileLink
                icon={<Star size={16} color={SAGE} strokeWidth={2} />}
                label="我的賣家主頁與評價"
                value={`信任度 ${trustScore}%`}
                onPress={() => router.push({ pathname: '/seller/[id]', params: { id: userId } })}
              />
              <ProfileLink
                icon={<CircleHelp size={16} color={SAGE} strokeWidth={2} />}
                label="常見問題"
                value="運送、付款與糾紛處理"
                onPress={() => router.push('/faq')}
              />
              <ProfileLink
                icon={<LifeBuoy size={16} color={SAGE} strokeWidth={2} />}
                label="聯絡我們"
                value="客服與問題回報"
                onPress={() => router.push('/contact')}
              />
              <ProfileLink
                icon={<FileLock2 size={16} color={SAGE} strokeWidth={2} />}
                label="隱私權政策"
                value="資料如何被使用"
                onPress={() => router.push('/privacy')}
              />
              <ProfileLink
                icon={<FileText size={16} color={SAGE} strokeWidth={2} />}
                label="服務條款"
                value="使用規範與帳號刪除"
                onPress={() => router.push('/terms')}
                isLast
              />
            </View>

            <View className="bg-background rounded-2xl border border-neutral-200 p-4">
              <View className="flex-row items-center gap-2">
                <Coins size={18} color={SAGE} strokeWidth={1.8} />
                <Text className="text-foreground text-sm font-semibold">EcoCoins 錢包</Text>
              </View>
              <Text className="text-foreground mt-2 text-3xl font-bold">{balance}</Text>
              <Text className="text-muted text-2xs mt-1 leading-4">
                提升排名一次扣 {BUMP_COST} 枚，置頂曝光 {BUMP_DURATION_LABEL}
                。餘額由資料庫函數控管， 前端無法直接修改。
              </Text>

              <View className="bg-mint mt-3 rounded-xl p-4">
                <View className="flex-row items-center gap-1.5">
                  <Flame size={15} color={SAGE} strokeWidth={2.2} />
                  <Text className="text-sage-deep text-xs font-bold">
                    每日簽到 ∙ 連續 {claimStreak} 天
                  </Text>
                </View>
                <View className="mt-2.5 flex-row gap-1.5">
                  {Array.from({ length: DAILY_STREAK_CAP }, (_, index) => index + 1).map((day) => {
                    const reached = claimStreak >= day;
                    return (
                      <View
                        key={day}
                        className={`flex-1 items-center rounded-lg py-1.5 ${
                          reached ? 'bg-sage' : 'bg-background'
                        }`}
                      >
                        <Text
                          className={`text-2xs font-bold ${reached ? 'text-white' : 'text-muted'}`}
                        >
                          {dailyRewardFor(day)}
                        </Text>
                        <Text
                          className={`text-2xs mt-0.5 ${reached ? 'text-white/90' : 'text-muted'}`}
                        >
                          第 {day} 天
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text className="text-sage-deep/90 text-2xs mt-2 leading-4">
                  {canClaim
                    ? `現在領取可拿 ${nextReward} 枚。中斷超過 48 小時會從第 1 天重新計算。`
                    : `已簽到，${formatRemaining(new Date(nextClaimAt).toISOString())}後可再領取。`}
                </Text>
                <Button
                  size="sm"
                  className="mt-2.5 self-start"
                  isDisabled={isClaiming || !canClaim}
                  onPress={() => {
                    void handleClaim();
                  }}
                >
                  <Button.Label>
                    {isClaiming
                      ? '領取中...'
                      : canClaim
                        ? `領取 ${nextReward} 枚 EcoCoins`
                        : '今天已簽到'}
                  </Button.Label>
                </Button>
              </View>
            </View>

            <Text className="text-foreground mt-1 text-sm font-semibold">
              我的上架商品（含審核狀態）
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-6 py-10">
            <Text className="text-muted text-center text-sm">
              還沒有上架商品，到「釋出好物」發佈第一件收藏。
            </Text>
          </View>
        }
        ListFooterComponent={
          <Button
            variant="secondary"
            className="mt-2"
            onPress={() => {
              void signOut();
            }}
          >
            <Button.Label>登出易拍通帳號</Button.Label>
          </Button>
        }
        renderItem={({ item }) => {
          const endsAt = promotedUntil[item.id];
          const isPromoted = Boolean(endsAt);
          const meta = getModeration(item.moderation_status);
          const canBump = item.moderation_status === 'approved';

          return (
            <BumpFx playToken={playTokens[item.id] ?? 0} persistGlow={isPromoted}>
              <ListingCard
                listing={item}
                width={cardWidth}
                bordered={false}
                isPromoted={isPromoted}
                showFavorite={false}
                showModeration
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
                footer={
                  <View className="gap-2">
                    {item.moderation_status === 'approved' ? null : (
                      <View className="bg-canvas rounded-xl px-3.5 py-2.5">
                        <ModerationBadge
                          status={item.moderation_status}
                          className="mb-1.5 self-start"
                        />
                        <Text className="text-muted text-2xs leading-4">{meta.hint}</Text>
                        {item.moderation_reason ? (
                          <Text className="text-2xs mt-1 leading-4 font-medium text-red-700">
                            {item.moderation_reason}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setPendingStock(item)}
                      className="bg-canvas flex-row items-center gap-1.5 rounded-xl px-3.5 py-2.5"
                    >
                      <Boxes size={13} color={SAGE} strokeWidth={2.2} />
                      <Text className="text-muted text-2xs flex-1" numberOfLines={1}>
                        庫存：剩 {remainingQuantity(item.quantity, item.sold_quantity)} /{' '}
                        {item.quantity} 件
                        {item.sold_quantity > 0 ? `（已成交 ${item.sold_quantity} 件）` : ''}
                      </Text>
                      <Text className="text-sage-deep text-2xs font-semibold">調整</Text>
                    </Pressable>

                    {item.payment_methods.length === 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setPendingPayments(item)}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
                      >
                        <View className="flex-row items-center gap-1.5">
                          <Wallet size={13} color="#B45309" strokeWidth={2.2} />
                          <Text className="flex-1 text-xs font-bold text-amber-800">
                            未設定付款方式
                          </Text>
                          <Text className="text-2xs font-semibold text-amber-700">補設定</Text>
                        </View>
                        <Text className="text-2xs mt-1 leading-4 text-amber-700">
                          買家出價後只能在私訊中另外確認怎麼付款，點這裡補上。
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setPendingPayments(item)}
                        className="bg-canvas flex-row items-center gap-1.5 rounded-xl px-3.5 py-2.5"
                      >
                        <Wallet size={13} color={SAGE} strokeWidth={2.2} />
                        <Text className="text-muted text-2xs flex-1" numberOfLines={1}>
                          付款方式：{paymentSummary(item.payment_methods)}
                        </Text>
                        <Text className="text-sage-deep text-2xs font-semibold">調整</Text>
                      </Pressable>
                    )}

                    {isPromoted ? (
                      <View className="bg-mint flex-row items-center justify-between rounded-xl px-3.5 py-2.5">
                        <View className="flex-row items-center gap-1">
                          <Zap size={12} color={SAGE} fill={SAGE} strokeWidth={0} />
                          <Text className="text-sage-deep text-xs font-bold">置頂曝光中</Text>
                        </View>
                        <Text className="text-sage-deep text-2xs font-medium">
                          {formatRemaining(endsAt)}
                        </Text>
                      </View>
                    ) : (
                      <Button size="sm" isDisabled={!canBump} onPress={() => setPendingBump(item)}>
                        <Zap size={14} color="#FFFFFF" strokeWidth={2.2} />
                        <Button.Label>
                          {canBump
                            ? `提升商品排名 ∙ ${BUMP_COST} EcoCoins`
                            : '通過審核後才能提升排名'}
                        </Button.Label>
                      </Button>
                    )}

                    <View className="flex-row gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onPress={() => {
                          void handleToggleHidden(item);
                        }}
                      >
                        <Button.Label>
                          {item.status === 'hidden' ? '重新上架' : '暫時下架'}
                        </Button.Label>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-soft"
                        onPress={() => setPendingDelete(item)}
                      >
                        <Trash2 size={13} color="#B91C1C" strokeWidth={2.2} />
                        <Button.Label>刪除</Button.Label>
                      </Button>
                    </View>
                  </View>
                }
              />
            </BumpFx>
          );
        }}
      />

      <StockSheet
        listing={pendingStock}
        isSaving={isSavingStock}
        onCancel={() => setPendingStock(null)}
        onSave={(quantity) => {
          void handleSaveQuantity(quantity);
        }}
      />

      <PaymentMethodsSheet
        listing={pendingPayments}
        isSaving={isSavingPayments}
        onCancel={() => setPendingPayments(null)}
        onSave={(payments) => {
          void handleSavePayments(payments);
        }}
      />

      <Modal
        visible={pendingBump !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingBump(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="bg-background max-h-[86%] w-full max-w-sm rounded-2xl border border-neutral-200">
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row items-center gap-2">
                <Zap size={18} color={SAGE} strokeWidth={2} />
                <Text className="text-foreground text-base font-bold">提升商品排名</Text>
              </View>
              <Text className="text-muted mt-3 text-sm leading-5">
                「{pendingBump?.title}」將被推上探索首頁最前排，持續 {BUMP_DURATION_LABEL}。
              </Text>
              <View className="bg-canvas mt-3 flex-row items-center justify-between rounded-xl px-3.5 py-2.5">
                <Text className="text-muted text-xs">本次花費</Text>
                <Text className="text-foreground text-sm font-bold">{BUMP_COST} EcoCoins</Text>
              </View>
              <View className="bg-canvas mt-1.5 flex-row items-center justify-between rounded-xl px-3.5 py-2.5">
                <Text className="text-muted text-xs">目前餘額</Text>
                <Text className="text-foreground text-sm font-bold">{balance} EcoCoins</Text>
              </View>

              <View className="mt-4 flex-row gap-2">
                <Button variant="secondary" className="flex-1" onPress={() => setPendingBump(null)}>
                  <Button.Label>取消</Button.Label>
                </Button>
                <Button
                  className="flex-1"
                  isDisabled={isBumping}
                  onPress={() => {
                    void handleConfirmBump();
                  }}
                >
                  <Button.Label>{isBumping ? '處理中...' : '確認扣款並置頂'}</Button.Label>
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="bg-background max-h-[86%] w-full max-w-sm rounded-2xl border border-neutral-200">
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row items-center gap-2">
                <Trash2 size={18} color="#B91C1C" strokeWidth={2} />
                <Text className="text-foreground text-base font-bold">刪除商品</Text>
              </View>
              <Text className="text-muted mt-3 text-sm leading-5">
                確定要刪除「{pendingDelete?.title}
                」嗎？商品、收藏與交易紀錄都會一併移除，這個動作無法復原。若只是想暫時停售，選擇「暫時下架」就好。
              </Text>
              <View className="mt-4 flex-row gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onPress={() => setPendingDelete(null)}
                >
                  <Button.Label>保留商品</Button.Label>
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onPress={() => {
                    void handleConfirmDelete();
                  }}
                >
                  <Button.Label>確認刪除</Button.Label>
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type ProfileLinkProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
  isLast?: boolean;
};

function ProfileLink({ icon, label, value, onPress, isLast = false }: ProfileLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${isLast ? '' : 'border-b border-neutral-100'}`}
    >
      {icon}
      <Text className="text-foreground ml-3 flex-1 text-sm font-medium">{label}</Text>
      <Text className="text-muted text-2xs mr-1.5">{value}</Text>
      <ChevronRight size={16} color="#9CA3AF" strokeWidth={2} />
    </Pressable>
  );
}
