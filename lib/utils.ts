import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "剩 5 小時 12 分" style countdown for an ISO end time. */
export function formatRemaining(endTimeIso: string): string {
  const diffMs = new Date(endTimeIso).getTime() - Date.now();
  if (diffMs <= 0) return '已結束';

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `剩 ${minutes} 分`;
  return `剩 ${hours} 小時 ${minutes} 分`;
}
