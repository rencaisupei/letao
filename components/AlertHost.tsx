import { Button } from 'heroui-native';
import { Modal, ScrollView, Text, View } from 'react-native';

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

  const handleConfirm = () => {
    const action = current?.onConfirm;
    hide();
    action?.();
  };

  return (
    <Modal visible={current !== null} transparent animationType="fade" onRequestClose={hide}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="bg-background max-h-[86%] w-full max-w-sm rounded-2xl border border-neutral-200">
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text className={`text-base font-bold ${toneClass}`}>{current?.title ?? ''}</Text>
            <Text className="text-muted mt-3 text-[13px] leading-5">{current?.message ?? ''}</Text>

            {current?.dismissLabel ? (
              <View className="mt-5 flex-row gap-2">
                <Button variant="secondary" className="flex-1" onPress={hide}>
                  <Button.Label>{current.dismissLabel}</Button.Label>
                </Button>
                <Button className="flex-1" onPress={handleConfirm}>
                  <Button.Label>{current.confirmLabel ?? '確認'}</Button.Label>
                </Button>
              </View>
            ) : (
              <Button className="mt-5" onPress={handleConfirm}>
                <Button.Label>{current?.confirmLabel ?? '我了解了'}</Button.Label>
              </Button>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
