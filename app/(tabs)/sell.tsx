import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { router } from 'expo-router';
import { ShieldCheck, Sparkles, UserPlus } from 'lucide-react-native';

import { PhotoPicker } from '@/components/PhotoPicker';
import { CategoryPicker } from '@/components/CategoryPicker';
import { QuantityStepper } from '@/components/QuantityStepper';
import { MeetupPicker, type MeetupValue, composeMeetupLocation } from '@/components/MeetupPicker';
import { ParcelPicker } from '@/components/ParcelPicker';
import { PaymentMethodsPicker } from '@/components/PaymentPicker';
import {
  type QuoteMap,
  type ShippingDraft,
  ShippingOptionsPicker,
  defaultShippingDrafts,
  normalizeShippingDrafts,
} from '@/components/ShippingOptionsPicker';
import { SelectChip } from '@/components/SelectChip';
import { showAlert } from '@/lib/alert';
import {
  CATEGORIES,
  CONDITIONS,
  type ConditionCode,
  LOGISTICS_OPTIONS,
  MAX_LISTING_QUANTITY,
  MEETUP_METHOD,
  PROHIBITED_ITEMS,
  type PaymentCode,
  SAGE,
  getModeration,
  getPayment,
  isPaymentAllowedFor,
} from '@/lib/constants';
import {
  EMPTY_PARCEL_DRAFT,
  type ParcelDraft,
  parseParcelDraft,
  quoteMethods,
} from '@/lib/shipping';
import {
  type PickedPhoto,
  type UploadFailureReason,
  uploadFailureMessage,
  uploadListingPhoto,
} from '@/lib/uploads';
import { useAppStore } from '@/lib/store';

