import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Compass } from 'lucide-react-native';

import { Text } from '@/components/ui/primitives/Text';
import { SAGE } from '@/lib/constants';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '找不到頁面' }} />
      <View className="bg-canvas flex-1 items-center justify-center p-6">
        <Compass size={30} color={SAGE} strokeWidth={1.6} />
        <Text className="text-foreground mt-4 text-base font-bold">找不到這個頁面</Text>
        <Text className="text-muted mt-2 text-center text-sm leading-5">
          連結可能已失效，或商品已被下架。
        </Text>
        <Link href="/" className="mt-4">
          <Text className="text-sage-deep text-sm font-semibold">回到探索首頁</Text>
        </Link>
      </View>
    </>
  );
}
