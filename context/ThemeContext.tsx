import Storage from '@/lib/storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// ─── Font families ────────────────────────────────────────────────────────────
// Upgrade: run  npx expo install @expo-google-fonts/inter
// then set these to: 'Inter_400Regular', 'Inter_500Medium', etc.
export const Font = {
    regular: undefined as string | undefined,
    medium: undefined as string | undefined,
    semibold: undefined as string | undefined,
    bold: undefined as string | undefined,
    extrabold: undefined as string | undefined,
} as const;


// ─── Theme ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
    mode: ThemeMode;
    bg: string;
    surface: string;
    surfaceHigh: string;
    border: string;
    cardHighlight: string;  // subtle top-edge highlight on dark cards
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
    cardHighlight: 'transparent',
    text: '#1C1C1E',
    textSub: '#8E8E93',
    accent: '#007AFF',
    accentSurface: '#EBF4FF',
    green: '#34C759',
    greenSurface: '#EBFAF0',
    red: '#FF3B30',
    amber: '#FF9500',
};

// Dark: deep purple-tinted slate — 3-level elevation, vibrant accents
const dark: Omit<AppTheme, 'toggleTheme'> = {
    mode: 'dark',
    bg: '#0C0C12',   // deep dark, faint violet tint
    surface: '#13131A',   // slightly elevated — cards, chips
    surfaceHigh: '#1C1C26',   // modal / action sheets
    border: '#26263A',   // purple-tinted border
    cardHighlight: '#FFFFFF0D', // glass-edge: 5% white top border
    text: '#EEF0FF',   // cool soft white
    textSub: '#7B7B90',   // muted lavender-gray
    accent: '#4DA3FF',   // bright, vibrant blue
    accentSurface: '#0A153A',   // deep blue tint for badge bg
    green: '#3DDC68',   // vivid green
    greenSurface: '#0A2218',   // dark green tint
    red: '#FF5A52',
    amber: '#FFBE4D',
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
    formatCompact: (amount: number) => string;  // 1700 → ₦1.7k  100000 → ₦100k
}

const AppContext = createContext<AppContextValue>({
    ...light,
    toggleTheme: () => { },
    currency: CURRENCIES[0],
    setCurrency: () => { },
    formatPrice: (n) => `$${n.toFixed(2)}`,
    formatCompact: (n) => `$${n.toFixed(2)}`,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const sys = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>(sys === 'dark' ? 'dark' : 'light');
    const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('USD');

    const toggle = () => setMode(m => (m === 'light' ? 'dark' : 'light'));
    const setCurrency = (code: CurrencyCode) => setCurrencyCode(code);

    const currency = CURRENCIES.find(c => c.code === currencyCode) ?? CURRENCIES[0];

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [savedMode, savedCurr] = await Promise.all([
                    Storage.getItem('tobuy_theme'),
                    Storage.getItem('tobuy_currency'),
                ]);
                if (savedMode) setMode(savedMode as ThemeMode);
                if (savedCurr) setCurrencyCode(savedCurr as CurrencyCode);
            } catch (e) {
                console.error('Theme load fail', e);
            }
        };
        loadSettings();
    }, []);

    // Save mode
    useEffect(() => {
        Storage.setItem('tobuy_theme', mode).catch(e => console.error('Theme save fail', e));
    }, [mode]);

    // Save currency
    useEffect(() => {
        Storage.setItem('tobuy_currency', currencyCode).catch(e => console.error('Currency save fail', e));
    }, [currencyCode]);

    // ── Shared helper: insert commas every 3 digits in the integer part ───────
    const withCommas = (fixed: string): string => {
        const [int, dec] = fixed.split('.');
        const intCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return dec !== undefined ? `${intCommas}.${dec}` : intCommas;
    };

    // Full price with commas — used on item cards and preview totals
    const formatPrice = (amount: number): string => {
        if (currencyCode === 'JPY') {
            return `${currency.symbol}${withCommas(Math.round(amount).toString())}`;
        }
        return `${currency.symbol}${withCommas(amount.toFixed(2))}`;
    };

    // Compact formatter for the budget strip — shortens large numbers
    // e.g.  1,700 → ₦1.7k  |  10,000 → ₦10k  |  1,500,000 → ₦1.5m
    // Numbers below 1000 get full price formatting (with commas if ever needed)
    const compactNum = (n: number): string => {
        const abs = Math.abs(n);
        if (abs >= 1_000_000) {
            const v = abs / 1_000_000;
            const s = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '');
            return `${s}m`;
        }
        if (abs >= 1_000) {
            const v = abs / 1_000;
            const s = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '');
            return `${s}k`;
        }
        // Below 1000 — show with normal comma formatting
        return currencyCode === 'JPY'
            ? withCommas(Math.round(abs).toString())
            : withCommas(abs.toFixed(2));
    };

    const formatCompact = (amount: number): string =>
        `${currency.symbol}${compactNum(amount)}`;


    return (
        <AppContext.Provider value={{
            ...(mode === 'light' ? light : dark),
            toggleTheme: toggle,
            currency,
            setCurrency,
            formatPrice,
            formatCompact,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useTheme = () => useContext(AppContext);
