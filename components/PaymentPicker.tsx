import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { Check } from 'lucide-react-native';

import {
  MEETUP_METHOD,
  PAYMENT_METHODS,
  type PaymentCode,
  isPaymentAllowedFor,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

/** True when at least one of the seller's delivery methods fits this payment. */
function fitsAnyMethod(code: PaymentCode, methods: string[]): boolean {
  if (methods.length === 0) return true;
  return methods.some((method) => isPaymentAllowedFor(code, method));
}

/**
 * Says what to tick to unlock the row, not just that it is unavailable — a
 * seller who only offers 面交 otherwise reads the greyed 貨到付款 row as a bug.
 */
function unavailableHint(code: PaymentCode): string {
  return code === 'cash' ? '需先勾選「面交」' : '需先勾選超商或宅配寄送';
}

type PaymentMethodsPickerProps = {
  value: PaymentCode[];
  /** Delivery methods the seller ticked, used to grey out impossible choices. */
  methods: string[];
  isDisabled?: boolean;
  onChange: (value: PaymentCode[]) => void;
};

/** Seller-side multi-select: which ways this seller accepts money. */
export function PaymentMethodsPicker({
  value,
  methods,
  isDisabled = false,
  onChange,
}: PaymentMethodsPickerProps) {
  const toggle = (code: PaymentCode) => {
    if (isDisabled) return;
    if (value.includes(code)) {
      onChange(value.filter((item) => item !== code));
      return;
    }
    onChange(
      PAYMENT_METHODS.filter((item) => item.code === code || value.includes(item.code)).map(
        (item) => item.code,
      ),
    );
  };

  return (
    <View className="gap-1.5">
      {PAYMENT_METHODS.map((item) => {
        const isSelected = value.includes(item.code);
        const isUsable = fitsAnyMethod(item.code, methods);

        return (
          <Pressable
            key={item.code}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled: isDisabled || !isUsable }}
            onPress={() => {
              if (!isUsable) return;
              toggle(item.code);
            }}
            className={cn(
              'rounded-xl border px-3 py-2.5',
              !isUsable
                ? 'border-neutral-200 bg-neutral-50'
                : isSelected
                  ? 'border-sage bg-mint/60'
                  : 'bg-background border-neutral-200',
            )}
          >
            <View className="flex-row items-center gap-2">
              <View
                className={cn(
                  'h-5 w-5 items-center justify-center rounded-md border',
                  isSelected && isUsable ? 'border-sage bg-sage' : 'border-neutral-300',
                )}
              >
                {isSelected && isUsable ? (
                  <Check size={13} color="#FFFFFF" strokeWidth={3} />
                ) : null}
              </View>
              <Text
                className={cn(
                  'flex-1 text-sm',
                  !isUsable
                    ? 'font-medium text-neutral-400'
                    : isSelected
                      ? 'text-sage-deep font-bold'
                      : 'text-muted font-medium',
                )}
              >
                {item.emoji} {item.label}
              </Text>
              {isUsable ? null : (
                <Text className="text-2xs font-semibold text-neutral-400">
                  {unavailableHint(item.code)}
                </Text>
              )}
            </View>
            <Text
              className={cn(
                'text-2xs mt-1 pl-7 leading-4',
                isUsable ? 'text-muted' : 'text-neutral-400',
              )}
            >
              {item.hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PaymentChoiceListProps = {
  /** Payment codes the seller accepts. */
  options: PaymentCode[];
  /** The delivery method the buyer is choosing, used to filter the list. */
  logistics: string | null;
  value: PaymentCode | null;
  onChange: (value: PaymentCode) => void;
};

/** Buyer-side single-select, shown inside the offer sheet. */
export function PaymentChoiceList({ options, logistics, value, onChange }: PaymentChoiceListProps) {
  const usable = options.filter((code) => isPaymentAllowedFor(code, logistics));

  if (usable.length === 0) {
    return (
      <Text className="text-muted text-2xs leading-4">
        {options.length === 0
          ? '賣家尚未設定付款方式，出價成立後請在私訊中確認怎麼付款。'
          : `賣家設定的付款方式不適用於${logistics ?? MEETUP_METHOD}，請改選其他運送方式或私訊確認。`}
      </Text>
    );
  }

  return (
    <View className="gap-1.5">
      {usable.map((code) => {
        const meta = PAYMENT_METHODS.find((item) => item.code === code);
        if (!meta) return null;
        const isChosen = value === code;

        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected: isChosen }}
            onPress={() => onChange(code)}
            className={cn(
              'rounded-xl border px-3 py-2.5',
              isChosen ? 'border-sage bg-mint' : 'bg-canvas border-neutral-200',
            )}
          >
            <Text
              className={cn(
                'text-xs',
                isChosen ? 'text-sage-deep font-bold' : 'text-muted font-medium',
              )}
            >
              {meta.emoji} {meta.label}
            </Text>
            <Text className="text-muted text-2xs mt-0.5 leading-4">{meta.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
