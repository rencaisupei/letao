import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorage, createClient, webStorage } from '@biltme/backend';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_BILT_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_BILT_ANON_KEY ?? '';

export const bilt = createClient(url, anonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage() : asyncStorage(AsyncStorage),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
