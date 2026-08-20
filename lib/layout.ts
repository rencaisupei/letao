/**
 * Layout constants. Every screen shares one horizontal rhythm so headers, list
 * rows and grid cards line up on the same left/right edge.
 *
 * Use these instead of hand-picked paddings: mixed 12/14/16/24 values were the
 * reason content looked shifted from one screen to the next.
 */

/** Horizontal inset for screen content, list rows and grid gutters. */
export const SCREEN_PADDING = 16;

/** Vertical gap between cards and grid rows. */
export const CARD_GAP = 12;

/** Bottom inset that clears the tab bar / home indicator on scrollable screens. */
export const SCREEN_BOTTOM_PADDING = 40;

/** contentContainerStyle for a padded, non-list screen. */
export const screenContent = {
  padding: SCREEN_PADDING,
  paddingBottom: SCREEN_BOTTOM_PADDING,
} as const;

/** contentContainerStyle for a vertical list of cards. */
export const listContent = {
  padding: SCREEN_PADDING,
  paddingBottom: SCREEN_BOTTOM_PADDING,
  gap: CARD_GAP,
} as const;

/** columnWrapperStyle for a multi-column grid, aligned with screenContent. */
export const gridColumnWrapper = {
  gap: CARD_GAP,
  paddingHorizontal: SCREEN_PADDING,
} as const;

/** contentContainerStyle for a multi-column grid. */
export const gridContent = {
  gap: CARD_GAP,
  paddingVertical: CARD_GAP,
  paddingBottom: SCREEN_BOTTOM_PADDING,
} as const;

/** Card width that keeps a grid flush with SCREEN_PADDING on both edges. */
export function gridCardWidth(width: number, columns = 2): number {
  const available = width - SCREEN_PADDING * 2 - CARD_GAP * (columns - 1);
  return Math.floor(available / columns);
}
