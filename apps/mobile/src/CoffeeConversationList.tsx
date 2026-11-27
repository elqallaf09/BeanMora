import { useContext, useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, View } from './native';
import { Action, Icon, Language, Txt, colors, styles, useLabels } from './ui';
import { supabase } from './client';
import { clearConversations, deleteConversation, listConversations } from './coffeeConversationStore';
import type { SavedConversationSummary } from './core/coffee-conversations';

function when(value: string, locale: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    const today = new Date().toDateString() === date.toDateString();
    return today ? date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
      : date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  } catch { return date.toISOString().slice(0, 10); }
}

/** A side sheet listing the member's saved conversations, newest first. */
export function CoffeeConversationList({ owner, currentId, busy, onOpen, onNew, onRemoved, onClose }: {
  owner: string; currentId: string | null; busy: boolean;
  onOpen: (id: string) => void; onNew: () => void; onRemoved: (ids: string[] | 'all') => void; onClose: () => void;
}) {
  const L = useLabels();
  const locale = useContext(Language), ar = locale === 'ar';
  const [rows, setRows] = useState<SavedConversationSummary[] | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const alive = useRef(true);
  async function load(signal?: AbortSignal) {
    if (!supabase) { setError(L('المحادثات المحفوظة غير متاحة الآن.', 'Saved conversations are unavailable right now.')); setRows([]); return; }
    setError('');
    try {
      const next = await listConversations(supabase, signal);
      if (alive.current && !signal?.aborted) setRows(next);
    } catch {
      if (alive.current && !signal?.aborted) { setRows(current => current ?? []); setError(L('تعذّر تحميل محادثاتك. تأكد من الاتصال وحاول مجددًا.', 'Your conversations could not be loaded. Check your connection and try again.')); }
    }
  }
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    return () => { alive.current = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);
  async function remove(id: string) {
    if (!supabase || working) return;
    setWorking(true); setError('');
    try {
      await deleteConversation(supabase, id);
      if (!alive.current) return;
      setRows(current => (current ?? []).filter(row => row.id !== id));
      onRemoved([id]);
    } catch { if (alive.current) setError(L('تعذّر حذف المحادثة. حاول مجددًا.', 'The conversation could not be deleted. Try again.')); }
    finally { if (alive.current) setWorking(false); }
  }
  async function clear() {
    if (!supabase || working) return;
    setWorking(true); setError('');
    try {
      await clearConversations(supabase, owner);
      if (!alive.current) return;
      setRows([]); setConfirmClear(false);
      onRemoved('all');
    } catch { if (alive.current) setError(L('تعذّر مسح المحادثات. حاول مجددًا.', 'The conversations could not be cleared. Try again.')); }
    finally { if (alive.current) setWorking(false); }
  }
  const locked = busy || working;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <SafeAreaProvider>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#201A1570' }}>
        <SafeAreaView testID="assistant-conversations" accessibilityViewIsModal
          style={{ width: '86%', maxWidth: 380, backgroundColor: colors.cream, borderTopRightRadius: 22, borderBottomRightRadius: 22, overflow: 'hidden' }}>
          <View style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Txt heading style={{ flex: 1, fontSize: 19, lineHeight: 28 }}>{L('محادثاتي', 'My conversations')}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel={L('إغلاق', 'Close')} hitSlop={10} onPress={onClose} style={{ padding: 6 }}>
              <Icon name="close" size={22} />
            </Pressable>
          </View>
          <View style={{ padding: 14, paddingBottom: 6 }}>
            <Action title={L('محادثة جديدة', 'New conversation')} selected disabled={locked} onPress={onNew} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 8 }}>
            {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
            {rows === null ? <ActivityIndicator color={colors.brown} /> : null}
            {rows && !rows.length && !error ? <Txt style={styles.muted}>{L('ما عندك محادثات محفوظة بعد. اسأل خبير القهوة وتنحفظ محادثتك هنا.', 'No saved conversations yet. Ask the coffee expert and your conversation is saved here.')}</Txt> : null}
            {rows?.map(row => (
              <View key={row.id} testID="assistant-conversation-row"
                style={{ flexDirection: ar ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, backgroundColor: row.id === currentId ? colors.chip : colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={row.title} accessibilityState={{ selected: row.id === currentId, disabled: locked }} disabled={locked}
                  onPress={() => onOpen(row.id)} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 3 }}>
                  <Txt numberOfLines={2} style={{ fontWeight: '700', lineHeight: 23 }}>{row.title}</Txt>
                  <Txt style={[styles.muted, { fontSize: 13 }]}>{when(row.updatedAt, locale)}</Txt>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={L('حذف المحادثة', 'Delete conversation') + ': ' + row.title} disabled={locked} hitSlop={8}
                  onPress={() => void remove(row.id)} style={{ padding: 12, opacity: locked ? 0.4 : 1 }}>
                  <Icon name="trash" size={20} color={colors.muted} />
                </Pressable>
              </View>
            ))}
            {error && rows !== null ? <Action compact title={L('إعادة المحاولة', 'Try again')} disabled={locked} onPress={() => void load()} /> : null}
          </ScrollView>
          {rows?.length ? (
            <View style={{ padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              {confirmClear ? (
                <>
                  <Txt style={styles.muted}>{L('تُحذف كل محادثاتك المحفوظة نهائيًا ولا يمكن استرجاعها.', 'All your saved conversations are deleted permanently and cannot be restored.')}</Txt>
                  <View style={{ flexDirection: ar ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' }}>
                    <Action compact title={L('نعم، امسح الكل', 'Yes, clear all')} selected disabled={locked} onPress={() => void clear()} />
                    <Action compact title={L('تراجع', 'Keep them')} disabled={locked} onPress={() => setConfirmClear(false)} />
                  </View>
                </>
              ) : <Action compact title={L('مسح كل المحادثات', 'Clear all conversations')} disabled={locked} onPress={() => setConfirmClear(true)} />}
            </View>
          ) : null}
        </SafeAreaView>
        <Pressable accessibilityRole="button" accessibilityLabel={L('إغلاق', 'Close')} onPress={onClose} style={{ flex: 1 }} />
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}
