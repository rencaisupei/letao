import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook for managing AsyncStorage with state synchronization
 * @param key - The storage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns [storedValue, setValue, removeValue, isLoading]
 */
export function useAsyncStorage<T>(
  key: string,
  initialValue?: T,
): [T | null, (value: T | null) => Promise<void>, () => Promise<void>, boolean] {
  const [storedValue, setStoredValue] = useState<T | null>(initialValue ?? null);
  const [isLoading, setIsLoading] = useState(true);
  // Callers routinely pass an object/array literal, which is a new reference on
  // every render. Keeping it in a ref stops the load effect below from re-running
  // (and hammering AsyncStorage) on each render.
  const fallbackRef = useRef(initialValue);
  fallbackRef.current = initialValue;

  // Load initial value from storage
  useEffect(() => {
    let isActive = true;

    const loadStoredValue = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (!isActive) return;
        if (item !== null) {
          setStoredValue(JSON.parse(item));
        } else if (fallbackRef.current !== undefined) {
          setStoredValue(fallbackRef.current);
        }
      } catch (error) {
        console.error(`Error loading ${key} from AsyncStorage:`, error);
        if (isActive && fallbackRef.current !== undefined) {
          setStoredValue(fallbackRef.current);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadStoredValue();

    return () => {
      isActive = false;
    };
  }, [key]);

  // Set value in storage
  const setValue = useCallback(
    async (value: T | null) => {
      try {
        setStoredValue(value);
        if (value === null) {
          await AsyncStorage.removeItem(key);
        } else {
          await AsyncStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        console.error(`Error setting ${key} in AsyncStorage:`, error);
        throw error;
      }
    },
    [key],
  );

  // Remove value from storage
  const removeValue = useCallback(async () => {
    try {
      setStoredValue(null);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from AsyncStorage:`, error);
      throw error;
    }
  }, [key]);

  return [storedValue, setValue, removeValue, isLoading];
}
