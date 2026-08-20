import { View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { getModeration } from '@/lib/constants';
import { cn } from '@/lib/utils';

type ModerationBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

export function ModerationBadge({ status, className }: ModerationBadgeProps) {
  const meta = getModeration(status);

  return (
    <View className={cn('rounded-md px-2 py-1', meta.bgClass, className)}>
      <Text className={cn('text-2xs font-bold', meta.textClass)}>{meta.label}</Text>
    </View>
  );
}
