import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from 'heroui-native';
import { router } from 'expo-router';

import { SelectChip } from '@/components/SelectChip';
import { showAlert } from '@/lib/alert';
import {
  CATEGORIES,
  CONDITIONS,
  type ConditionCode,
  LOGISTICS_OPTIONS,
  PROHIBITED_ITEMS,
} from '@/lib/constants';
import { useLetaoStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function SellScreen() {
  const createListing = useLetaoStore((state) => state.createListing);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState<ConditionCode>('brand_new');
  const [logistics, setLogistics] = useState(LOGISTICS_OPTIONS[0]);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setImageUrl('');
    setDescription('');
    setMeetupLocation('');
  };

  const handlePublish = async () => {
    const priceValue = Number.parseFloat(price);

    if (title.trim() === '' || !Number.isFinite(priceValue) || priceValue <= 0) {
      showAlert({
        title: '尚未完成填寫',
        tone: 'danger',
        message: '請填寫完整的商品名稱與正確的金額。',
      });
      return;
    }

    setIsSubmitting(true);
    const created = await createListing({
      title: title.trim(),
      price: priceValue,
      category,
      condition,
      logistics,
      meetupLocation: meetupLocation.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
    });
    setIsSubmitting(false);

    if (!created) {
      showAlert({
        title: '上架失敗',
        tone: 'danger',
        message: '商品沒有送出去，請確認網路狀態後再試一次。',
      });
      return;
    }

    resetForm();
    showAlert({
      title: '上架成功',
      tone: 'success',
      message: '商品已加入樂淘平台，正即時進行品味媒合中！',
    });
    router.navigate('/');
  };

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

        <Text className="text-foreground mt-4 text-[13px] font-semibold">商品相片網址（選填）</Text>
        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
          placeholder="貼上圖片連結，留空則顯示樂淘綠色卡面"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
        />

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
          {CONDITIONS.map((item) => {
            const isSelected = condition === item.code;
            return (
              <SelectChip
                key={item.code}
                label={`${item.label} ｜ ${item.hint}`}
                isSelected={isSelected}
                onPress={() => setCondition(item.code)}
                className={cn('h-11 w-full items-start justify-center rounded-xl px-4')}
              />
            );
          })}
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

        <View className="bg-background mt-3 rounded-xl border border-neutral-200 p-3">
          <Text className="text-muted text-[11px] leading-4">
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
          <Button.Label>{isSubmitting ? '正在上架...' : '確認釋出好物'}</Button.Label>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
