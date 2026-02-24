import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
  DEMO_ITEMS,
  NEW_CATEGORY_PALETTE,
  ShoppingItem,
} from '@/constants/data';
import { useTheme } from '@/context/ThemeContext';

// ─── Constants ─────────────────────────────────────────────────────────────────
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 140;   // px of drag to trigger dismiss
const VELOCITY_THRESHOLD = 1000; // px/s flick speed to trigger dismiss

const OPEN_SPRING = { damping: 22, stiffness: 280, mass: 0.8 } as const;
const CLOSE_SPRING = { damping: 20, stiffness: 200, mass: 0.8 } as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CategoryEntry { name: string; color: string; emoji: string }

const DEFAULT_CATS: CategoryEntry[] = (CATEGORIES as readonly string[]).map(name => ({
  name,
  color: CATEGORY_COLORS[name] ?? '#8E8E93',
  emoji: CATEGORY_EMOJIS[name] ?? '📦',
}));

const BASE_FILTERS = ['All', 'Pending', 'Bought'] as const;

export default function ShoppingListScreen() {
  const T = useTheme();
  const s = makeStyles(T);
  const isDark = T.mode === 'dark';

  // ── List state ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ShoppingItem[]>(DEMO_ITEMS);
  const [cats, setCats] = useState<CategoryEntry[]>(DEFAULT_CATS);
  const [filter, setFilter] = useState('All');

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalMounted, setModalMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', quantity: '1', category: DEFAULT_CATS[0].name });
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const catInputRef = useRef<TextInput>(null);

  // ── Reanimated shared values ──────────────────────────────────────────────
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // ── Animated styles ───────────────────────────────────────────────────────
  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Handle bar shrinks/fades slightly as you drag down (tactile feedback)
  const handleBarAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, DISMISS_THRESHOLD], [1, 0.4], Extrapolation.CLAMP),
    transform: [{
      scaleX: interpolate(translateY.value, [0, DISMISS_THRESHOLD], [1, 0.65], Extrapolation.CLAMP),
    }],
  }));

  // ── Animation helpers ─────────────────────────────────────────────────────
  const _unmountModal = useCallback(() => setModalMounted(false), []);

  const openSheet = useCallback(() => {
    // Reset position before Modal mounts (value set synchronously on worklet)
    translateY.value = SCREEN_HEIGHT;
    backdropOpacity.value = 0;
    setModalMounted(true);
  }, []);

  const onModalShow = useCallback(() => {
    // Fired by Modal's onShow, meaning the native layer is ready — animate in
    translateY.value = withSpring(0, OPEN_SPRING);
    backdropOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const closeSheet = useCallback(() => {
    Keyboard.dismiss();
    translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING);
    backdropOpacity.value = withTiming(0, { duration: 220 }, () => {
      runOnJS(_unmountModal)();
    });
  }, [_unmountModal]);

  // ── Pan gesture (handle area only) ────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = interpolate(
          e.translationY,
          [0, DISMISS_THRESHOLD * 2],
          [1, 0.2],
          Extrapolation.CLAMP,
        );
      }
    })
    .onEnd(e => {
      const shouldDismiss =
        e.translationY > DISMISS_THRESHOLD || e.velocityY > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        // Fly the sheet off and unmount
        translateY.value = withSpring(SCREEN_HEIGHT, CLOSE_SPRING);
        backdropOpacity.value = withTiming(0, { duration: 220 }, () => {
          runOnJS(_unmountModal)();
        });
      } else {
        // Snap back into place
        translateY.value = withSpring(0, OPEN_SPRING);
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalAmt = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const spentAmt = items.filter(i => i.bought).reduce((a, i) => a + i.price * i.quantity, 0);
  const leftAmt = totalAmt - spentAmt;
  const progress = totalAmt > 0 ? spentAmt / totalAmt : 0;
  const boughtCnt = items.filter(i => i.bought).length;
  const fmt = T.formatPrice;
  const fmtCompact = T.formatCompact;

  const allFilters = [...BASE_FILTERS, ...cats.map(c => c.name)];
  const filtered =
    filter === 'All' ? items :
      filter === 'Pending' ? items.filter(i => !i.bought) :
        filter === 'Bought' ? items.filter(i => i.bought) :
          items.filter(i => i.category === filter);

  const catColor = (n: string) => cats.find(c => c.name === n)?.color ?? '#8E8E93';
  const catEmoji = (n: string) => cats.find(c => c.name === n)?.emoji ?? '📦';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ name: '', price: '', quantity: '1', category: cats[0]?.name ?? '' });
    setEditingId(null); setShowCatInput(false); setNewCatName('');
    openSheet();
  };

  const openEdit = (item: ShoppingItem) => {
    setForm({ name: item.name, price: String(item.price), quantity: String(item.quantity), category: item.category });
    setEditingId(item.id); setShowCatInput(false); setNewCatName('');
    openSheet();
  };

  const save = () => {
    const price = parseFloat(form.price);
    const qty = Math.max(1, parseInt(form.quantity) || 1);
    if (!form.name.trim() || isNaN(price) || price <= 0) return;
    if (editingId) {
      setItems(p => p.map(i => i.id === editingId
        ? { ...i, name: form.name.trim(), price, quantity: qty, category: form.category }
        : i));
    } else {
      setItems(p => [{
        id: Date.now().toString(), name: form.name.trim(), price,
        quantity: qty, category: form.category, bought: false, createdAt: Date.now(),
      }, ...p]);
    }
    closeSheet();
  };

  const confirmAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed || cats.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setShowCatInput(false); setNewCatName(''); return;
    }
    const color = NEW_CATEGORY_PALETTE[cats.length % NEW_CATEGORY_PALETTE.length];
    setCats(p => [...p, { name: trimmed, color, emoji: '🏷️' }]);
    setForm(f => ({ ...f, category: trimmed }));
    setShowCatInput(false); setNewCatName('');
  };

  const toggleBought = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
  const deleteItem = (id: string) => setItems(p => p.filter(i => i.id !== id));

  const previewAmt = form.price ? parseFloat(form.price) * (parseInt(form.quantity) || 1) : null;
  const previewTotal = previewAmt != null ? fmt(previewAmt) : null;
  const activeCat = cats.find(c => c.name === form.category);

  // ── Render row ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const cc = catColor(item.category);
    const tot = item.price * item.quantity;
    return (
      <TouchableOpacity
        style={[s.card, item.bought && { opacity: 0.55 }]}
        onPress={() => toggleBought(item.id)}
        onLongPress={() => openEdit(item)}
        activeOpacity={0.75}
      >
        {/* <ogbe /> */}
        <View style={[s.stripe, { backgroundColor: item.bought ? T.green : cc }]} />
        <TouchableOpacity
          style={[s.cb, item.bought && { backgroundColor: T.green, borderColor: T.green }]}
          onPress={() => toggleBought(item.id)} hitSlop={8}
        >
          {item.bought && <Ionicons name="checkmark" size={13} color="#fff" />}
        </TouchableOpacity>
        <View style={s.cardBody}>
          <Text style={[s.cardName, item.bought && s.cardNameDone]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={s.cardMeta}>
            <View style={[s.badge, { backgroundColor: cc + (isDark ? '28' : '18') }]}>
              <Text style={[s.badgeText, { color: cc }]}>{catEmoji(item.category)}  {item.category}</Text>
            </View>
            {item.quantity > 1 && (
              <Text style={s.cardQty}>× {item.quantity}  ·  {fmt(item.price)} ea.</Text>
            )}
          </View>
        </View>
        <View style={s.cardRight}>
          <Text style={[s.cardPrice, item.bought && { color: T.green }]}>{fmt(tot)}</Text>
          <TouchableOpacity onPress={() => deleteItem(item.id)} hitSlop={8} style={s.trashBtn}>
            <Ionicons name="trash-outline" size={15} color={T.textSub} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.logo}>ToBuy</Text>
          <Text style={s.logoSub}>{items.length} items · {boughtCnt} bought</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.curBadge}>
            <Text style={s.curBadgeFlag}>{T.currency.flag}</Text>
            <Text style={s.curBadgeCode}>{T.currency.code}</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={T.toggleTheme}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={19} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget strip */}
      <View style={s.budgetStrip}>
        <BudgetStat label="Budget" value={fmtCompact(totalAmt)} color={T.accent} T={T} />
        <View style={s.budgetDiv} />
        <BudgetStat label="Spent" value={fmtCompact(spentAmt)} color={T.green} T={T} />
        <View style={s.budgetDiv} />
        <BudgetStat label="Left" value={fmtCompact(leftAmt)} color={T.textSub} T={T} />
      </View>

      {/* Progress bar */}
      <View style={s.progressWrap}>
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>{Math.round(progress * 100)}% spent</Text>
          <Text style={s.progressLabel}>{boughtCnt}/{items.length} items</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterContent}
      >
        {allFilters.map(f => {
          const active = filter === f;
          const catCol = cats.find(c => c.name === f)?.color;
          return (
            <TouchableOpacity
              key={f}
              style={[s.chip,
              active && (catCol
                ? { backgroundColor: catCol, borderColor: catCol }
                : s.chipActive)]}
              onPress={() => setFilter(f)}
            >
              {cats.find(c => c.name === f) && (
                <Text style={s.chipEmoji}>{catEmoji(f)}</Text>
              )}
              <Text style={[s.chipText, active && s.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🛍️</Text>
            <Text style={s.emptyTitle}>Nothing here</Text>
            <Text style={s.emptySub}>Tap + to add your first item</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={[s.fab, { backgroundColor: T.accent }]} onPress={openAdd}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* ── Animated bottom sheet modal ─────────────────────────────────── */}
      <Modal
        visible={modalMounted}
        transparent
        animationType="none"
        onShow={onModalShow}
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        {/* Dark backdrop — tap to close */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.4)' },
            backdropAnimStyle,
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
        </Animated.View>

        {/* Animated sheet */}
        <Animated.View style={[s.sheetWrapper, sheetAnimStyle]}>
          {/* Intercept taps to prevent closing via backdrop */}
          <Pressable onPress={() => Keyboard.dismiss()}>

            {/* ── Drag handle ─── grab here to pull down ── */}
            <GestureDetector gesture={panGesture}>
              <View style={s.handleArea}>
                <Animated.View style={[s.sheetHandle, handleBarAnimStyle]} />
              </View>
            </GestureDetector>

            {/* ── Sheet content ── */}
            <View style={s.sheetContent}>

              {/* Header row */}
              <View style={s.sheetHeader}>
                <View>
                  <Text style={s.sheetTitle}>{editingId ? 'Edit Item' : 'New Item'}</Text>
                  {activeCat && (
                    <Text style={[s.sheetSub, { color: activeCat.color }]}>
                      {activeCat.emoji}  {activeCat.name}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={closeSheet} style={s.closeBtn}>
                  <Ionicons name="close" size={18} color={T.textSub} />
                </TouchableOpacity>
              </View>

              {/* Name */}
              <Text style={s.label}>ITEM NAME</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Mechanical Keyboard"
                placeholderTextColor={T.textSub}
                value={form.name}
                onChangeText={t => setForm(p => ({ ...p, name: t }))}
                autoFocus
              />

              {/* Price + Qty */}
              <View style={s.inputRow}>
                <View style={{ flex: 2 }}>
                  <Text style={s.label}>PRICE ({T.currency.symbol})</Text>
                  <TextInput
                    style={s.input}
                    placeholder="0.00"
                    placeholderTextColor={T.textSub}
                    value={form.price}
                    onChangeText={t => setForm(p => ({ ...p, price: t }))}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>QTY</Text>
                  <TextInput
                    style={s.input}
                    placeholder="1"
                    placeholderTextColor={T.textSub}
                    value={form.quantity}
                    onChangeText={t => setForm(p => ({ ...p, quantity: t }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Category chips */}
              <Text style={s.label}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: showCatInput ? 10 : 20 }}>
                {cats.map(cat => {
                  const active = form.category === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[s.catChip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => { setForm(p => ({ ...p, category: cat.name })); setShowCatInput(false); }}
                    >
                      <Text style={[s.catChipText, active && { color: '#fff' }]}>
                        {cat.emoji}  {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[s.catChip, s.catChipNew, showCatInput && { borderColor: T.accent }]}
                  onPress={() => { setShowCatInput(true); setTimeout(() => catInputRef.current?.focus(), 80); }}
                >
                  <Ionicons name="add" size={13} color={showCatInput ? T.accent : T.textSub} />
                  <Text style={[s.catChipText, { marginLeft: 4 }, showCatInput && { color: T.accent }]}>New</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Inline new category input */}
              {showCatInput && (
                <View style={s.newCatRow}>
                  <TextInput
                    ref={catInputRef}
                    style={s.newCatInput}
                    placeholder="Category name…"
                    placeholderTextColor={T.textSub}
                    value={newCatName}
                    onChangeText={setNewCatName}
                    onSubmitEditing={confirmAddCategory}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[s.newCatOk, { backgroundColor: newCatName.trim() ? T.accent : T.border }]}
                    onPress={confirmAddCategory}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.newCatClose}
                    onPress={() => { setShowCatInput(false); setNewCatName(''); }}
                  >
                    <Ionicons name="close" size={16} color={T.textSub} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Total preview */}
              {previewTotal && (
                <View style={[s.preview, activeCat && { borderColor: activeCat.color + '55' }]}>
                  <View>
                    <Text style={s.previewLabel}>Total preview</Text>
                    {form.quantity && parseInt(form.quantity) > 1 && (
                      <Text style={s.previewSub}>
                        {form.quantity} × {T.currency.symbol}{parseFloat(form.price || '0').toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.previewValue, activeCat && { color: activeCat.color }]}>
                    {previewTotal}
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={s.sheetActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={closeSheet}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.saveBtn,
                    { backgroundColor: activeCat?.color ?? T.accent },
                    (!form.name.trim() || !form.price) && { opacity: 0.35 },
                  ]}
                  onPress={save}
                  disabled={!form.name.trim() || !form.price}
                >
                  <Text style={s.saveBtnText}>{editingId ? 'Save Changes' : 'Add to List'}</Text>
                </TouchableOpacity>
              </View>

            </View>{/* /sheetContent */}
          </Pressable>
        </Animated.View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Budget stat ───────────────────────────────────────────────────────────────
function BudgetStat({ label, value, color, T }: {
  label: string; value: string; color: string; T: ReturnType<typeof useTheme>;
}) {
  const s = makeStyles(T);
  return (
    <View style={s.budgetStat}>
      <Text style={[s.budgetVal, { color }]}>{value}</Text>
      <Text style={s.budgetLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(T: ReturnType<typeof useTheme>) {
  const isDark = T.mode === 'dark';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    logo: { fontSize: 26, fontWeight: '800', color: T.text, letterSpacing: -0.6 },
    logoSub: { fontSize: 12, color: T.textSub, marginTop: 2, fontWeight: '500' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    curBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: T.border },
    curBadgeFlag: { fontSize: 14 },
    curBadgeCode: { fontSize: 12, fontWeight: '700', color: T.text },
    iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, justifyContent: 'center', alignItems: 'center' },

    // Budget strip
    budgetStrip: {
      flexDirection: 'row', marginHorizontal: 16, backgroundColor: T.surface,
      borderRadius: 16, borderWidth: 1, borderColor: isDark ? T.cardHighlight : T.border,
      marginBottom: 16,
      ...(isDark ? { shadowColor: '#4DA3FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 0 } : {}),
    },
    budgetStat: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    budgetVal: { fontSize: 17, fontWeight: '700', marginBottom: 3, letterSpacing: -0.3 },
    budgetLabel: { fontSize: 11, color: T.textSub, fontWeight: '600', letterSpacing: 0.3 },
    budgetDiv: { width: 1, backgroundColor: T.border, marginVertical: 14 },

    // Progress
    progressWrap: { paddingHorizontal: 20, marginBottom: 14 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
    progressLabel: { fontSize: 12, color: T.textSub, fontWeight: '500' },
    progressTrack: { height: 5, backgroundColor: isDark ? '#FFFFFF08' : T.border, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: T.green, borderRadius: 3 },

    // Filter chips
    filterScroll: { flexGrow: 0, marginBottom: 14 },
    filterContent: { paddingHorizontal: 16, gap: 8, marginBottom: 2 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, minHeight: 42 },
    chipActive: { backgroundColor: isDark ? T.accent : T.text, borderColor: isDark ? T.accent : T.text },
    chipEmoji: { fontSize: 13 },
    chipText: { fontSize: 13, fontWeight: '600', color: T.textSub },
    chipTextActive: { color: '#fff' },

    // List
    listContent: { paddingHorizontal: 16, paddingBottom: 120 },

    // Item card
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: T.surface, borderRadius: 14,
      borderWidth: 1, borderColor: isDark ? T.cardHighlight : T.border,
      overflow: 'hidden', minHeight: 72,
      ...(isDark ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 } : {}),
    },
    stripe: { width: 4, alignSelf: 'stretch' },
    cb: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: isDark ? '#FFFFFF18' : T.border, justifyContent: 'center', alignItems: 'center', marginLeft: 12, backgroundColor: isDark ? '#FFFFFF08' : T.surfaceHigh },
    cardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 14 },
    cardName: { fontSize: 15, fontWeight: '600', color: T.text, marginBottom: 5, letterSpacing: -0.1 },
    cardNameDone: { textDecorationLine: 'line-through', color: T.textSub, fontWeight: '400' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    cardQty: { fontSize: 12, color: T.textSub, fontWeight: '500' },
    cardRight: { alignItems: 'flex-end', paddingRight: 14, gap: 6, minWidth: 68 },
    cardPrice: { fontSize: 16, fontWeight: '700', color: T.text, letterSpacing: -0.3 },
    trashBtn: { padding: 4 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    // FAB
    fab: {
      position: 'absolute', bottom: 28, right: 20,
      width: 58, height: 58, borderRadius: 29,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: isDark ? T.accent : '#000',
      shadowOffset: { width: 0, height: isDark ? 0 : 3 },
      shadowOpacity: isDark ? 0.55 : 0.2,
      shadowRadius: isDark ? 18 : 8,
      elevation: isDark ? 14 : 8,
    },

    // Empty state
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyEmoji: { fontSize: 52, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 6 },
    emptySub: { fontSize: 14, color: T.textSub, fontWeight: '500' },

    // ── Sheet ────────────────────────────────────────────────────────────────
    // Wrapper sits at absolute bottom — translateY moves it
    sheetWrapper: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: T.surfaceHigh,
      borderTopLeftRadius: 26, borderTopRightRadius: 26,
      borderWidth: 1, borderColor: isDark ? T.cardHighlight : T.border,
      // Bottom safe area
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      // Clip children to rounded corners
      overflow: 'hidden',
      ...(isDark ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 24,
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 12,
      }),
    },

    // Tall touch target for the drag gesture
    handleArea: {
      width: '100%', paddingVertical: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    // The visible pill indicator
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: isDark ? T.accent + '60' : T.border,
    },

    // Padding around the form fields
    sheetContent: { paddingHorizontal: 24, paddingTop: 4 },

    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: T.text, letterSpacing: -0.4 },
    sheetSub: { fontSize: 13, fontWeight: '500', marginTop: 3 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#FFFFFF0A' : T.surface, borderWidth: 1, borderColor: T.border, justifyContent: 'center', alignItems: 'center' },

    label: { fontSize: 11, fontWeight: '700', color: T.textSub, letterSpacing: 0.8, marginBottom: 8, marginTop: 2 },
    input: { backgroundColor: isDark ? '#FFFFFF07' : T.surface, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, color: T.text, fontSize: 15, fontWeight: '500', paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16 },
    inputRow: { flexDirection: 'row', gap: 12 },

    catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: isDark ? '#FFFFFF07' : T.surface, marginRight: 8 },
    catChipNew: { borderStyle: 'dashed' },
    catChipText: { fontSize: 13, fontWeight: '600', color: T.textSub },

    newCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    newCatInput: { flex: 1, backgroundColor: isDark ? '#FFFFFF07' : T.surface, borderRadius: 10, borderWidth: 1.5, borderColor: T.accent, color: T.text, fontSize: 14, fontWeight: '500', paddingHorizontal: 12, paddingVertical: 10 },
    newCatOk: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    newCatClose: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: isDark ? '#FFFFFF07' : T.surface, justifyContent: 'center', alignItems: 'center' },

    preview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDark ? '#FFFFFF05' : T.surface, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
    previewLabel: { fontSize: 12, color: T.textSub, fontWeight: '600', letterSpacing: 0.3 },
    previewSub: { fontSize: 11, color: T.textSub, marginTop: 2 },
    previewValue: { fontSize: 22, fontWeight: '800', color: T.accent, letterSpacing: -0.5 },

    sheetActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, backgroundColor: isDark ? '#FFFFFF08' : T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: T.textSub },
    saveBtn: { flex: 2, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}