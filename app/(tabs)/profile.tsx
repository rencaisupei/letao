import { useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Text, View, useWindowDimensions } from 'react-native';
import { Button } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { BadgeCheck, Coins, Zap } from 'lucide-react-native';

import { BumpFx } from '@/components/BumpFx';
import { ListingCard } from '@/components/ListingCard';
import { showAlert } from '@/lib/alert';
import { BUMP_COST, BUMP_DURATION_LABEL, DAILY_CLAIM_AMOUNT, SAGE } from '@/lib/constants';
import { type Listing, useLetaoStore } from '@/lib/store';
import { formatRemaining } from '@/lib/utils';

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const userId = useLetaoStore((state) => state.userId);
  const username = useLetaoStore((state) => state.username);
  const trustScore = useLetaoStore((state) => state.trustScore);
  const verified = useLetaoStore((state) => state.verified);
  const balance = useLetaoStore((state) => state.balance);
  const listings = useLetaoStore((state) => state.listings);
  const promotedUntil = useLetaoStore((state) => state.promotedUntil);
  const isRefreshing = useLetaoStore((state) => state.isRefreshing);
  const refresh = useLetaoStore((state) => state.refresh);
  const bump = useLetaoStore((state) => state.bump);
  const claimDaily = useLetaoStore((state) => state.claimDaily);
  const signOut = useLetaoStore((state) => state.signOut);

  const [playTokens, setPlayTokens] = useState<Record<string, number>>({});
  const [pendingBump, setPendingBump] = useState<Listing | null>(null);
  const [isBumping, setIsBumping] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const cardWidth = width - 36;

  const myListings = useMemo(
    () => listings.filter((listing) => listing.seller_id === userId),
    [listings, userId],
  );

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
      showAlert({
        title: `已入帳 ${DAILY_CLAIM_AMOUNT} 枚 EcoCoins`,
        tone: 'success',
        message: `目前錢包餘額為 ${result.balance} 枚 EcoCoins。`,
      });
      return;
    }

    showAlert({
      title: '今天已經領過了',
      message: '每 24 小時可以領取一次 EcoCoins，明天再回來吧。',
    });
  };

  return (
    <View className="bg-canvas flex-1">
      <FlatList
        data={myListings}
        keyExtractor={(item) => item.id}
        refreshing={isRefreshing}
        onRefresh={() => {
          void refresh();
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        ListHeaderComponent={
          <View className="gap-3">
            <View className="bg-background flex-row items-center rounded-2xl border border-neutral-200 p-4">
              <View className="bg-mint h-12 w-12 items-center justify-center rounded-full">
                <Text className="text-sage-deep text-base font-bold">
                  {(username ?? 'L').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-1">
                  <Text className="text-foreground text-[15px] font-bold">
                    {username ?? '樂淘用戶'}
                  </Text>
                  {verified ? <BadgeCheck size={15} color={SAGE} strokeWidth={2} /> : null}
                </View>
                <Text className="text-sage-deep mt-0.5 text-[11px] font-semibold">
                  信任度 {trustScore}% ∙ 共 {myListings.length} 件上架商品
                </Text>
              </View>
              <Button
                size="sm"
                variant="tertiary"
                onPress={() => {
                  void signOut();
                }}
              >
                <Button.Label>登出</Button.Label>
              </Button>
            </View>

            <View className="bg-background rounded-2xl border border-neutral-200 p-4">
              <View className="flex-row items-center gap-2">
                <Coins size={18} color={SAGE} strokeWidth={1.8} />
                <Text className="text-foreground text-[13px] font-semibold">EcoCoins 錢包</Text>
              </View>
              <Text className="text-foreground mt-2 text-3xl font-bold">{balance}</Text>
              <Text className="text-muted mt-1 text-[11px] leading-4">
                提升排名一次扣 {BUMP_COST} 枚，置頂曝光 {BUMP_DURATION_LABEL}
                。餘額由資料庫函數控管， 前端無法直接修改。
              </Text>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 self-start"
                isDisabled={isClaiming}
                onPress={() => {
                  void handleClaim();
                }}
              >
                <Button.Label>
                  {isClaiming ? '領取中...' : `領取每日 ${DAILY_CLAIM_AMOUNT} 枚 EcoCoins`}
                </Button.Label>
              </Button>
            </View>

            <Text className="text-foreground mt-1 text-[13px] font-semibold">我的上架商品</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-6 py-10">
            <Text className="text-muted text-center text-[13px]">
              還沒有上架商品，到「釋出好物」發佈第一件收藏。
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const endsAt = promotedUntil[item.id];
          const isPromoted = Boolean(endsAt);

          return (
            <BumpFx playToken={playTokens[item.id] ?? 0} persistGlow={isPromoted}>
              <ListingCard
                listing={item}
                width={cardWidth}
                bordered={false}
                isPromoted={isPromoted}
                footer={
                  isPromoted ? (
                    <View className="bg-mint flex-row items-center justify-between rounded-xl px-3 py-2">
                      <Text className="text-sage-deep text-[12px] font-bold">⚡ 置頂曝光中</Text>
                      <Text className="text-sage-deep text-[11px] font-medium">
                        {formatRemaining(endsAt)}
                      </Text>
                    </View>
                  ) : (
                    <Button size="sm" onPress={() => setPendingBump(item)}>
                      <Zap size={14} color="#FFFFFF" strokeWidth={2.2} />
                      <Button.Label>提升商品排名 ∙ {BUMP_COST} EcoCoins</Button.Label>
                    </Button>
                  )
                }
              />
            </BumpFx>
          );
        }}
      />

      <Modal
        visible={pendingBump !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingBump(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="bg-background w-full max-w-sm rounded-2xl border border-neutral-200 p-5">
            <View className="flex-row items-center gap-2">
              <Zap size={18} color={SAGE} strokeWidth={2} />
              <Text className="text-foreground text-base font-bold">提升商品排名</Text>
            </View>
            <Text className="text-muted mt-3 text-[13px] leading-5" numberOfLines={2}>
              「{pendingBump?.title}」將被推上探索首頁最前排，持續 {BUMP_DURATION_LABEL}。
            </Text>
            <View className="bg-canvas mt-3 flex-row items-center justify-between rounded-xl px-3 py-2">
              <Text className="text-muted text-[12px]">本次花費</Text>
              <Text className="text-foreground text-[13px] font-bold">{BUMP_COST} EcoCoins</Text>
            </View>
            <View className="bg-canvas mt-1.5 flex-row items-center justify-between rounded-xl px-3 py-2">
              <Text className="text-muted text-[12px]">目前餘額</Text>
              <Text className="text-foreground text-[13px] font-bold">{balance} EcoCoins</Text>
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
          </View>
        </View>
      </Modal>
    </View>
  );
}
