import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';

import { PaymentMethodsPicker } from '@/components/PaymentPicker';
import { type PaymentCode, getPayment, isPaymentAllowedFor } from '@/lib/constants';
import type { Listing } from '@/lib/store';

type PaymentMethodsSheetProps = {
  /** The listing being edited; null keeps the sheet closed. */
  listing: Listing | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (payments: PaymentCode[]) => void;
};

/**
 * Seller-side editor for `listings.payment_methods`, used to fill in listings
 * published before payment choices existed.
 */
export function PaymentMethodsSheet({
  listing,
  isSaving,
  onCancel,
  onSave,
}: PaymentMethodsSheetProps) {
  const [payments, setPayments] = useState<PaymentCode[]>([]);
  const [lastListingId, setLastListingId] = useState<string | null>(null);

  const listingId = listing?.id ?? null;
  const stored = listing?.payment_methods ?? [];

  // Reset the draft only when a different listing opens the sheet, not on
  // every render — adjusting state during render instead of an effect avoids
  // depending on `stored`, which is a fresh array whenever it defaults to [].
  if (listingId !== lastListingId) {
    setLastListingId(listingId);
    setPayments(listingId ? (stored.length > 0 ? stored : ['transfer']) : payments);
  }

  const methods = (listing?.shipping_options ?? []).map((option) => option.method);
  const usable = payments.filter((code) =>
    methods.some((method) => isPaymentAllowedFor(code, method)),
  );

  return (
    <Modal
      visible={listing !== null}
      transparent
      animationType="fade"
      onRequestClose={isSaving ? undefined : onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 items-center justify-center bg-black/40 px-6"
      >
        <View className="bg-background max-h-[86%] w-full max-w-sm rounded-2xl border border-neutral-200">
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text className="text-foreground text-base font-bold">設定付款方式</Text>
            <Text className="text-muted mt-1.5 text-[12px]" numberOfLines={2}>
              {listing?.title ?? ''}
            </Text>
            <Text className="text-muted mt-2 text-[11px] leading-4">
              這件商品的運送方式：{methods.length > 0 ? methods.join('、') : '尚未設定'}
              。付款方式必須與運送方式相容，不相容的選項會自動變灰。
            </Text>

            <View className="mt-3">
              <PaymentMethodsPicker
                value={payments}
                methods={methods}
                isDisabled={isSaving}
                onChange={setPayments}
              />
            </View>

            <Text className="text-muted mt-2 text-[11px] leading-4">
              {usable.length > 0
                ? `商品頁會公開顯示：${usable.map((code) => getPayment(code)?.label ?? code).join('、')}。`
                : '請至少勾選一種與運送方式相容的付款方式。'}
            </Text>

            <View className="mt-4 flex-row gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                isDisabled={isSaving}
                onPress={onCancel}
              >
                <Button.Label>取消</Button.Label>
              </Button>
              <Button
                className="flex-1"
                isDisabled={isSaving || usable.length === 0}
                onPress={() => onSave(usable)}
              >
                <Button.Label>{isSaving ? '儲存中...' : '儲存'}</Button.Label>
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
