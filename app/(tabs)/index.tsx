import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
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

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CategoryEntry { name: string; color: string; emoji: string }

// ─── Build initial category list from constants ────────────────────────────────
const DEFAULT_CATS: CategoryEntry[] = (CATEGORIES as readonly string[]).map(name => ({
  name,
  color: CATEGORY_COLORS[name] ?? '#8E8E93',
  emoji: CATEGORY_EMOJIS[name] ?? '📦',
}));

const BASE_FILTERS = ['All', 'Pending', 'Bought'] as const;

export default function ShoppingListScreen() {
  const T = useTheme();
  const s = makeStyles(T);

  // ── State ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ShoppingItem[]>(DEMO_ITEMS);
  const [cats, setCats] = useState<CategoryEntry[]>(DEFAULT_CATS);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', quantity: '1', category: DEFAULT_CATS[0].name });

  // Add-category inline state
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const catInputRef = useRef<TextInput>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalAmt = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const spentAmt = items.filter(i => i.bought).reduce((a, i) => a + i.price * i.quantity, 0);
  const leftAmt = totalAmt - spentAmt;
  const progress = totalAmt > 0 ? spentAmt / totalAmt : 0;
  const boughtCnt = items.filter(i => i.bought).length;
  const fmt = T.formatPrice;

  const catNames = cats.map(c => c.name);
  const allFilters = [...BASE_FILTERS, ...catNames];

  const filtered =
    filter === 'All' ? items :
      filter === 'Pending' ? items.filter(i => !i.bought) :
        filter === 'Bought' ? items.filter(i => i.bought) :
          items.filter(i => i.category === filter);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const catColor = (name: string) => cats.find(c => c.name === name)?.color ?? '#8E8E93';
  const catEmoji = (name: string) => cats.find(c => c.name === name)?.emoji ?? '📦';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ name: '', price: '', quantity: '1', category: cats[0]?.name ?? '' });
    setEditingId(null);
    setShowCatInput(false);
    setNewCatName('');
    setModalVisible(true);
  };

  const openEdit = (item: ShoppingItem) => {
    setForm({ name: item.name, price: String(item.price), quantity: String(item.quantity), category: item.category });
    setEditingId(item.id);
    setShowCatInput(false);
    setNewCatName('');
    setModalVisible(true);
  };

  const save = () => {
    const price = parseFloat(form.price);
    const qty = Math.max(1, parseInt(form.quantity) || 1);
    if (!form.name.trim() || isNaN(price) || price <= 0) return;
    if (editingId) {
      setItems(p => p.map(i => i.id === editingId ? { ...i, name: form.name.trim(), price, quantity: qty, category: form.category } : i));
    } else {
      setItems(p => [{ id: Date.now().toString(), name: form.name.trim(), price, quantity: qty, category: form.category, bought: false, createdAt: Date.now() }, ...p]);
    }
    setModalVisible(false);
  };

  const confirmAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed || cats.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setShowCatInput(false);
      setNewCatName('');
      return;
    }
    // Pick a color from the palette, cycling by index
    const color = NEW_CATEGORY_PALETTE[cats.length % NEW_CATEGORY_PALETTE.length];
    const entry: CategoryEntry = { name: trimmed, color, emoji: '🏷️' };
    setCats(p => [...p, entry]);
    setForm(f => ({ ...f, category: trimmed }));
    setShowCatInput(false);
    setNewCatName('');
  };

  const toggleBought = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
  const deleteItem = (id: string) => setItems(p => p.filter(i => i.id !== id));

  const previewAmt = form.price ? parseFloat(form.price) * (parseInt(form.quantity) || 1) : null;
  const previewTotal = previewAmt != null ? fmt(previewAmt) : null;

  // ── Render row ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const cc = catColor(item.category);
    const tot = item.price * item.quantity;

    return (
      <TouchableOpacity
        style={s.row}
        onPress={() => toggleBought(item.id)}
        onLongPress={() => openEdit(item)}
        activeOpacity={0.6}
      >
        {/* Checkbox */}
        <TouchableOpacity
          style={[s.cb, item.bought && { backgroundColor: T.green, borderColor: T.green }]}
          onPress={() => toggleBought(item.id)}
        >
          {item.bought && <Ionicons name="checkmark" size={12} color="#fff" />}
        </TouchableOpacity>

        {/* Info */}
        <View style={s.rowBody}>
          <Text style={[s.rowName, item.bought && s.rowNameDone]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={s.rowMeta}>
            <View style={[s.badge, { backgroundColor: cc + (T.mode === 'light' ? '18' : '2A') }]}>
              <Text style={[s.badgeText, { color: cc }]}>
                {catEmoji(item.category)}  {item.category}
              </Text>
            </View>
            {item.quantity > 1 && (
              <Text style={s.rowQty}>× {item.quantity}  ·  {fmt(item.price)} each</Text>
            )}
          </View>
        </View>

        {/* Price + delete */}
        <View style={s.rowRight}>
          <Text style={[s.rowPrice, item.bought && { color: T.green }]}>{fmt(tot)}</Text>
          <TouchableOpacity onPress={() => deleteItem(item.id)} hitSlop={8}>
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
          <Text style={s.appName}>ToBuy</Text>
          <Text style={s.appSub}>{items.length} items · {boughtCnt} done</Text>
        </View>
        <TouchableOpacity style={s.themeBtn} onPress={T.toggleTheme}>
          <Ionicons name={T.mode === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color={T.text} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <StatCard label="Total" value={fmt(totalAmt)} color={T.accent} T={T} />
        <StatCard label="Spent" value={fmt(spentAmt)} color={T.green} T={T} />
        <StatCard label="Left" value={fmt(leftAmt)} color={T.textSub} T={T} />
      </View>

      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={s.progressLabel}>{Math.round(progress * 100)}% of budget spent</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {allFilters.map(f => (
          <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}>
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
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
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={s.overlay} onPress={() => { Keyboard.dismiss(); setModalVisible(false); }}>
          <Pressable style={s.sheet} onPress={() => { }}>

            <View style={s.handle} />
            <Text style={s.sheetTitle}>{editingId ? 'Edit Item' : 'New Item'}</Text>

            {/* Name */}
            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Mechanical Keyboard"
              placeholderTextColor={T.textSub}
              value={form.name}
              onChangeText={t => setForm(p => ({ ...p, name: t }))}
              autoFocus
            />

            {/* Price + Qty */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2 }}>
                <Text style={s.label}>Price ($)</Text>
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
                <Text style={s.label}>Qty</Text>
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

            {/* Category picker */}
            <Text style={s.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: showCatInput ? 10 : 20 }}>
              {/* Existing category chips */}
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

              {/* + New chip */}
              <TouchableOpacity
                style={[s.catChip, s.catChipNew, showCatInput && { borderColor: T.accent }]}
                onPress={() => {
                  setShowCatInput(true);
                  setTimeout(() => catInputRef.current?.focus(), 80);
                }}
              >
                <Ionicons name="add" size={14} color={showCatInput ? T.accent : T.textSub} />
                <Text style={[s.catChipText, { marginLeft: 4 }, showCatInput && { color: T.accent }]}>New</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Inline new-category input */}
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
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[s.newCatConfirm, { backgroundColor: newCatName.trim() ? T.accent : T.border }]}
                  onPress={confirmAddCategory}
                  disabled={!newCatName.trim()}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.newCatCancel}
                  onPress={() => { setShowCatInput(false); setNewCatName(''); }}
                >
                  <Ionicons name="close" size={16} color={T.textSub} />
                </TouchableOpacity>
              </View>
            )}

            {/* Total preview */}
            {previewTotal && (
              <View style={s.preview}>
                <Text style={s.previewLabel}>Total</Text>
                <Text style={[s.previewValue, { color: T.accent }]}>{previewTotal}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, (!form.name.trim() || !form.price) && { opacity: 0.35 }]}
                onPress={save}
                disabled={!form.name.trim() || !form.price}
              >
                <Text style={s.saveBtnText}>{editingId ? 'Save Changes' : 'Add Item'}</Text>
              </TouchableOpacity>
            </View>

          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, T }: { label: string; value: string; color: string; T: ReturnType<typeof useTheme> }) {
  const s = makeStyles(T);
  return (
    <View style={s.statCard}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Dynamic styles ────────────────────────────────────────────────────────────
function makeStyles(T: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: T.bg },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    appName: { fontSize: 28, fontWeight: '700', color: T.text, letterSpacing: -0.5 },
    appSub: { fontSize: 13, color: T.textSub, marginTop: 1 },
    themeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, justifyContent: 'center', alignItems: 'center' },

    // Stats
    statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingVertical: 14, paddingHorizontal: 12 },
    statValue: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
    statLabel: { fontSize: 12, color: T.textSub, fontWeight: '500' },

    // Progress
    progressWrap: { paddingHorizontal: 20, marginBottom: 16 },
    progressTrack: { height: 4, backgroundColor: T.border, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: T.green, borderRadius: 2 },
    progressLabel: { fontSize: 12, color: T.textSub, marginTop: 6 },

    // Filters
    filterScroll: { flexGrow: 0, marginBottom: 12 },
    filterContent: { paddingHorizontal: 16, gap: 10, marginBottom: 20 },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, minHeight: 42, justifyContent: 'center' },
    chipActive: { backgroundColor: T.text, borderColor: T.text },
    chipText: { fontSize: 14, fontWeight: '600', color: T.textSub },
    chipTextActive: { color: T.bg, fontWeight: '700' },

    // List
    listContent: { paddingHorizontal: 16, paddingBottom: 120 },

    // Row
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
    rowBody: { flex: 1, paddingHorizontal: 12 },
    rowName: { fontSize: 15, fontWeight: '600', color: T.text, marginBottom: 4 },
    rowNameDone: { textDecorationLine: 'line-through', color: T.textSub, fontWeight: '400' },
    rowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    rowQty: { fontSize: 12, color: T.textSub },
    rowRight: { alignItems: 'flex-end', gap: 6, minWidth: 60 },
    rowPrice: { fontSize: 16, fontWeight: '700', color: T.text },

    // Checkbox
    cb: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: T.border, justifyContent: 'center', alignItems: 'center', backgroundColor: T.surfaceHigh },

    // Badge
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    // FAB
    fab: { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },

    // Empty
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyEmoji: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: T.text, marginBottom: 6 },
    emptySub: { fontSize: 14, color: T.textSub },

    // Modal sheet
    overlay: { flex: 1, backgroundColor: T.mode === 'light' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: T.surfaceHigh, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: T.border, padding: 24, paddingBottom: Platform.OS === 'ios' ? 42 : 28 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '600', color: T.textSub, letterSpacing: 0.4, marginBottom: 7, marginTop: 2 },
    input: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, color: T.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },

    // Category chips in modal
    catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, marginRight: 8 },
    catChipNew: { borderStyle: 'dashed' },
    catChipText: { fontSize: 13, fontWeight: '500', color: T.textSub },

    // Inline new-category row
    newCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    newCatInput: { flex: 1, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.accent, color: T.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
    newCatConfirm: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    newCatCancel: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center' },

    // Preview
    preview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
    previewLabel: { fontSize: 13, color: T.textSub, fontWeight: '500' },
    previewValue: { fontSize: 18, fontWeight: '700' },

    // Actions
    sheetActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: T.textSub },
    saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center' },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}