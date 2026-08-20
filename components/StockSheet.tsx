import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { Button } from 'heroui-native';

import { QuantityStepper } from '@/components/QuantityStepper';
import { MAX_LISTING_QUANTITY, remainingQuantity } from '@/lib/constants';
import type { Listing } from '@/lib/store';

type StockSheetProps = {
  /** The listing being edited; null keeps the sheet closed. */
  listing: Listing | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (quantity: number) => void;
};

/**
 * Seller-side editor for `listings.quantity`. Restocking or trimming stock goes
 * through `set_listing_quantity`, so the floor here mirrors the server rule:
 * stock can never drop below the units pending or completed orders already hold.
 */
export function StockSheet({ listing, isSaving, onCancel, onSave }: StockSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [lastListingId, setLastListingId] = useState<string | null>(null);

  const listingId = listing?.id ?? null;

  // Reset the draft only when a different listing opens the sheet, mirroring
  // PaymentMethodsSheet — a render-time adjustment avoids an effect round-trip.
  if (listingId !== lastListingId) {
    setLastListingId(listingId);
    setQuantity(listing ? listing.quantity : quantity);
  }

  const total = listing?.quantity ?? 1;
  const committed = listing?.sold_quantity ?? 0;
  const floor = Math.max(1, committed);
  const remaining = remainingQuantity(total, committed);
  const nextRemaining = Math.max(0, quantity - committed);
  const delta = quantity - total;

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
            <Text className="text-foreground text-base font-bold">調整庫存</Text>
            <Text className="text-muted mt-1.5 text-xs" numberOfLines={2}>
              {listing?.title ?? ''}
            </Text>

            <View className="bg-canvas mt-3 gap-1 rounded-xl px-3 py-2.5">
              <StockRow label="目前總數" value={`${total} 件`} />
              <StockRow label="已成交／預訂" value={`${committed} 件`} />
              <StockRow label="還可販售" value={`${remaining} 件`} />
            </View>

            <Text className="text-foreground mt-4 text-sm font-semibold">新的總數</Text>
            <QuantityStepper
              className="mt-2"
              value={quantity}
              min={floor}
              max={MAX_LISTING_QUANTITY}
              isDisabled={isSaving}
              onChange={setQuantity}
              hint={
                committed > 0
                  ? `已有 ${committed} 件成交或預訂，總數不能少於 ${floor} 件。`
                  : '總數就是買家可以下單的件數，最多 999 件。'
              }
            />

            <Text className="text-muted text-2xs mt-3 leading-4">
              {delta === 0
                ? `維持 ${total} 件，買家可購買 ${remaining} 件。`
                : delta > 0
                  ? `補貨 ${delta} 件後，買家可購買 ${nextRemaining} 件${
                      remaining <= 0 ? '，商品會重新開放出價。' : '。'
                    }`
                  : `減少 ${-delta} 件後，買家可購買 ${nextRemaining} 件${
                      nextRemaining <= 0 ? '，商品會標記為已售完。' : '。'
                    }`}
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
                isDisabled={isSaving || delta === 0}
                onPress={() => onSave(quantity)}
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

function StockRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-muted text-xs">{label}</Text>
      <Text className="text-foreground text-xs font-semibold">{value}</Text>
    </View>
  );
}
