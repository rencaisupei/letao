import { Pressable, Text, TextInput, View } from 'react-native';
import { Check, Truck } from 'lucide-react-native';

import {
  LOGISTICS_OPTIONS,
  MAX_SHIPPING_FEE,
  MEETUP_METHOD,
  SAGE,
  type ShippingOption,
  formatShippingFee,
  suggestedShippingFee,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Fee is kept as raw text while the seller is typing. */
export type ShippingDraft = { method: string; fee: string };

export type ShippingDraftResult =
  | { ok: true; options: ShippingOption[] }
  | { ok: false; message: string };

export function defaultShippingDrafts(): ShippingDraft[] {
  const method = LOGISTICS_OPTIONS[0];
  return [{ method, fee: String(suggestedShippingFee(method)) }];
}

export function draftsFromOptions(options: ShippingOption[]): ShippingDraft[] {
  return options.map((option) => ({ method: option.method, fee: String(option.fee) }));
}

/** Validates the typed fees and returns options ordered like LOGISTICS_OPTIONS. */
export function normalizeShippingDrafts(drafts: ShippingDraft[]): ShippingDraftResult {
  if (drafts.length === 0) {
    return { ok: false, message: '請至少選擇一種運送方式，買家才知道要怎麼收到商品。' };
  }

  const options: ShippingOption[] = [];

  for (const method of LOGISTICS_OPTIONS) {
    const draft = drafts.find((item) => item.method === method);
    if (!draft) continue;

    if (method === MEETUP_METHOD) {
      options.push({ method, fee: 0 });
      continue;
    }

    const raw = draft.fee.trim();
    if (raw === '') {
      return { ok: false, message: `請填寫「${method}」的運費，免運請填 0。` };
    }

    const fee = Number.parseFloat(raw);
    if (!Number.isFinite(fee) || fee < 0) {
      return { ok: false, message: `「${method}」的運費請填 0 以上的數字。` };
    }
    if (fee > MAX_SHIPPING_FEE) {
      return {
        ok: false,
        message: `「${method}」的運費上限為 NT$ ${MAX_SHIPPING_FEE.toLocaleString('en-US')}。`,
      };
    }

    options.push({ method, fee: Math.round(fee) });
  }

  return { ok: true, options };
}

type ShippingOptionsPickerProps = {
  value: ShippingDraft[];
  isDisabled?: boolean;
  onChange: (value: ShippingDraft[]) => void;
};

/** Multi-select delivery methods, each with the fee the buyer will pay. */
export function ShippingOptionsPicker({
  value,
  isDisabled = false,
  onChange,
}: ShippingOptionsPickerProps) {
  const toggle = (method: string) => {
    if (isDisabled) return;
    const exists = value.some((item) => item.method === method);
    if (exists) {
      onChange(value.filter((item) => item.method !== method));
      return;
    }
    onChange([
      ...value,
      {
        method,
        fee: method === MEETUP_METHOD ? '0' : String(suggestedShippingFee(method)),
      },
    ]);
  };

  const setFee = (method: string, fee: string) => {
    onChange(value.map((item) => (item.method === method ? { ...item, fee } : item)));
  };

  return (
    <View>
      <View className="gap-1.5">
        {LOGISTICS_OPTIONS.map((method) => {
          const draft = value.find((item) => item.method === method) ?? null;
          const isSelected = draft !== null;
          const isMeetup = method === MEETUP_METHOD;

          return (
            <View
              key={method}
              className={cn(
                'rounded-xl border px-3 py-2.5',
                isSelected ? 'border-sage bg-mint/60' : 'bg-background border-neutral-200',
              )}
            >
              <View className="flex-row items-center">
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                  onPress={() => toggle(method)}
                  className="flex-1 flex-row items-center gap-2 py-1"
                >
                  <View
                    className={cn(
                      'h-5 w-5 items-center justify-center rounded-md border',
                      isSelected ? 'border-sage bg-sage' : 'border-neutral-300',
                    )}
                  >
                    {isSelected ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
                  </View>
                  <Text
                    className={cn(
                      'text-[13px]',
                      isSelected ? 'text-sage-deep font-bold' : 'text-muted font-medium',
                    )}
                  >
                    {method}
                  </Text>
                </Pressable>

                {isSelected ? (
                  isMeetup ? (
                    <Text className="text-sage-deep text-[11px] font-bold">面交不收運費</Text>
                  ) : (
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-muted text-[11px] font-semibold">運費 NT$</Text>
                      <TextInput
                        value={draft.fee}
                        onChangeText={(text) => setFee(method, text)}
                        editable={!isDisabled}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColorClassName="accent-neutral-400"
                        accessibilityLabel={`${method} 運費`}
                        className="bg-background text-foreground h-9 w-20 rounded-lg border border-neutral-200 px-2 text-right text-[13px] font-semibold"
                      />
                    </View>
                  )
                ) : (
                  <Text className="text-muted text-[11px]">
                    建議 {formatShippingFee(suggestedShippingFee(method))}
                  </Text>
                )}
              </View>

              {isSelected && !isMeetup && draft.fee.trim() !== '0' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFee(method, '0')}
                  className="mt-1.5 self-start"
                >
                  <Text className="text-sage-deep text-[11px] font-semibold">
                    這個方式改為免運（填 0）
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      <View className="mt-2 flex-row items-start gap-1.5">
        <Truck size={12} color={SAGE} strokeWidth={2.2} />
        <Text className="text-muted flex-1 text-[11px] leading-4">
          可以同時提供多種方式，買家出價時會挑一種並付對應運費。已選 {value.length} 種。
        </Text>
      </View>
    </View>
  );
}
