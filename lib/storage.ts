import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A robust storage wrapper that handles the "Native module is null" error.
 * It prioritizes window.localStorage (Web) and provides a silent memory fallback
 * for unbuilt native environments to prevent console spam.
 */

const hasLocalStorage = typeof window !== 'undefined' && !!window.localStorage;
const memoryStorage: Record<string, string> = {};
const warnedKeys = new Set<string>();

const Storage = {
    async getItem(key: string): Promise<string | null> {
        try {
            // 1. Web LocalStorage (Fastest & most reliable on Web)
            if (hasLocalStorage) {
                return window.localStorage.getItem(key);
            }

            // 2. AsyncStorage (Mobile)
            return await AsyncStorage.getItem(key);
        } catch (e) {
            if (!warnedKeys.has(key)) {
                console.warn(`[Storage] getItem(${key}) failed, using memory fallback. (Note: Persistence requires a native rebuild if adding new libraries)`);
                warnedKeys.add(key);
            }
            return memoryStorage[key] || null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            // Always update memory cache for the current session
            memoryStorage[key] = value;

            // 1. Web LocalStorage
            if (hasLocalStorage) {
                window.localStorage.setItem(key, value);
                return;
            }

            // 2. AsyncStorage (Mobile)
            await AsyncStorage.setItem(key, value);
        } catch (e) {
            if (!warnedKeys.has(key + '_set')) {
                console.warn(`[Storage] setItem(${key}) failed. Persistence disabled for this session.`);
                warnedKeys.add(key + '_set');
            }
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            delete memoryStorage[key];
            if (hasLocalStorage) {
                window.localStorage.removeItem(key);
                return;
            }
            await AsyncStorage.removeItem(key);
        } catch (e) {
            // Silently fail
        }
    }
};

export default Storage;