export default function SellScreen() {
  const userId = useAppStore((state) => state.userId);
  const createListing = useAppStore((state) => state.createListing);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<ConditionCode>('brand_new');
  const [shipping, setShipping] = useState<ShippingDraft[]>(defaultShippingDrafts);
  const [payments, setPayments] = useState<PaymentCode[]>(['cod', 'transfer']);
  const [meetup, setMeetup] = useState<MeetupValue>({ region: null, detail: '' });
  const [parcel, setParcel] = useState<ParcelDraft>(EMPTY_PARCEL_DRAFT);
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [isQuoting, setIsQuoting] = useState(false);
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<string | null>(null);

  const isSubmitting = progress !== null;
  const isMeetup = shipping.some((item) => item.method === MEETUP_METHOD);
  const shippingMethodNames = shipping.map((item) => item.method);
  const usablePayments = payments.filter((code) =>
    shippingMethodNames.some((method) => isPaymentAllowedFor(code, method)),
  );

  const parsedParcel = parseParcelDraft(parcel);
  const spec = parsedParcel.ok ? parsedParcel.parcel : null;
  const weightKg = spec?.weightKg ?? null;
  const lengthCm = spec?.lengthCm ?? null;
  const widthCm = spec?.widthCm ?? null;
  const heightCm = spec?.heightCm ?? null;
  const originRegion = meetup.region;
  const canAutoQuote =
    weightKg !== null && lengthCm !== null && widthCm !== null && heightCm !== null;

  useEffect(() => {
    if (weightKg === null || lengthCm === null || widthCm === null || heightCm === null) {
      setQuotes({});
      setIsQuoting(false);
      return undefined;
    }

    let isStale = false;
    setIsQuoting(true);

    const timer = setTimeout(() => {
      const run = async () => {
        const rows = await quoteMethods(
          LOGISTICS_OPTIONS,
          { weightKg, lengthCm, widthCm, heightCm, originRegion },
          null,
        );
        if (isStale) return;
        const next: QuoteMap = {};
        for (const row of rows) next[row.method] = row;
        setQuotes(next);
        setIsQuoting(false);
      };
      void run();
    }, 450);

    return () => {
      isStale = true;
      clearTimeout(timer);
    };
  }, [weightKg, lengthCm, widthCm, heightCm, originRegion]);

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setPhotos([]);
    setDescription('');
    setQuantity(1);
    setShipping(defaultShippingDrafts());
    setPayments(['cod', 'transfer']);
    setMeetup({ region: null, detail: '' });
    setParcel(EMPTY_PARCEL_DRAFT);
    setQuotes({});
  };

  const handlePublish = async () => {
    if (!userId) return;
    const priceValue = Number.parseFloat(price);

    if (title.trim() === '' || !Number.isFinite(priceValue) || priceValue <= 0) {
      showAlert({
        title: '尚未完成填寫',
        tone: 'danger',
        message: '請填寫完整的商品名稱與正確的金額。',
      });
      return;
    }

    if (!parsedParcel.ok) {
      showAlert({ title: '包裝資訊需要調整', tone: 'danger', message: parsedParcel.message });
      return;
    }

    if (isQuoting) {
      showAlert({ title: '運費還在試算', message: '運費試算完成後就可以送出，請稍候一下。' });
      return;
    }

    const normalized = normalizeShippingDrafts(shipping, quotes, canAutoQuote);
    if (!normalized.ok) {
      showAlert({ title: '運送設定需要調整', tone: 'danger', message: normalized.message });
      return;
    }

    if (isMeetup && !meetup.region) {
      showAlert({
        title: '請選擇面交地區',
        tone: 'danger',
        message: '選擇面交的商品需要指定地區，買家才知道要去哪裡碰面。',
      });
      return;
    }

    if (usablePayments.length === 0) {
      showAlert({
        title: '請選擇付款方式',
        tone: 'danger',
        message:
          payments.length === 0
            ? '至少勾選一種付款方式，買家在出價時才知道要怎麼付款。'
            : '目前勾選的付款方式與您提供的運送方式不相容，請重新勾選（例如面交只能收現金或行動支付）。',
      });
      return;
    }

    setProgress(photos.length > 0 ? '正在上傳相片...' : '正在送出商品...');

    const uploaded: string[] = [];
    let lastFailure: UploadFailureReason | null = null;
    for (const [index, photo] of photos.entries()) {
      setProgress(`正在上傳相片 ${index + 1}/${photos.length}...`);
      const outcome = await uploadListingPhoto(userId, photo, index);
      if (outcome.ok) uploaded.push(outcome.url);
      else lastFailure = outcome.reason;
    }

    if (photos.length > 0 && uploaded.length === 0 && lastFailure) {
      setProgress(null);
      showAlert({
        title: '相片上傳失敗',
        tone: 'danger',
        message: `${uploadFailureMessage(lastFailure)}\n\n也可以先移除相片直接上架，之後再補圖。`,
      });
      return;
    }

    if (lastFailure && uploaded.length > 0) {
      showAlert({
        title: '部分相片沒有上傳',
        message: `已成功上傳 ${uploaded.length}/${photos.length} 張。${uploadFailureMessage(lastFailure)}`,
      });
    }

    setProgress('AI 正在審核內容...');
    const result = await createListing({
      title: title.trim(),
      price: priceValue,
      category,
      condition,
      quantity,
      shipping: normalized.options,
      payments: usablePayments,
      parcel: { ...parsedParcel.parcel, originRegion },
      meetupLocation: composeMeetupLocation(meetup),
      description: description.trim(),
      images: uploaded,
    });
    setProgress(null);

    if (!result.ok) {
      showAlert({
        title: '上架失敗',
        tone: 'danger',
        message: '商品沒有送出去，請確認網路狀態後再試一次。',
      });
      return;
    }

    const meta = getModeration(result.status);

    if (result.status === 'rejected') {
      showAlert({
        title: '未通過審核',
        tone: 'danger',
        message: `${meta.hint}\n\n${result.reason ?? '內容包含平台禁止刊登的項目。'}\n\n商品已保留在您的個人主頁，修正後可重新上架。`,
      });
      resetForm();
      router.navigate('/(tabs)/profile');
      return;
    }

    resetForm();

    if (result.status === 'approved') {
      showAlert({
        title: '上架成功',
        tone: 'success',
        message: 'AI 審核已通過，商品現在就出現在探索首頁，正即時進行品味媒合中！',
      });
      router.navigate('/(tabs)');
      return;
    }

    showAlert({
      title: '已送出，等待人工複審',
      message: `${meta.hint}\n\n${result.reason ?? '系統判定這件商品需要管理員確認。'}\n\n可在個人主頁查看審核進度。`,
      onConfirm: () => router.navigate('/(tabs)/profile'),
    });
  };

  if (!userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={32} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">上架商品需要註冊帳號</Text>
          <Text className="text-muted mt-2 text-center text-[13px] leading-5">
            賣家必須註冊，商品才能綁定賣家身分、接受買家評價與累積信任度，也才能通過易拍通的內容審核流程。
          </Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊成為賣家</Button.Label>
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-canvas flex-1"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-foreground text-base font-bold">✦ 釋出您的個人收藏</Text>

        <View className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <Text className="text-[13px] font-bold text-red-800">⚠️ 易拍通安全與法規合規公告</Text>
          <Text className="mt-2 text-[11px] leading-4 text-red-800/90">
            依據台灣法律與兩大 App
            商店審查指南，本平台【嚴禁刊登】以下商品，違者將直接刪文並永久封鎖帳號：
          </Text>
          {PROHIBITED_ITEMS.map((item) => (
            <Text key={item} className="mt-1.5 text-[11px] leading-4 font-medium text-red-700">
              ∙ {item}
            </Text>
          ))}
        </View>

        <View className="bg-mint mt-3 rounded-xl p-3.5">
          <View className="flex-row items-center gap-2">
            <Sparkles size={15} color={SAGE} strokeWidth={2} />
            <Text className="text-sage-deep text-[12px] font-bold">送出後會先經過雙層審核</Text>
          </View>
          <Text className="text-sage-deep/90 mt-1.5 text-[11px] leading-4">
            1. AI 自動比對禁售規範與文案語意 ∙ 2.
            需要判斷的案件轉給管理員人工複審。通過後才會公開在探索首頁。
          </Text>
        </View>

        <Text className="text-foreground mt-4 text-[13px] font-semibold">商品相片</Text>
        <View className="mt-2">
          <PhotoPicker photos={photos} onChange={setPhotos} isDisabled={isSubmitting} />
        </View>

        <Text className="text-foreground mt-4 text-[13px] font-semibold">商品名稱</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="請輸入主標題..."
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
        />

        <Text className="text-foreground mt-4 text-[13px] font-semibold">售價（NT$）</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
        />

        <Text className="text-foreground mt-4 text-[13px] font-semibold">商品數量（庫存）</Text>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={MAX_LISTING_QUANTITY}
          isDisabled={isSubmitting}
          className="mt-2"
          hint={
            quantity > 1
              ? `同款商品 ${quantity} 件。買家每成立一筆交易就扣掉對應數量，全部售完會自動標記為已預訂或已售出。運費以一次寄送計算。`
              : '只有一件的話保持 1。多件同款商品可以直接填數量，不必重複上架。'
          }
        />

        <Text className="text-foreground mt-4 text-[13px] font-semibold">商品類別</Text>
        <CategoryPicker
          value={category}
          onChange={setCategory}
          isDisabled={isSubmitting}
          className="mt-2"
        />

        <Text className="text-foreground mt-4 text-[13px] font-semibold">商品狀況（新舊程度）</Text>
        <View className="mt-2 gap-1.5">
          {CONDITIONS.map((item) => (
            <SelectChip
              key={item.code}
              label={`${item.label} ｜ ${item.hint}`}
              isSelected={condition === item.code}
              onPress={() => setCondition(item.code)}
              className="h-11 w-full items-start justify-center rounded-xl px-4"
            />
          ))}
        </View>

        {isMeetup ? (
          <Text className="text-foreground mt-4 text-[13px] font-semibold">
            面交地點與出貨縣市（買家會看到這段文字）
          </Text>
        ) : (
          <Text className="text-foreground mt-4 text-[13px] font-semibold">
            商品所在地與出貨縣市（用於搜尋與運費計算）
          </Text>
        )}
        <View className="mt-2">
          <MeetupPicker
            value={meetup}
            requiresDetail={isMeetup}
            isDisabled={isSubmitting}
            onChange={setMeetup}
          />
        </View>

        <Text className="text-foreground mt-4 text-[13px] font-semibold">
          包裝資訊（填了就能自動算運費）
        </Text>
        <View className="mt-2">
          <ParcelPicker value={parcel} isDisabled={isSubmitting} onChange={setParcel} />
        </View>

        <Text className="text-foreground mt-4 text-[13px] font-semibold">
          運送與交付方式（可多選，運費自動試算或自訂）
        </Text>
        <View className="mt-2">
          <ShippingOptionsPicker
            value={shipping}
            quotes={quotes}
            isQuoting={isQuoting}
            canAutoQuote={canAutoQuote}
            isDisabled={isSubmitting}
            onChange={setShipping}
          />
        </View>

        <Text className="text-foreground mt-4 text-[13px] font-semibold">
          買家的付款方式（可多選，買家出價時選一種）
        </Text>
        <View className="mt-2">
          <PaymentMethodsPicker
            value={payments}
            methods={shippingMethodNames}
            isDisabled={isSubmitting}
            onChange={setPayments}
          />
        </View>
        <Text className="text-muted mt-1.5 text-[11px] leading-4">
          {usablePayments.length > 0
            ? `商品頁會公開顯示：${usablePayments.map((code) => getPayment(code)?.label ?? code).join('、')}。`
            : '請至少勾選一種與運送方式相容的付款方式。'}
        </Text>

        <View className="bg-background mt-3 flex-row items-start gap-2 rounded-xl border border-neutral-200 p-3">
          <ShieldCheck size={14} color={SAGE} strokeWidth={2} />
          <Text className="text-muted flex-1 text-[11px] leading-4">
            易拍通安全提醒：面交請選擇人潮眾多、設有監視器的公共場所；超商交貨便請保留寄件單據，交易紀錄會保存於雙方帳號。
          </Text>
        </View>

        <Text className="text-foreground mt-4 text-[13px] font-semibold">商品描述</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholder="描述一下商品的細節、配件完好度或故事..."
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 h-24 rounded-xl border border-neutral-200 px-4 pt-3 text-[13px]"
        />

        <Button
          className="mt-6"
          isDisabled={isSubmitting}
          onPress={() => {
            void handlePublish();
          }}
        >
          <Button.Label>{progress ?? '確認釋出好物'}</Button.Label>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
