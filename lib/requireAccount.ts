import { router } from 'expo-router';

import { showAlert } from '@/lib/alert';
import { useLetaoStore } from '@/lib/store';

/**
 * Browsing is open to guests. Anything that writes data (出價、上架、私訊、收藏、
 * 檢舉、評價) requires a registered account, so callers gate the action here.
 *
 * Returns true when the user is signed in; otherwise shows a prompt that leads
 * to the registration screen and returns false.
 */
export function requireAccount(actionLabel: string): boolean {
  const { userId } = useLetaoStore.getState();
  if (userId) return true;

  showAlert({
    title: '需要註冊樂淘帳號',
    message: `${actionLabel}需要先註冊。樂淘買賣雙方都採實名信箱註冊，交易紀錄、信任度與評價才能綁在同一個帳號上，交易更有保障。`,
    confirmLabel: '前往註冊',
    dismissLabel: '先繼續逛逛',
    onConfirm: () => {
      router.push('/sign-in');
    },
  });
  return false;
}
