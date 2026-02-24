import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

// ─── Theme ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
    mode: ThemeMode;
    bg: string;
    surface: string;
    surfaceHigh: string;
    border: string;
    text: string;
    textSub: string;
    accent: string;
    accentSurface: string;
    green: string;
    greenSurface: string;
    red: string;
    amber: string;
    toggleTheme: () => void;
}

const light: Omit<AppTheme, 'toggleTheme'> = {
    mode: 'light',
    bg: '#FFFFFF',
    surface: '#F5F5F7',
    surfaceHigh: '#FFFFFF',
    border: '#E5E5EA',
    text: '#1C1C1E',
    textSub: '#8E8E93',
    accent: '#007AFF',
    accentSurface: '#EBF4FF',
    green: '#34C759',
    greenSurface: '#EBFAF0',
    red: '#FF3B30',
    amber: '#FF9500',
};

const dark: Omit<AppTheme, 'toggleTheme'> = {
    mode: 'dark',
    bg: '#000000',
    surface: '#1C1C1E',
    surfaceHigh: '#2C2C2E',
    border: '#38383A',
    text: '#FFFFFF',
    textSub: '#8E8E93',
    accent: '#0A84FF',
    accentSurface: '#0A2540',
    green: '#30D158',
    greenSurface: '#0D2B1A',
    red: '#FF453A',
    amber: '#FF9F0A',
};

// ─── Currency ─────────────────────────────────────────────────────────────────
export type CurrencyCode = 'USD' | 'EUR' | 'NGN' | 'JPY';

export interface CurrencyInfo {
    code: CurrencyCode;
    symbol: string;
    name: string;
    flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
];

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextValue extends AppTheme {
    currency: CurrencyInfo;
    setCurrency: (c: CurrencyCode) => void;
    formatPrice: (amount: number) => string;
}

const AppContext = createContext<AppContextValue>({
    ...light,
    toggleTheme: () => { },
    currency: CURRENCIES[0],
    setCurrency: () => { },
    formatPrice: (n) => `$${n.toFixed(2)}`,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const sys = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>(sys === 'dark' ? 'dark' : 'light');
    const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('USD');

    const toggle = () => setMode(m => (m === 'light' ? 'dark' : 'light'));
    const setCurrency = (code: CurrencyCode) => setCurrencyCode(code);

    const currency = CURRENCIES.find(c => c.code === currencyCode) ?? CURRENCIES[0];

    // JPY has no decimal cents, others show 2 decimal places
    const formatPrice = (amount: number) =>
        currencyCode === 'JPY'
            ? `${currency.symbol}${Math.round(amount).toLocaleString()}`
            : `${currency.symbol}${amount.toFixed(2)}`;

    return (
        <AppContext.Provider value={{
            ...(mode === 'light' ? light : dark),
            toggleTheme: toggle,
            currency,
            setCurrency,
            formatPrice,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useTheme = () => useContext(AppContext);
