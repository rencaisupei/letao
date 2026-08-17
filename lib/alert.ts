import { create } from 'zustand';

export type AlertTone = 'default' | 'success' | 'danger';

export type AlertPayload = {
  title: string;
  message: string;
  tone?: AlertTone;
  /** Label of the primary button. Defaults to 我了解了 */
  confirmLabel?: string;
  /** Runs after the alert closes. */
  onConfirm?: () => void;
  /** When set, a secondary dismiss button is shown next to the primary one. */
  dismissLabel?: string;
};

type AlertState = {
  current: AlertPayload | null;
  show: (payload: AlertPayload) => void;
  hide: () => void;
};

/** Cross-platform replacement for RN Alert, which is a no-op on web. */
export const useAlertStore = create<AlertState>((set) => ({
  current: null,
  show: (payload) => set({ current: payload }),
  hide: () => set({ current: null }),
}));

export function showAlert(payload: AlertPayload) {
  useAlertStore.getState().show(payload);
}
