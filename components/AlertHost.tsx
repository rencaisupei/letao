import { Button } from 'heroui-native';
import { Modal, Text, View } from 'react-native';

import { useAlertStore } from '@/lib/alert';

/**
 * Single app-wide alert surface. RN's Alert.alert is a no-op on web, so all
 * user-facing notices go through here.
 */
export function AlertHost() {
  const current = useAlertStore((state) => state.current);
  const hide = useAlertStore((state) => state.hide);

  const toneClass =
    current?.tone === 'danger'
      ? 'text-red-700'
      : current?.tone === 'success'
        ? 'text-sage-deep'
        : 'text-foreground';

  return (
    <Modal visible={current !== null} transparent animationType="fade" onRequestClose={hide}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="bg-background w-full max-w-sm rounded-2xl border border-neutral-200 p-5">
          <Text className={`text-base font-bold ${toneClass}`}>{current?.title ?? ''}</Text>
          <Text className="text-muted mt-3 text-[13px] leading-5">{current?.message ?? ''}</Text>
          <Button className="mt-5" onPress={hide}>
            <Button.Label>我了解了</Button.Label>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
