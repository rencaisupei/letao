import { Compass, MessageCircle, PlusCircle, User } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { CANVAS, SAGE } from '@/lib/constants';
import { useLetaoStore } from '@/lib/store';

export default function TabLayout() {
  const status = useLetaoStore((state) => state.status);

  if (status === 'loading') {
    return (
      <View className="bg-canvas flex-1 items-center justify-center">
        <ActivityIndicator color={SAGE} />
      </View>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar's `style` prop is a string enum ("dark"/"light"/"auto"), not a React Native style object */}
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          header: () => <BrandHeader />,
          sceneStyle: { backgroundColor: CANVAS },
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#EEEEEE',
          },
          tabBarActiveTintColor: SAGE,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '探索首頁',
            tabBarIcon: ({ color, size }) => <Compass color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: '即時私訊',
            tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="sell"
          options={{
            title: '釋出好物',
            tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size ?? 24} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: '個人主頁',
            tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 24} />,
          }}
        />
      </Tabs>
    </>
  );
}
