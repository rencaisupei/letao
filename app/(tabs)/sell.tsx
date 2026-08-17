import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { router } from 'expo-router';
import { ShieldCheck, Sparkles, UserPlus } from 'lucide-react-native';

import { PhotoPicker } from '@/components/PhotoPicker';
import { SelectChip } from '@/components/SelectChip';
import { showAlert } from '@/lib/alert';
import {
  CATEGORIES,
  CONDITIONS,
  type ConditionCode,
  LOGISTICS_OPTIONS,
  PROHIBITED_ITEMS,
  SAGE,
  getModeration,
} from '@/lib/constants';
import { type PickedPhoto, uploadListingPhoto } from '@/lib/uploads';
import { useLetaoStore } from '@/lib/store';

export default function SellScreen() {
  const userId = useLetaoStore((state) => state.userId);
  const createListing = useLetaoStore((state) => state.createListing);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState<ConditionCode>('brand_new');
  const [logistics, setLogistics] = useState(LOGISTICS_OPTIONS[0]);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<string | null>(null);

  const isSubmitting = progress !== null;

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setPhotos([]);
    setDescription('');
    setMeetupLocation('');
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

    setProgress(photos.length > 0 ? '正在上傳相片...' : '正在送出商品...');

    const uploaded: string[] = [];
    for (const [index, photo] of photos.entries()) {
      setProgress(`正在上傳相片 ${index + 1}/${photos.length}...`);
      const url = await uploadListingPhoto(userId, photo, index);
      if (url) uploaded.push(url);
    }

    if (photos.length > 0 && uploaded.length === 0) {
      setProgress(null);
      showAlert({
        title: '相片上傳失敗',
        tone: 'danger',
        message: '相片沒有上傳成功，請確認網路狀態後再試一次，或先移除相片直接上架。',
      });
      return;
    }

    setProgress('AI 正在審核內容...');
    const result = await createListing({
      title: title.trim(),
      price: priceValue,
      category,
      condition,
      logistics,
      meetupLocation: meetupLocation.trim(),
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
      <View className="bg-canvas flex-1 p-4">
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={32} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">上架商品需要註冊帳號</Text>
          <Text className="text-muted mt-2 text-center text-[13px] leading-5">
            賣家必須註冊，商品才能綁定賣家身分、接受買家評價與累積信任度，也才能通過樂淘的內容審核流程。
          </Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊成為賣家</Button.Label>
          </Button>
        </View>
      </View>
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
          <Text className="text-[13px] font-bold text-red-800">⚠️ 樂淘安全與法規合規公告</Text>
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

        <Text className="text-foreground mt-4 text-[13px] font-semibold">
          商品類別（請點擊勾選一項）
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {CATEGORIES.map((item) => (
            <SelectChip
              key={item}
              size="sm"
              label={item}
              isSelected={category === item}
              onPress={() => setCategory(item)}
              className="w-[23%] rounded-md"
            />
          ))}
        </View>

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

        <Text className="text-foreground mt-4 text-[13px] font-semibold">運送與交付方式</Text>
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {LOGISTICS_OPTIONS.map((item) => (
            <SelectChip
              key={item}
              size="sm"
              label={item}
              isSelected={logistics === item}
              onPress={() => setLogistics(item)}
              className="rounded-lg"
            />
          ))}
        </View>

        {logistics === '面交' ? (
          <TextInput
            value={meetupLocation}
            onChangeText={setMeetupLocation}
            placeholder="請填寫預期面交地點..."
            placeholderTextColorClassName="accent-neutral-400"
            className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
          />
        ) : null}

        <View className="bg-background mt-3 flex-row items-start gap-2 rounded-xl border border-neutral-200 p-3">
          <ShieldCheck size={14} color={SAGE} strokeWidth={2} />
          <Text className="text-muted flex-1 text-[11px] leading-4">
            樂淘安全提醒：面交請選擇人潮眾多、設有監視器的公共場所；超商交貨便請保留寄件單據，交易紀錄會保存於雙方帳號。
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
