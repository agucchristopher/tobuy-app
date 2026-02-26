import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORY_COLORS, CATEGORY_EMOJIS, ShoppingItem } from '@/constants/data';
import { CURRENCIES, CurrencyCode, useTheme } from '@/context/ThemeContext';
import Storage from '@/lib/secureStore';
import * as Haptics from 'expo-haptics';

export default function StatsScreen() {
    const T = useTheme();
    const s = makeStyles(T);
    const fmt = T.formatPrice;

    const [items, setItems] = useState<ShoppingItem[]>([]);

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                try {
                    const savedItems = await Storage.getItem('tobuy_items');
                    if (savedItems) setItems(JSON.parse(savedItems));
                } catch (e) {
                    console.error('Failed to load items in stats', e);
                }
            };
            loadData();
        }, [])
    );

    const total = items.reduce((a, i) => a + i.price * i.quantity, 0);
    const spent = items.filter(i => i.bought).reduce((a, i) => a + i.price * i.quantity, 0);
    const left = total - spent;
    const progress = total > 0 ? spent / total : 0;
    const boughtN = items.filter(i => i.bought).length;

    // Category breakdown
    const catMap: Record<string, { total: number; spent: number; count: number }> = {};
    for (const item of items) {
        if (!catMap[item.category]) catMap[item.category] = { total: 0, spent: 0, count: 0 };
        catMap[item.category].total += item.price * item.quantity;
        catMap[item.category].count++;
        if (item.bought) catMap[item.category].spent += item.price * item.quantity;
    }
    const cats = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
    const maxCat = Math.max(...cats.map(([, v]) => v.total), 1);

    return (
        <SafeAreaView style={s.root}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

                {/* Header */}
                <View style={s.header}>
                    <Text style={s.title}>Summary</Text>
                    <Text style={s.sub}>Overview & currency settings</Text>
                </View>

                {/* ── Currency Picker ─────────────────────────────────────────────── */}
                <Text style={s.sectionLabel}>CURRENCY</Text>
                <View style={s.currencyCard}>
                    {CURRENCIES.map((cur, i) => {
                        const active = T.currency.code === cur.code;
                        const isLast = i === CURRENCIES.length - 1;
                        return (
                            <TouchableOpacity
                                key={cur.code}
                                style={[s.curRow, !isLast && s.curRowBorder, active && s.curRowActive]}
                                onPress={() => { Haptics.selectionAsync(); T.setCurrency(cur.code as CurrencyCode); }}
                                activeOpacity={0.65}
                            >
                                {/* Flag + info */}
                                <View style={s.curLeft}>
                                    <Text style={s.curFlag}>{cur.flag}</Text>
                                    <View>
                                        <Text style={[s.curName, active && { color: T.accent }]}>{cur.name}</Text>
                                        <Text style={s.curCode}>{cur.code}</Text>
                                    </View>
                                </View>

                                {/* Symbol + checkmark */}
                                <View style={s.curRight}>
                                    <View style={[s.symbolBadge, { backgroundColor: active ? T.accent : T.surface, borderColor: active ? T.accent : T.border }]}>
                                        <Text style={[s.symbolText, { color: active ? '#fff' : T.textSub }]}>{cur.symbol}</Text>
                                    </View>
                                    {active && (
                                        <Ionicons name="checkmark-circle" size={18} color={T.accent} style={{ marginLeft: 8 }} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Overview ────────────────────────────────────────────────────── */}
                <Text style={s.sectionLabel}>OVERVIEW</Text>
                <View style={s.card}>
                    <View style={s.overviewRow}>
                        <OverviewStat label="Budget" value={fmt(total)} color={T.accent} s={s} />
                        <View style={s.overviewDiv} />
                        <OverviewStat label="Spent" value={fmt(spent)} color={T.green} s={s} />
                        <View style={s.overviewDiv} />
                        <OverviewStat label="Remaining" value={fmt(left)} color={T.textSub} s={s} />
                    </View>

                    {/* Progress */}
                    <View style={s.progressWrap}>
                        <View style={s.progressTrack}>
                            <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                        </View>
                        <View style={s.progressLabels}>
                            <Text style={s.progressPct}>{Math.round(progress * 100)}%</Text>
                            <Text style={s.progressInfo}>{boughtN} of {items.length} items bought</Text>
                        </View>
                    </View>
                </View>

                {/* ── Categories ──────────────────────────────────────────────────── */}
                <Text style={s.sectionLabel}>BY CATEGORY</Text>
                <View style={s.card}>
                    {cats.map(([cat, data], idx) => {
                        const cc = CATEGORY_COLORS[cat] ?? '#5856D6';
                        const barW = data.total / maxCat;
                        const catPct = data.total > 0 ? data.spent / data.total : 0;
                        const isLast = idx === cats.length - 1;

                        return (
                            <View key={cat} style={[s.catRow, !isLast && s.catRowBorder]}>
                                <View style={s.catLeft}>
                                    <View style={[s.catDot, { backgroundColor: cc }]} />
                                    <Text style={s.catName}>{CATEGORY_EMOJIS[cat] ?? '📦'}  {cat}</Text>
                                </View>
                                <View style={s.catRight}>
                                    <View style={s.catBarRow}>
                                        <View style={s.catBarTrack}>
                                            <View style={[s.catBarBg, { width: `${Math.round(barW * 100)}%`, backgroundColor: cc + '30' }]} />
                                            <View style={[s.catBarSpent, { width: `${Math.round(barW * catPct * 100)}%`, backgroundColor: cc }]} />
                                        </View>
                                        <Text style={[s.catAmt, { color: cc }]}>{fmt(data.total)}</Text>
                                    </View>
                                    <Text style={s.catMeta}>{data.count} item{data.count !== 1 ? 's' : ''} · {fmt(data.spent)} bought</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* ── Tips ────────────────────────────────────────────────────────── */}
                <Text style={s.sectionLabel}>TIPS</Text>
                <View style={s.card}>
                    {[
                        { icon: 'create-outline', color: T.accent, tip: 'Long-press any item on the list to edit it.' },
                        { icon: 'checkmark-circle-outline', color: T.green, tip: 'Tap an item to mark it as bought.' },
                        { icon: 'pricetag-outline', color: T.amber, tip: 'Create your own categories using "+ New" in the item modal.' },
                    ].map(({ icon, color, tip }, i, arr) => (
                        <View key={i} style={[s.tipRow, i !== arr.length - 1 && s.catRowBorder]}>
                            <Ionicons name={icon as any} size={18} color={color} style={{ marginRight: 12 }} />
                            <Text style={s.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Overview stat cell ───────────────────────────────────────────────────────
function OverviewStat({ label, value, color, s }: { label: string; value: string; color: string; s: ReturnType<typeof makeStyles> }) {
    return (
        <View style={s.overviewStat}>
            <Text style={[s.overviewVal, { color }]}>{value}</Text>
            <Text style={s.overviewLabel}>{label}</Text>
        </View>
    );
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────
function makeStyles(T: ReturnType<typeof useTheme>) {
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: T.bg },
        header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
        title: { fontSize: 28, fontWeight: '700', color: T.text, letterSpacing: -0.4 },
        sub: { fontSize: 13, color: T.textSub, marginTop: 2 },

        sectionLabel: { fontSize: 11, fontWeight: '700', color: T.textSub, letterSpacing: 1, marginHorizontal: 20, marginTop: 20, marginBottom: 10 },

        card: { marginHorizontal: 16, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },

        // ── Currency picker ──────────────────────────────────────────────────────
        currencyCard: { marginHorizontal: 16, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
        curRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
        curRowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
        curRowActive: { backgroundColor: T.accentSurface },
        curLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        curFlag: { fontSize: 26 },
        curName: { fontSize: 15, fontWeight: '600', color: T.text, marginBottom: 2 },
        curCode: { fontSize: 12, color: T.textSub },
        curRight: { flexDirection: 'row', alignItems: 'center' },
        symbolBadge: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
        symbolText: { fontSize: 16, fontWeight: '700' },

        // ── Overview ─────────────────────────────────────────────────────────────
        overviewRow: { flexDirection: 'row', paddingVertical: 20 },
        overviewStat: { flex: 1, alignItems: 'center' },
        overviewVal: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
        overviewLabel: { fontSize: 12, color: T.textSub, fontWeight: '500' },
        overviewDiv: { width: 1, backgroundColor: T.border },

        progressWrap: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 14 },
        progressTrack: { height: 6, backgroundColor: T.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
        progressFill: { height: '100%', backgroundColor: T.green, borderRadius: 3 },
        progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
        progressPct: { fontSize: 13, fontWeight: '700', color: T.green },
        progressInfo: { fontSize: 13, color: T.textSub },

        // ── Categories ───────────────────────────────────────────────────────────
        catRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
        catRowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
        catLeft: { width: 130, flexDirection: 'row', alignItems: 'center', gap: 8 },
        catDot: { width: 8, height: 8, borderRadius: 4 },
        catName: { fontSize: 13, fontWeight: '600', color: T.text, flexShrink: 1 },
        catRight: { flex: 1 },
        catBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
        catBarTrack: { flex: 1, height: 6, backgroundColor: T.border, borderRadius: 3, overflow: 'hidden', position: 'relative' },
        catBarBg: { position: 'absolute', height: '100%', borderRadius: 3 },
        catBarSpent: { position: 'absolute', height: '100%', borderRadius: 3 },
        catAmt: { fontSize: 13, fontWeight: '700', minWidth: 50, textAlign: 'right' },
        catMeta: { fontSize: 11, color: T.textSub },

        // ── Tips ─────────────────────────────────────────────────────────────────
        tipRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
        tipText: { flex: 1, fontSize: 14, color: T.text, lineHeight: 20 },
    });
}
