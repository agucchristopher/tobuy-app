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
    'Tech & Workstation',
    'Room & Interior',
    'Wardrobe & Fashion',
    'Social Obligations',
    'School & Household',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
    'Tech & Workstation': '#007AFF',
    'Room & Interior': '#34C759',
    'Wardrobe & Fashion': '#FF2D55',
    'Social Obligations': '#FF9500',
    'School & Household': '#AF52DE',
};

export const CATEGORY_EMOJIS: Record<string, string> = {
    'Tech & Workstation': '💻',
    'Room & Interior': '🛋️',
    'Wardrobe & Fashion': '👗',
    'Social Obligations': '🎁',
    'School & Household': '📚',
};

// Palette cycled through when user creates a custom category
export const NEW_CATEGORY_PALETTE = [
    '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
    '#C77DFF', '#FF9A3C', '#00B4D8', '#F72585',
];

export const DEMO_ITEMS: ShoppingItem[] = [
    { id: '1', name: 'Mechanical Keyboard', price: 89.99, quantity: 1, category: 'Tech & Workstation', bought: false, createdAt: Date.now() - 4000 },
    { id: '2', name: 'Desk Lamp', price: 34.00, quantity: 1, category: 'Room & Interior', bought: true, createdAt: Date.now() - 3000 },
    { id: '3', name: 'White Sneakers', price: 59.95, quantity: 1, category: 'Wardrobe & Fashion', bought: false, createdAt: Date.now() - 2000 },
    { id: '4', name: 'Birthday Gift — Sara', price: 25.00, quantity: 1, category: 'Social Obligations', bought: false, createdAt: Date.now() - 1000 },
    { id: '5', name: 'Notebook Set', price: 12.50, quantity: 2, category: 'School & Household', bought: true, createdAt: Date.now() - 500 },
];
