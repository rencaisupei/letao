import { Pressable, Text } from 'react-native';

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
        size === 'md' ? 'px-4 py-2' : 'px-3 py-1.5',
        isSelected ? 'border-sage bg-sage' : 'bg-background border-neutral-200',
        className,
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(
          size === 'md' ? 'text-xs' : 'text-[11px]',
          isSelected ? 'font-bold text-white' : 'text-muted font-medium',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
