import { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';

/**
 * Cap OS font scaling. The layout is compact (11-16px steps, 44px controls);
 * past ~1.2x the phone font-size setting pushes labels out of chips and clips
 * single-line rows. Text still grows for accessibility, just bounded.
 */
export const MAX_FONT_SCALE = 1.2;

/**
 * Drop-in replacement for react-native's Text with bounded font scaling.
 * Import this everywhere instead of react-native's Text.
 */
export function Text({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...rest }: TextProps) {
  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} />;
}

/** Same bounded scaling for text fields, whose heights are fixed. */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  ({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...rest }, ref) => (
    <RNTextInput ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} />
  ),
);

TextInput.displayName = 'AppTextInput';
