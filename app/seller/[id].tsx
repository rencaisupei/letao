import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Star } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { ListingCard } from '@/components/ListingCard';
import { StarRating } from '@/components/StarRating';
import { showAlert } from '@/lib/alert';
import { SAGE, getRoleLabel } from '@/lib/constants';
import { hasCompletedDealWith, useOrderStore } from '@/lib/orderStore';
import {
  type Review,
  type SellerProfile,
  averageRating,
  fetchSellerListings,
  fetchSellerProfile,
  fetchSellerReviews,
  submitReview,
} from '@/lib/queries';
import { requireAccount } from '@/lib/requireAccount';
import { type Listing, useLetaoStore } from '@/lib/store';

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const userId = useLetaoStore((state) => state.userId);
  const refresh = useLetaoStore((state) => state.refresh);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.load);

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const cardWidth = Math.floor((width - 36) / 2);
  const isMe = userId === id;
  const myReview = reviews.find((review) => review.reviewer_id === userId) ?? null;

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    const [profileResult, listingsResult, reviewsResult] = await Promise.all([
      fetchSellerProfile(id),
      fetchSellerListings(id),
      fetchSellerReviews(id),
    ]);
    setProfile(profileResult);
    setSellerListings(listingsResult.filter((listing) => listing.moderation_status === 'approved'));
    setReviews(reviewsResult);
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    void loadOrders(userId);
  }, [userId, loadOrders]);

  const canReview = userId && id ? hasCompletedDealWith(orders, id, userId) : false;

  const openForm = () => {
    if (!requireAccount('評價賣家')) return;
    if (isMe) {
      showAlert({ title: '無法評價自己', message: '評價是給交易對象的，不能評價自己的帳號。' });
      return;
    }
    if (!canReview) {
      showAlert({
        title: '完成交易後才能評價',
        message:
          '樂淘的評價只開放給真實成交的買家：先在商品頁出價媒合，交付完成後在「我的交易」標記完成，就可以回來評價這位賣家。',
        confirmLabel: '查看我的交易',
        dismissLabel: '我知道了',
        onConfirm: () => router.push('/orders'),
      });
      return;
    }
    setRating(myReview?.rating ?? 5);
    setComment(myReview?.comment ?? '');
    setFormVisible(true);
  };

  const handleSubmit = async () => {
    if (!id) return;
    setIsBusy(true);
    const result = await submitReview(id, rating, comment, null);
    setIsBusy(false);
    setFormVisible(false);

    if (!result.ok) {
      showAlert({
        title: '評價沒有送出',
        tone: 'danger',
        message: '評價需要一筆已完成的交易紀錄。請確認交易已在「我的交易」標記完成後再試一次。',
      });
      return;
    }

    await load();
    await refresh();
    showAlert({
      title: '評價已送出',
      tone: 'success',
      message: `感謝你的回饋。這位賣家目前累積 ${result.reviewCount} 筆評價，信任度更新為 ${result.trustScore}%。`,
    });
  };

  const average = averageRating(reviews);

  if (isLoading && !profile) {
    return (
      <View className="bg-canvas flex-1 items-center justify-center">
        <Stack.Screen options={{ title: '賣家主頁' }} />
        <ActivityIndicator color={SAGE} />
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-canvas flex-1"
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: profile?.username ?? '賣家主頁' }} />

      <View className="bg-background rounded-2xl border border-neutral-200 p-4">
        <View className="flex-row items-center">
          <Avatar uri={profile?.avatar_url} name={profile?.username} size={56} />
          <View className="ml-3 flex-1">
            <View className="flex-row items-center gap-1">
              <Text className="text-foreground text-[16px] font-bold">
                {profile?.username ?? '樂淘賣家'}
              </Text>
              {profile?.verified_status ? (
                <BadgeCheck size={15} color={SAGE} strokeWidth={2} />
              ) : null}
            </View>
            <Text className="text-muted mt-0.5 text-[11px]">
              {getRoleLabel(profile?.role)} ∙ {sellerListings.length} 件上架中
            </Text>
            <StarRating
              value={average ?? 0}
              className="mt-1"
              label={average === null ? '尚無評價' : `${average} / 5 ∙ ${reviews.length} 筆評價`}
            />
          </View>
        </View>

        {profile?.bio ? (
          <Text className="text-muted mt-3 text-[12px] leading-5">{profile.bio}</Text>
        ) : null}

        <View className="bg-mint mt-3 flex-row items-center justify-between rounded-xl px-3 py-2.5">
          <Text className="text-sage-deep text-[12px] font-semibold">信任度</Text>
          <Text className="text-sage-deep text-[15px] font-bold">
            {profile?.trust_score ?? 80}%
          </Text>
        </View>
        <Text className="text-muted mt-2 text-[11px] leading-4">
          信任度由買家評價自動換算（平均星數 × 20），沒有任何前端可以直接修改。
        </Text>

        {isMe ? null : (
          <Button size="sm" variant="secondary" className="mt-3 self-start" onPress={openForm}>
            <Star size={13} color={SAGE} strokeWidth={2.2} />
            <Button.Label>
              {myReview ? '修改我的評價' : canReview ? '給這位賣家評價' : '完成交易後可評價'}
            </Button.Label>
          </Button>
        )}
      </View>

      <Text className="text-foreground mt-4 px-1 text-[13px] font-semibold">
        買家評價（{reviews.length}）
      </Text>
      {reviews.length === 0 ? (
        <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
          <Text className="text-muted text-[12px] leading-5">
            還沒有人評價這位賣家。完成交易後給彼此一個評價，能讓後續的買家更放心。
          </Text>
        </View>
      ) : (
        <View className="mt-2 gap-2">
          {reviews.map((review) => (
            <View
              key={review.id}
              className="bg-background rounded-2xl border border-neutral-200 p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-foreground text-[13px] font-semibold">
                  {review.reviewerName ?? '樂淘買家'}
                  {review.reviewer_id === userId ? '（我）' : ''}
                </Text>
                <Text className="text-muted text-[10px]">
                  {new Date(review.created_at).toLocaleDateString('zh-TW')}
                </Text>
              </View>
              <StarRating value={review.rating} size={13} className="mt-1.5" />
              {review.comment ? (
                <Text className="text-muted mt-2 text-[12px] leading-5">{review.comment}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Text className="text-foreground mt-4 px-1 text-[13px] font-semibold">上架中的商品</Text>
      {sellerListings.length === 0 ? (
        <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
          <Text className="text-muted text-[12px]">目前沒有公開上架的商品。</Text>
        </View>
      ) : (
        <View className="mt-2 flex-row flex-wrap gap-3">
          {sellerListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              width={cardWidth}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
            />
          ))}
        </View>
      )}

      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFormVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <View className="bg-background w-full max-w-sm rounded-2xl border border-neutral-200 p-5">
            <Text className="text-foreground text-base font-bold">
              評價 {profile?.username ?? '這位賣家'}
            </Text>
            <Text className="text-muted mt-2 text-[12px] leading-4">
              星數會直接換算成這位賣家的信任度，請依實際交易體驗評分。
            </Text>

            <View className="bg-canvas mt-3 items-center rounded-xl py-4">
              <StarRating value={rating} size={30} onChange={setRating} />
              <Text className="text-foreground mt-2 text-[12px] font-semibold">
                {rating} 顆星 ∙ 信任度 {rating * 20}%
              </Text>
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              textAlignVertical="top"
              placeholder="寫下交易過程、包裝或溝通狀況（選填）"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-canvas text-foreground mt-3 h-20 rounded-xl border border-neutral-200 px-3 pt-2.5 text-[13px]"
            />

            <View className="mt-4 flex-row gap-2">
              <Button variant="secondary" className="flex-1" onPress={() => setFormVisible(false)}>
                <Button.Label>取消</Button.Label>
              </Button>
              <Button
                className="flex-1"
                isDisabled={isBusy}
                onPress={() => {
                  void handleSubmit();
                }}
              >
                <Button.Label>{isBusy ? '送出中...' : '送出評價'}</Button.Label>
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
