// 易拍通：推播通知
// notifications 表是站內通知的唯一入口，推播只是它的第二個出口：
//   1. 裝置註冊 Expo push token（存進 push_tokens）
//   2. 任何寫入通知的動作之後，客戶端呼叫 push-dispatch edge function 把待推播的通知送出去
//   3. 無法取得遠端 token 的環境（Expo Go、模擬器、網頁）退回「本機通知」：App 開著時仍會跳提醒
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { Href } from 'expo-router';

import { bilt } from '@/lib/bilt';

const PREF_KEY = 'letao.push.enabled';
const TOKEN_KEY = 'letao.push.token';
const DISPATCH_DEBOUNCE_MS = 1200;

/** remote = 背景推播可用；local = 只能在 App 開著時提醒；unsupported = 此環境沒有通知能力 */
export type PushMode = 'remote' | 'local' | 'unsupported';
export type PushPermission = 'granted' | 'denied' | 'undetermined';
export type PushPreference = 'on' | 'off' | 'unset';

export type PushEnableResult = {
  ok: boolean;
  mode: PushMode;
  reason: 'ok' | 'unsupported' | 'denied' | 'token_failed' | 'save_failed';
  detail?: string;
};

export type PushLocalPayload = {
  id: string;
  title: string;
  body: string | null;
  linkType: string | null;
  linkId: string | null;
};

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** EAS project id is required by Expo's push service; it only exists once the app is linked to a build. */
export function easProjectId(): string | null {
  const extra = readRecord(Constants.expoConfig?.extra);
  const fromExtra = readString(readRecord(extra.eas), 'projectId');
  if (fromExtra) return fromExtra;
  return readString(readRecord(Constants.easConfig), 'projectId');
}

function webNotification(): typeof Notification | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return 'Notification' in window ? window.Notification : null;
}

export function pushMode(): PushMode {
  if (Platform.OS === 'web') return webNotification() ? 'local' : 'unsupported';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'local';
  if (!Device.isDevice) return 'local';
  return easProjectId() ? 'remote' : 'local';
}

let runtimeReady = false;

/** Foreground presentation + the Android channel used by every push we send. */
export async function configurePushRuntime(): Promise<void> {
  if (runtimeReady || Platform.OS === 'web') return;
  runtimeReady = true;

  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '易拍通提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 150, 200],
      lightColor: '#4C7C59',
    });
  }
}

export async function getPushPermission(): Promise<PushPermission> {
  const web = webNotification();
  if (Platform.OS === 'web') {
    if (!web) return 'denied';
    if (web.permission === 'granted') return 'granted';
    return web.permission === 'denied' ? 'denied' : 'undetermined';
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

async function requestPushPermission(): Promise<PushPermission> {
  const web = webNotification();
  if (Platform.OS === 'web') {
    if (!web) return 'denied';
    const result = await web.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  }

  const settings = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (settings.granted) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPushPreference(): Promise<PushPreference> {
  const stored = await AsyncStorage.getItem(PREF_KEY);
  if (stored === 'on') return 'on';
  if (stored === 'off') return 'off';
  return 'unset';
}

async function setPushPreference(value: 'on' | 'off'): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, value);
}

async function saveRemoteToken(token: string): Promise<boolean> {
  const { error } = await bilt.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS,
    p_label: Device.modelName ?? null,
  });
  if (error) return false;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return true;
}

let remoteActive = false;

/** True when this device holds a live Expo push token, so background pushes will arrive. */
export function isRemotePushActive(): boolean {
  return remoteActive;
}

/**
 * Ask for permission, register the device with Expo's push service when possible and remember the
 * preference. Safe to call repeatedly — Expo returns the same token for the same install.
 */
export async function enablePush(): Promise<PushEnableResult> {
  const mode = pushMode();
  if (mode === 'unsupported') {
    return { ok: false, mode, reason: 'unsupported' };
  }

  await configurePushRuntime();

  let permission = await getPushPermission();
  if (permission === 'undetermined') {
    permission = await requestPushPermission();
  }
  if (permission !== 'granted') {
    return { ok: false, mode, reason: 'denied' };
  }

  if (mode === 'local') {
    remoteActive = false;
    await setPushPreference('on');
    return { ok: true, mode, reason: 'ok' };
  }

  const projectId = easProjectId();
  if (!projectId) {
    remoteActive = false;
    await setPushPreference('on');
    return { ok: true, mode: 'local', reason: 'ok' };
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const saved = await saveRemoteToken(token);
    if (!saved) {
      return { ok: false, mode, reason: 'save_failed' };
    }
    remoteActive = true;
    await setPushPreference('on');
    return { ok: true, mode, reason: 'ok' };
  } catch (error) {
    remoteActive = false;
    await setPushPreference('on');
    // Permission is granted, so in-app alerts still work; only the background channel is missing.
    return {
      ok: true,
      mode: 'local',
      reason: 'token_failed',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Stop pushes for this device: drop the stored token and remember the opt-out. */
export async function disablePush(): Promise<void> {
  remoteActive = false;
  await setPushPreference('off');

  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await bilt.from('push_tokens').delete().eq('token', token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/** Called on sign-out: the next account on this device must not inherit these pushes. */
export async function releasePushToken(): Promise<void> {
  remoteActive = false;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await bilt.from('push_tokens').delete().eq('token', token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

let dispatchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Flush every notification row that has not been pushed yet. Debounced because a single user action
 * (send a message, close a deal) writes one notification but may be called from several places.
 */
export function dispatchPendingPush(delayMs = DISPATCH_DEBOUNCE_MS): void {
  if (dispatchTimer !== null) return;
  dispatchTimer = setTimeout(() => {
    dispatchTimer = null;
    void bilt.functions.invoke('push-dispatch', { body: {} });
  }, delayMs);
}

/** Fallback alert for environments without a remote token (Expo Go, simulator, web). */
export async function presentLocalNotification(payload: PushLocalPayload): Promise<void> {
  const body = payload.body ?? '開啟易拍通查看詳情';

  if (Platform.OS === 'web') {
    const web = webNotification();
    if (!web || web.permission !== 'granted') return;
    void new web(payload.title, { body, tag: payload.id });
    return;
  }

  await configurePushRuntime();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body,
      data: {
        notification_id: payload.id,
        link_type: payload.linkType,
        link_id: payload.linkId,
      },
    },
    trigger: null,
  });
}

/** Where a tapped notification should land. */
export function notificationHref(linkType: string | null, linkId: string | null): Href | null {
  if (linkType === 'listing' && linkId)
    return { pathname: '/listing/[id]', params: { id: linkId } };
  if (linkType === 'chat' && linkId) return { pathname: '/chat/[id]', params: { id: linkId } };
  if (linkType === 'seller' && linkId) return { pathname: '/seller/[id]', params: { id: linkId } };
  if (linkType === 'order') {
    return linkId ? { pathname: '/order/[id]', params: { id: linkId } } : '/orders';
  }
  if (linkType === 'support') return '/contact';
  return null;
}

/** Pull link data out of a push payload written by push-dispatch. */
export function hrefFromPushData(data: unknown): Href | null {
  const record = readRecord(data);
  return notificationHref(readString(record, 'link_type'), readString(record, 'link_id'));
}
