import { Image, Text, View } from 'react-native';

import { cn } from '@/lib/utils';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

/** Sage circle with the initial, replaced by the uploaded photo when present. */
export function Avatar({ uri, name, size = 44, className }: AvatarProps) {
  const initial = (name ?? 'L').slice(0, 1).toUpperCase();

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={cn('bg-mint items-center justify-center overflow-hidden', className)}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityLabel={`${name ?? '易拍通用戶'}的頭像`}
        />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.4) }} className="text-sage-deep font-bold">
          {initial}
        </Text>
      )}
    </View>
  );
}
