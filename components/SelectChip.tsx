import { Pressable } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { cn } from '@/lib/utils';

type SelectChipProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  className?: string;
  size?: 'sm' | 'md';
};

export function SelectChip({
  label,
  isSelected,
  onPress,
  className,
  size = 'md',
}: SelectChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      className={cn(
        'items-center justify-center rounded-full border',
        // min-h keeps the pill from clipping its label when the phone font
        // size setting scales the text up.
        size === 'md' ? 'min-h-9 px-4 py-2' : 'min-h-8 px-3 py-1.5',
        isSelected ? 'border-sage bg-sage' : 'bg-background border-neutral-200',
        className,
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(
          size === 'md' ? 'text-xs' : 'text-2xs',
          isSelected ? 'font-bold text-white' : 'text-muted font-medium',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
