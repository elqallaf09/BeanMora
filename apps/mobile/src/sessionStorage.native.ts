import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { createSecureSessionStorage } from './core/secure-session-storage';

const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const sessionStorage = createSecureSessionStorage(
  {
    getItem: (key) => SecureStore.getItemAsync(key, options),
    setItem: (key, value) => SecureStore.setItemAsync(key, value, options),
    removeItem: (key) => SecureStore.deleteItemAsync(key, options),
  },
  AsyncStorage,
  randomUUID,
);
