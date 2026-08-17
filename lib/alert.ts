import { create } from 'zustand';

export type AlertTone = 'default' | 'success' | 'danger';

export type AlertPayload = {
  title: string;
  message: string;
  tone?: AlertTone;
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
