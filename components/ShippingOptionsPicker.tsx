import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Check, Truck } from 'lucide-react-native';

import {
  LOGISTICS_OPTIONS,
  MAX_SHIPPING_FEE,
  MEETUP_METHOD,
  SAGE,
  type ShippingFeeMode,
  type ShippingOption,
  formatShippingFee,
  suggestedShippingFee,
} from '@/lib/constants';
import type { ShippingQuote } from '@/lib/shipping';
import { cn } from '@/lib/utils';

/** Fee is kept as raw text while the seller is typing. */
export type ShippingDraft = { method: string; mode: ShippingFeeMode; fee: string };

export type ShippingDraftResult =
  | { ok: true; options: ShippingOption[] }
  | { ok: false; message: string };

export type QuoteMap = Record<string, ShippingQuote>;

export function defaultShippingDrafts(): ShippingDraft[] {
  const method = LOGISTICS_OPTIONS[0];
  return [{ method, mode: 'auto', fee: String(suggestedShippingFee(method)) }];
}

export function draftsFromOptions(options: ShippingOption[]): ShippingDraft[] {
  return options.map((option) => ({
    method: option.method,
    mode: option.mode,
    fee: String(option.fee),
  }));
}

/**
 * Validates the drafts and returns options ordered like LOGISTICS_OPTIONS.
 * Auto rows store the quoted 本島 base fee; the real fee is recomputed
 * server-side when a buyer places an offer.
 */
export function normalizeShippingDrafts(
  drafts: ShippingDraft[],
  quotes: QuoteMap,
  canAutoQuote: boolean,
): ShippingDraftResult {
  if (drafts.length === 0) {
    return { ok: false, message: '請至少選擇一種運送方式，買家才知道要怎麼收到商品。' };
  }

  const options: ShippingOption[] = [];

  for (const method of LOGISTICS_OPTIONS) {
    const draft = drafts.find((item) => item.method === method);
    if (!draft) continue;

    if (method === MEETUP_METHOD) {
      options.push({ method, fee: 0, mode: 'auto' });
      continue;
    }

    if (draft.mode === 'auto') {
      if (!canAutoQuote) {
        return {
          ok: false,
          message: `「${method}」設定為自動試算，請先填寫包裝重量與長寬高，或改成自訂運費。`,
        };
      }
      const quote = quotes[method];
      if (!quote) {
        return { ok: false, message: `「${method}」的運費還在試算，請稍候再送出。` };
      }
      if (!quote.available) {
        return {
          ok: false,
          message: `「${method}」無法寄送這個包裝：${quote.note ?? '超過該物流的尺寸或重量限制。'}`,
        };
      }
      options.push({ method, fee: quote.fee, mode: 'auto' });
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

    options.push({ method, fee: Math.round(fee), mode: 'manual' });
  }

  return { ok: true, options };
}

type ShippingOptionsPickerProps = {
  value: ShippingDraft[];
  /** Rate-engine quotes keyed by method, for the current package. */
  quotes: QuoteMap;
  isQuoting?: boolean;
  /** False until weight and all three dimensions are filled in. */
  canAutoQuote: boolean;
  isDisabled?: boolean;
  onChange: (value: ShippingDraft[]) => void;
};

/** Multi-select delivery methods, each auto-priced or overridden by the seller. */
export function ShippingOptionsPicker({
  value,
  quotes,
  isQuoting = false,
  canAutoQuote,
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

    const quote = quotes[method];
    const supportsAuto =
      method === MEETUP_METHOD ||
      (canAutoQuote && quote !== undefined && quote.source !== 'unsupported');

    onChange([
      ...value,
      {
        method,
        mode: supportsAuto ? 'auto' : 'manual',
        fee:
          method === MEETUP_METHOD
            ? '0'
            : String(quote?.available ? quote.fee : suggestedShippingFee(method)),
      },
    ]);
  };

  const patch = (method: string, next: Partial<ShippingDraft>) => {
    onChange(value.map((item) => (item.method === method ? { ...item, ...next } : item)));
  };

  return (
    <View>
      <View className="gap-1.5">
        {LOGISTICS_OPTIONS.map((method) => {
          const draft = value.find((item) => item.method === method) ?? null;
          const isSelected = draft !== null;
          const isMeetup = method === MEETUP_METHOD;
          const quote = quotes[method];
          const isAuto = draft?.mode === 'auto';
          const autoBlocked = isAuto && !isMeetup && quote !== undefined && !quote.available;

          return (
            <View
              key={method}
              className={cn(
                'rounded-xl border px-3 py-2.5',
                autoBlocked
                  ? 'border-red-200 bg-red-50'
                  : isSelected
                    ? 'border-sage bg-mint/60'
                    : 'bg-background border-neutral-200',
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
                  ) : isAuto ? (
                    <View className="flex-row items-center gap-1.5">
                      {isQuoting ? (
                        <ActivityIndicator size="small" color={SAGE} />
                      ) : (
                        <Text
                          className={cn(
                            'text-[13px] font-bold',
                            autoBlocked ? 'text-red-700' : 'text-sage-deep',
                          )}
                        >
                          {quote?.available ? formatShippingFee(quote.fee) : '無法寄送'}
                        </Text>
                      )}
                      <Text className="text-muted text-[10px] font-semibold">自動</Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-muted text-[11px] font-semibold">運費 NT$</Text>
                      <TextInput
                        value={draft.fee}
                        onChangeText={(text) => patch(method, { fee: text })}
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
                    {canAutoQuote && quote
                      ? quote.available
                        ? `試算 ${formatShippingFee(quote.fee)}`
                        : '不支援此包裝'
                      : `建議 ${formatShippingFee(suggestedShippingFee(method))}`}
                  </Text>
                )}
              </View>

              {isSelected && !isMeetup ? (
                <View className="mt-1.5">
                  {isAuto && quote?.note ? (
                    <Text
                      className={cn(
                        'text-[11px] leading-4',
                        autoBlocked ? 'font-medium text-red-700' : 'text-muted',
                      )}
                    >
                      {quote.available && quote.tier ? `${quote.tier} ∙ ` : ''}
                      {quote.note}
                    </Text>
                  ) : null}

                  <View className="mt-1 flex-row gap-3">
                    {isAuto ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          patch(method, {
                            mode: 'manual',
                            fee: String(
                              quote?.available ? quote.fee : suggestedShippingFee(method),
                            ),
                          })
                        }
                      >
                        <Text className="text-sage-deep text-[11px] font-semibold">
                          改為自訂運費
                        </Text>
                      </Pressable>
                    ) : (
                      <>
                        {canAutoQuote && quote && quote.source !== 'unsupported' ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => patch(method, { mode: 'auto' })}
                          >
                            <Text className="text-sage-deep text-[11px] font-semibold">
                              改用自動試算
                            </Text>
                          </Pressable>
                        ) : null}
                        {draft.fee.trim() === '0' ? null : (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => patch(method, { fee: '0' })}
                          >
                            <Text className="text-sage-deep text-[11px] font-semibold">
                              改為免運（填 0）
                            </Text>
                          </Pressable>
                        )}
                      </>
                    )}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View className="mt-2 flex-row items-start gap-1.5">
        <Truck size={12} color={SAGE} strokeWidth={2.2} />
        <Text className="text-muted flex-1 text-[11px] leading-4">
          {canAutoQuote
            ? `自動試算的金額會依買家收件縣市在下單時重算（離島／偏遠加價）。已選 ${value.length} 種。`
            : `填好包裝重量與尺寸後就能自動試算運費，未填時請自訂金額。已選 ${value.length} 種。`}
        </Text>
      </View>
    </View>
  );
}
