import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { TextInput } from '@/components/ui/primitives/Text';
import { Eye, EyeOff } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';

type PasswordFieldProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  isEditable?: boolean;
  className?: string;
};

/** Password input with a show/hide toggle, shared by sign-in and account editing. */
export function PasswordField({
  value,
  onChangeText,
  placeholder,
  isEditable = true,
  className,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className={`relative ${className ?? 'mt-2'}`}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoComplete="off"
        editable={isEditable}
        secureTextEntry={!isVisible}
        placeholder={placeholder}
        placeholderTextColorClassName="accent-neutral-400"
        className="bg-canvas text-foreground h-11 rounded-xl border border-neutral-200 pr-12 pl-4 text-sm"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isVisible ? '隱藏密碼' : '顯示密碼'}
        onPress={() => setIsVisible((current) => !current)}
        className="absolute top-0 right-1 h-11 w-11 items-center justify-center"
      >
        {isVisible ? (
          <EyeOff size={18} color={SAGE} strokeWidth={1.8} />
        ) : (
          <Eye size={18} color={SAGE} strokeWidth={1.8} />
        )}
      </Pressable>
    </View>
  );
}
