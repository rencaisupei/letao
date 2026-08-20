import { useMemo, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';

import { Text, TextInput } from '@/components/ui/primitives/Text';
import { screenContent } from '@/lib/layout';
import { Accordion, Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import {
  CircleHelp,
  CreditCard,
  MessageSquare,
  PackagePlus,
  Search,
  ShieldAlert,
  ShoppingBag,
  Truck,
  UserCog,
  X,
} from 'lucide-react-native';

import { SelectChip } from '@/components/SelectChip';
import { SAGE } from '@/lib/constants';
import { FAQ_TOPICS, type FaqTopic, faqTopicCount, faqTopicLabel, searchFaq } from '@/lib/faq';

const TOPIC_ICON: Record<FaqTopic, React.ReactNode> = {
  buying: <ShoppingBag size={14} color={SAGE} strokeWidth={2.2} />,
  selling: <PackagePlus size={14} color={SAGE} strokeWidth={2.2} />,
  shipping: <Truck size={14} color={SAGE} strokeWidth={2.2} />,
  payment: <CreditCard size={14} color={SAGE} strokeWidth={2.2} />,
  dispute: <ShieldAlert size={14} color={SAGE} strokeWidth={2.2} />,
  account: <UserCog size={14} color={SAGE} strokeWidth={2.2} />,
};

export default function FaqScreen() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<FaqTopic | null>(null);

  const results = useMemo(() => searchFaq(query, topic), [query, topic]);

  const groups = useMemo(() => {
    return FAQ_TOPICS.map((entry) => ({
      code: entry.code,
      label: entry.label,
      items: results.filter((item) => item.topic === entry.code),
    })).filter((group) => group.items.length > 0);
  }, [results]);

  const isSearching = query.trim() !== '';

  return (
    <ScrollView
      className="bg-canvas flex-1"
      contentContainerStyle={screenContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: '常見問題' }} />

      <View className="bg-background rounded-2xl border border-neutral-200 p-4">
        <View className="flex-row items-center gap-2">
          <CircleHelp size={18} color={SAGE} strokeWidth={2} />
          <Text className="text-foreground text-base font-bold">常見問題</Text>
        </View>
        <Text className="text-muted mt-2 text-xs leading-5">
          運送、付款、上架與糾紛處理的說明都在這裡。用關鍵字搜尋，或直接點下方的主題。
        </Text>

        <View className="bg-canvas mt-3 h-11 flex-row items-center rounded-xl border border-neutral-200 px-3">
          <Search size={15} color="#9CA3AF" strokeWidth={2.2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜尋問題，例如「運費」或「退款」"
            placeholderTextColorClassName="accent-neutral-400"
            className="text-foreground ml-2 h-11 flex-1 text-sm"
          />
          {isSearching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="清除搜尋"
              hitSlop={8}
              onPress={() => setQuery('')}
              className="p-1"
            >
              <X size={14} color="#9CA3AF" strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 12, paddingRight: 8 }}
      >
        <SelectChip
          size="sm"
          label="全部"
          isSelected={topic === null}
          onPress={() => setTopic(null)}
        />
        {FAQ_TOPICS.map((entry) => (
          <SelectChip
            key={entry.code}
            size="sm"
            label={`${entry.label} ${faqTopicCount(entry.code)}`}
            isSelected={topic === entry.code}
            onPress={() => setTopic(topic === entry.code ? null : entry.code)}
          />
        ))}
      </ScrollView>

      {groups.length === 0 ? (
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-8">
          <Search size={26} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-3 text-sm font-bold">沒有找到相關問題</Text>
          <Text className="text-muted mt-2 text-center text-xs leading-5">
            換個關鍵字試試，或直接把問題寄給客服，我們會回覆你並考慮補進這一頁。
          </Text>
          <Button className="mt-4" onPress={() => router.push('/contact')}>
            <Button.Label>問客服</Button.Label>
          </Button>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.code} className="mb-3">
            <View className="mb-2 flex-row items-center gap-1.5 px-1">
              {TOPIC_ICON[group.code]}
              <Text className="text-foreground text-xs font-bold">{group.label}</Text>
              <Text className="text-muted text-2xs">{group.items.length} 則</Text>
            </View>

            <Accordion selectionMode="single" variant="surface">
              {group.items.map((item) => (
                <Accordion.Item key={item.id} value={item.id}>
                  <Accordion.Trigger>
                    <Text className="text-foreground flex-1 pr-2 text-sm leading-5 font-semibold">
                      {item.question}
                    </Text>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                  <Accordion.Content>
                    {item.answer.map((paragraph) => (
                      <Text key={paragraph} className="text-muted mb-2 text-xs leading-5">
                        {paragraph}
                      </Text>
                    ))}
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion>
          </View>
        ))
      )}

      <View className="bg-mint mt-1 rounded-2xl p-4">
        <View className="flex-row items-center gap-2">
          <MessageSquare size={16} color={SAGE} strokeWidth={2} />
          <Text className="text-sage-deep text-sm font-bold">還是沒解決嗎</Text>
        </View>
        <Text className="text-sage-deep/90 mt-2 text-xs leading-5">
          描述你的狀況並附上商品名稱或訂單時間，客服可以查到相關紀錄再回覆你。
        </Text>
        <View className="mt-3 flex-row gap-2">
          <Button size="sm" className="flex-1" onPress={() => router.push('/contact')}>
            <Button.Label>聯絡我們</Button.Label>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onPress={() => router.push('/privacy')}
          >
            <Button.Label>隱私權政策</Button.Label>
          </Button>
        </View>
      </View>

      {topic !== null && !isSearching ? (
        <Text className="text-muted text-2xs mt-3 text-center">
          目前只顯示「{faqTopicLabel(topic)}」，點「全部」看所有問題
        </Text>
      ) : null}
    </ScrollView>
  );
}
