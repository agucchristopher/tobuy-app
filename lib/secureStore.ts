import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * A robust secure storage wrapper that handles platform differences.
 * Expo SecureStore does not support web out of the box.
 * It prioritizes window.localStorage (Web) and provides a silent memory fallback
 * if needed, while using expo-secure-store natively.
 */

const hasLocalStorage = typeof window !== 'undefined' && !!window.localStorage;
const memoryStorage: Record<string, string> = {};
const warnedKeys = new Set<string>();

const SecureStorage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            try {
                if (hasLocalStorage) {
                    return window.localStorage.getItem(key);
                }
                return memoryStorage[key] || null;
            } catch (e) {
                return memoryStorage[key] || null;
            }
        }

        try {
            return await SecureStore.getItemAsync(key);
        } catch (e) {
            if (!warnedKeys.has(key)) {
                console.warn(`[SecureStorage] getItem(${key}) failed, using memory fallback.`);
                warnedKeys.add(key);
            }
            return memoryStorage[key] || null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        memoryStorage[key] = value;

        if (Platform.OS === 'web') {
            try {
                if (hasLocalStorage) {
                    window.localStorage.setItem(key, value);
                }
            } catch (e) {
                // Ignore
            }
            return;
        }

        try {
            await SecureStore.setItemAsync(key, value);
        } catch (e) {
            if (!warnedKeys.has(key + '_set')) {
                console.warn(`[SecureStorage] setItem(${key}) failed. Persistence disabled for this session.`);
                warnedKeys.add(key + '_set');
            }
        }
    },

    async removeItem(key: string): Promise<void> {
        delete memoryStorage[key];

        if (Platform.OS === 'web') {
            try {
                if (hasLocalStorage) {
                    window.localStorage.removeItem(key);
                }
            } catch (e) {
                // Ignore
            }
            return;
        }

        try {
            await SecureStore.deleteItemAsync(key);
        } catch (e) {
            // Silently fail
        }
    }
};

export default SecureStorage;
