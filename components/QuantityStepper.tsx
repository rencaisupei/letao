import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { cn } from '@/lib/utils';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  isDisabled?: boolean;
  /** Line under the stepper, e.g. "庫存 5 件，售完自動下架". */
  hint?: string;
  className?: string;
};

/** −／＋ stepper with a typable field, clamped to [min, max]. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  isDisabled = false,
  hint,
  className,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(Math.max(Math.round(next), min), Math.max(min, max));

  const commitText = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    if (digits === '') {
      onChange(min);
      return;
    }
    onChange(clamp(Number.parseInt(digits, 10)));
  };

  return (
    <View className={className}>
      <View
        className={cn(
          'bg-background flex-row items-center rounded-xl border border-neutral-200 p-1.5',
          isDisabled ? 'opacity-60' : '',
        )}
      >
        <StepButton
          label="減少數量"
          isDisabled={isDisabled || value <= min}
          onPress={() => onChange(clamp(value - 1))}
        >
          <Minus size={16} color={value <= min ? '#D1D5DB' : '#374151'} strokeWidth={2.6} />
        </StepButton>

        <TextInput
          value={String(value)}
          onChangeText={commitText}
          keyboardType="number-pad"
          editable={!isDisabled}
          selectTextOnFocus
          textAlign="center"
          className="text-foreground h-10 flex-1 text-[15px] font-bold"
        />

        <StepButton
          label="增加數量"
          isDisabled={isDisabled || value >= max}
          onPress={() => onChange(clamp(value + 1))}
        >
          <Plus size={16} color={value >= max ? '#D1D5DB' : '#374151'} strokeWidth={2.6} />
        </StepButton>
      </View>
      {hint ? <Text className="text-muted mt-1.5 text-[11px] leading-4">{hint}</Text> : null}
    </View>
  );
}

function StepButton({
  label,
  isDisabled,
  onPress,
  children,
}: {
  label: string;
  isDisabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      className={cn(
        'h-10 w-11 items-center justify-center rounded-lg border',
        isDisabled ? 'border-neutral-100 bg-neutral-50' : 'bg-canvas border-neutral-200',
      )}
    >
      {children}
    </Pressable>
  );
}
