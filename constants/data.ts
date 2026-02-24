// Shared data types and lookup tables used across the app

export interface ShoppingItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    bought: boolean;
    createdAt: number;
}

export const CATEGORIES = [
    'Groceries',
    'Clothing',
    'Electronics',
    'Home & Furniture',
    'Appliances',
    'Health & Beauty',
    'Transportation',
    'Education',
    'Work & Business',
    'Entertainment',
    'Gifts',
    'Other',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
    'Groceries': '#34C759',
    'Clothing': '#FF2D55',
    'Electronics': '#007AFF',
    'Home & Furniture': '#8E8E93',
    'Appliances': '#00B4D8',
    'Health & Beauty': '#FF9500',
    'Transportation': '#5856D6',
    'Education': '#AF52DE',
    'Work & Business': '#6A1B9A',
    'Entertainment': '#FFD60A',
    'Gifts': '#FF3B30',
    'Other': '#A0A0A0',
};

export const CATEGORY_EMOJIS: Record<string, string> = {
    'Groceries': '🛒',
    'Clothing': '👕',
    'Electronics': '📱',
    'Home & Furniture': '🏠',
    'Appliances': '🧊',
    'Health & Beauty': '💄',
    'Transportation': '🚗',
    'Education': '📚',
    'Work & Business': '💼',
    'Entertainment': '🎮',
    'Gifts': '🎁',
    'Other': '📦',
};

// Palette cycled through when user creates a custom category
export const NEW_CATEGORY_PALETTE = [
    '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
    '#C77DFF', '#FF9A3C', '#00B4D8', '#F72585',
];

export const DEMO_ITEMS: ShoppingItem[] = [
    {
        id: '1',
        name: 'Milk & Bread',
        price: 8.50,
        quantity: 1,
        category: 'Groceries',
        bought: false,
        createdAt: Date.now() - 6000,
    },
    {
        id: '2',
        name: 'Air Fryer',
        price: 120.00,
        quantity: 1,
        category: 'Appliances',
        bought: false,
        createdAt: Date.now() - 5000,
    },
    {
        id: '3',
        name: 'Running Shoes',
        price: 75.00,
        quantity: 1,
        category: 'Clothing',
        bought: true,
        createdAt: Date.now() - 4000,
    },
    {
        id: '4',
        name: 'Bluetooth Headphones',
        price: 59.99,
        quantity: 1,
        category: 'Electronics',
        bought: false,
        createdAt: Date.now() - 3000,
    },
    {
        id: '5',
        name: 'Birthday Gift — Alex',
        price: 40.00,
        quantity: 1,
        category: 'Gifts',
        bought: false,
        createdAt: Date.now() - 2000,
    },
];