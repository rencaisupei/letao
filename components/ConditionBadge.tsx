import { View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { getCondition } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function ConditionBadge({
  code,
  className,
}: {
  code: string | null | undefined;
  className?: string;
}) {
  const condition = getCondition(code);

  return (
    <View className={cn('rounded-md px-2 py-1', condition.bgClass, className)}>
      <Text className={cn('text-2xs font-bold', condition.textClass)}>{condition.label}</Text>
    </View>
  );
}
