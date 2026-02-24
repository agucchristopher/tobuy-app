import React, { createContext, useContext, useState } from 'react';
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
