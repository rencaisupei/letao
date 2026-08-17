import { MessageCircle, ShieldCheck } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { SAGE } from '@/lib/constants';

export default function ChatScreen() {
  return (
    <ScrollView className="bg-canvas flex-1" contentContainerStyle={{ padding: 16 }}>
      <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
        <MessageCircle size={34} color={SAGE} strokeWidth={1.6} />
        <Text className="text-foreground mt-4 text-base font-bold">即時私訊</Text>
        <Text className="text-muted mt-2 text-center text-[13px] leading-5">
          目前的交易溝通全部走「出價媒合」流程：在探索首頁點擊商品送出出價，系統會直接回覆媒合結果與安全交手節點。
        </Text>
      </View>

      <View className="bg-background mt-3 rounded-2xl border border-neutral-200 p-4">
        <View className="flex-row items-center gap-2">
          <ShieldCheck size={18} color={SAGE} strokeWidth={1.8} />
          <Text className="text-foreground text-[13px] font-semibold">為什麼先做防砍價機制</Text>
        </View>
        <Text className="text-muted mt-2 text-[12px] leading-5">
          全新品最低出價 90%、二手品最低出價 80%，低於門檻的出價會在送出前被系統攔截，
          讓賣家不用花時間應付大刀，買家也知道合理的成交區間。
        </Text>
      </View>
    </ScrollView>
  );
}
