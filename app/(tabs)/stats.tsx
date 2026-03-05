import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import LZString from 'lz-string';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJIS, ShoppingItem } from '@/constants/data';
import { CURRENCIES, CurrencyCode, useTheme } from '@/context/ThemeContext';
import Storage from '@/lib/secureStore';
import * as Haptics from 'expo-haptics';

export default function StatsScreen() {
    const T = useTheme();
    const s = makeStyles(T);
    const fmt = T.formatPrice;

    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [cats, setCats] = useState<{ name: string, color: string, emoji: string }[]>((CATEGORIES as readonly string[]).map(name => ({
        name,
        color: CATEGORY_COLORS[name] ?? '#8E8E93',
        emoji: CATEGORY_EMOJIS[name] ?? '📦',
    })));
    const [showQR, setShowQR] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                try {
                    const [savedItems, savedCats] = await Promise.all([
                        Storage.getItem('tobuy_items'),
                        Storage.getItem('tobuy_categories'),
                    ]);
                    if (savedItems) setItems(JSON.parse(savedItems));
                    if (savedCats) setCats(JSON.parse(savedCats));
                } catch (e) {
                    console.error('Failed to load items in stats', e);
                }
            };
            loadData();
        }, [])
    );

    const startImport = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permission Required", "Camera access is needed to scan QR codes.");
                return;
            }
        }
        setShowScanner(true);
    };

    const handleScan = async ({ data }: { data: string }) => {
        try {
            const parsed = JSON.parse(LZString.decompressFromEncodedURIComponent(data) || '');
            if (parsed.i && parsed.c) {
                const decodedItems = parsed.i.map((x: any) => ({ id: x.i, name: x.n, price: x.p, quantity: x.q, category: x.c, bought: x.b, createdAt: x.a, reminderDate: x.r }));
                const decodedCats = parsed.c.map((x: any) => ({ name: x.n, color: x.c, emoji: x.e }));

                setShowScanner(false); // Pause scanner UI on success match logic
                Alert.alert(
                    "Import Data",
                    `Found ${decodedItems.length} items and ${decodedCats.length} categories. Merge with your current list or replace entirely?`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Replace", onPress: async () => {
                                await Storage.setItem('tobuy_items', JSON.stringify(decodedItems));
                                await Storage.setItem('tobuy_categories', JSON.stringify(decodedCats));
                                setItems(decodedItems); setCats(decodedCats);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        },
                        {
                            text: "Merge", onPress: async () => {
                                const newIds = new Set(decodedItems.map((i: any) => i.id));
                                const mergedItems = [...items.filter((i: any) => !newIds.has(i.id)), ...decodedItems];
                                const newCatNames = new Set(decodedCats.map((c: any) => c.name));
                                const mergedCats = [...cats.filter((c: any) => !newCatNames.has(c.name)), ...decodedCats];
                                await Storage.setItem('tobuy_items', JSON.stringify(mergedItems));
                                await Storage.setItem('tobuy_categories', JSON.stringify(mergedCats));
                                setItems(mergedItems); setCats(mergedCats);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        }
                    ]
                );
            } else {
                throw new Error("Invalid format");
            }
        } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Invalid QR Code", "The scanned QR code is either invalid or could not be read.");
            setShowScanner(false);
        }
    };

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
    const catBreakdown = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
    const maxCat = Math.max(...catBreakdown.map(([, v]) => v.total), 1);

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
                        <OverviewStat label="Budget" amount={total} color={T.accent} T={T} s={s} />
                        <View style={s.overviewDiv} />
                        <OverviewStat label="Spent" amount={spent} color={T.green} T={T} s={s} />
                        <View style={s.overviewDiv} />
                        <OverviewStat label="Remaining" amount={left} color={T.textSub} T={T} s={s} />
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
                    {catBreakdown.map(([cat, data], idx) => {
                        const cc = CATEGORY_COLORS[cat] ?? '#5856D6';
                        const barW = data.total / maxCat;
                        const catPct = data.total > 0 ? data.spent / data.total : 0;
                        const isLast = idx === catBreakdown.length - 1;

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

                {/* ── Data Management ──────────────────────────────────────────────────────── */}
                <Text style={s.sectionLabel}>DATA MANAGEMENT</Text>
                <View style={s.card}>
                    <TouchableOpacity style={[s.tipRow, s.catRowBorder]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowQR(true); }}>
                        <Ionicons name="qr-code-outline" size={18} color={T.accent} style={{ marginRight: 12 }} />
                        <Text style={s.tipText}>Export Data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.tipRow} onPress={startImport}>
                        <Ionicons name="scan-outline" size={18} color={T.green} style={{ marginRight: 12 }} />
                        <Text style={s.tipText}>Import Data</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* QR Code Export Modal */}
            <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
                <View style={s.qrBackdrop}>
                    <View style={s.qrContainer}>
                        <Text style={s.qrTitle}>Export Data</Text>
                        <Text style={s.qrSub}>Scan with another device to import</Text>
                        <View style={s.qrBox}>
                            <QRCode
                                value={LZString.compressToEncodedURIComponent(JSON.stringify({
                                    i: items.map(x => ({ i: x.id, n: x.name, p: x.price, q: x.quantity, c: x.category, b: x.bought, a: x.createdAt, r: x.reminderDate })),
                                    c: cats.map(x => ({ n: x.name, c: x.color, e: x.emoji }))
                                }))}
                                size={220}
                                color={T.mode === 'dark' ? '#FFF' : '#000'}
                                backgroundColor="transparent"
                            />
                        </View>
                        <TouchableOpacity style={s.qrCloseBtn} onPress={() => setShowQR(false)}>
                            <Text style={s.qrCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Camera Scanner Modal */}
            <Modal visible={showScanner} transparent animationType="slide" onRequestClose={() => setShowScanner(false)}>
                <View style={s.scannerWrap}>
                    <View style={s.scannerHeader}>
                        <Text style={s.scannerTitle}>Scan QR Code</Text>
                        <TouchableOpacity onPress={() => setShowScanner(false)} style={s.iconBtn}>
                            <Ionicons name="close" size={20} color={T.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={s.scannerBody}>
                        {showScanner && permission?.granted && (
                            <CameraView
                                style={StyleSheet.absoluteFillObject}
                                facing="back"
                                onBarcodeScanned={handleScan}
                                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                            />
                        )}
                        <View style={s.scannerOverlay}>
                            <View style={s.scannerTarget} />
                            <Text style={s.scannerHint}>Align a ToBuy QR code within the frame</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Overview stat cell ───────────────────────────────────────────────────────
function OverviewStat({ label, amount, color, T, s }: { label: string; amount: number; color: string; T: ReturnType<typeof useTheme>; s: ReturnType<typeof makeStyles> }) {
    const isMillion = Math.abs(amount) >= 1_000_000;
    const valueStr = isMillion ? ` ${T.formatCompact(amount)}` : T.formatPrice(amount);

    return (
        <View style={s.overviewStat}>
            <Text style={[s.overviewVal, { color }]} adjustsFontSizeToFit numberOfLines={1}>{valueStr}</Text>
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
        overviewStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
        overviewVal: { fontSize: 17, fontWeight: '700', marginBottom: 4, width: '100%', textAlign: 'center' },
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

        iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, justifyContent: 'center', alignItems: 'center' },

        // QR Code Modal
        qrBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
        qrContainer: { width: '100%', maxWidth: 360, backgroundColor: T.bg, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: T.border },
        qrTitle: { fontSize: 22, fontWeight: '700', color: T.text, marginBottom: 8, letterSpacing: -0.4 },
        qrSub: { fontSize: 13, color: T.textSub, marginBottom: 24, textAlign: 'center' },
        qrBox: { padding: 20, backgroundColor: T.mode === 'dark' ? '#FFFFFF10' : '#fff', borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
        qrCloseBtn: { width: '100%', paddingVertical: 14, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
        qrCloseText: { fontSize: 15, fontWeight: '700', color: T.text },

        // Scanner
        scannerWrap: { flex: 1, backgroundColor: T.bg },
        scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: T.surface, borderBottomWidth: 1, borderColor: T.border },
        scannerTitle: { fontSize: 20, fontWeight: '700', color: T.text, letterSpacing: -0.4 },
        scannerBody: { flex: 1, backgroundColor: '#000' },
        scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
        scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: T.accent, borderRadius: 24, backgroundColor: 'transparent' },
        scannerHint: { fontSize: 14, color: '#fff', fontWeight: '600', marginTop: 30, letterSpacing: 0.5, textAlign: 'center', paddingHorizontal: 40 },
    });
}
