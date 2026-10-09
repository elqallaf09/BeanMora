import { useContext, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from './native';
import {
  supabase,
  publicSupabase,
  catalogScope,
  clearDeletedSession,
} from './client';
import { deleteCurrentAccount } from './core/account-deletion';
import { catalogCacheKey } from './catalogCache';
import { recipeShelfKey } from './useRecipeShelf';
import { invalidatePublicCatalog } from './data';
import { AccountSecurity } from './AccountSecurity';
import { Action, Icon, Language, Txt, colors, styles, useCopy } from './ui';

export function SettingsAccount({
  session,
  onDeleted,
  onSignedOut,
}: {
  session: Session;
  onDeleted: (localCleanupFailed: boolean) => void;
  onSignedOut: () => void;
}) {
  const ar = useContext(Language) === 'ar';
  const t = useCopy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const inFlight = useRef(false);
  async function deleteAccount() {
    if (
      !supabase ||
      !session ||
      inFlight.current ||
      confirmDelete.trim() !== (ar ? 'حذف' : 'DELETE')
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setDeleteError('');
    try {
      const owner = await deleteCurrentAccount(supabase);
      invalidatePublicCatalog(supabase);
      if (publicSupabase) invalidatePublicCatalog(publicSupabase);
      let localCleanupFailed = false;
      try {
        await AsyncStorage.multiRemove([
          recipeShelfKey(catalogScope, owner),
          'beanmora-roast-draft:' + owner,
          catalogCacheKey(catalogScope, 'ar'),
          catalogCacheKey(catalogScope, 'en'),
        ]);
      } catch {
        localCleanupFailed = true;
      }
      try {
        await clearDeletedSession();
      } catch {
        localCleanupFailed = true;
      }
      onDeleted(localCleanupFailed);
    } catch {
      setDeleteError(
        ar
          ? 'لم يتأكد حذف الحساب. تحقق من الاتصال وأعد المحاولة. قد تكون بعض الملفات حُذفت بالفعل.'
          : 'Account deletion was not confirmed. Check your connection and retry. Some uploaded files may already have been removed.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function signOut() {
    if (!supabase || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      onSignedOut();
    } catch {
      setError(
        ar
          ? 'تعذّر تسجيل الخروج. حاول مرة ثانية.'
          : 'Could not sign out. Please retry.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <View
      testID="settings-account"
      style={[styles.card, { padding: 16, gap: 12 }]}
    >
      <Txt
        numberOfLines={1}
        style={{ fontSize: 13, color: colors.muted, writingDirection: 'ltr' }}
      >
        {session.user.email}
      </Txt>
      <AccountSecurity session={session} compact />
      <View style={{ height: 1, backgroundColor: colors.line }} />
      <SettingsRow
        label={t.logout}
        icon="arrow"
        disabled={busy}
        onPress={() => void signOut()}
      />
      {error ? (
        <Txt accessibilityRole="alert" style={styles.error}>
          {error}
        </Txt>
      ) : null}
      <SettingsRow
        label={ar ? 'حذف الحساب والبيانات' : 'Delete account and data'}
        icon="trash"
        danger
        disabled={busy}
        onPress={() => {
          setConfirmDelete('');
          setDeleteError('');
          setDeleteOpen(true);
        }}
      />
      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setDeleteOpen(false);
        }}
      >
        <View style={s.modalShade}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, padding: 22 }}
            style={s.deletePanel}
            accessibilityViewIsModal
            testID="delete-account-dialog"
          >
            <Txt heading style={{ fontSize: 22 }}>
              {ar ? 'حذف الحساب نهائيًا؟' : 'Permanently delete your account?'}
            </Txt>
            <Txt>
              {ar
                ? 'هذا يحذف حسابك وجميع بياناتك المرتبطة به. لا يمكن التراجع، وقد تُحذف الملفات قبل اكتمال العملية.'
                : 'This removes your account and its associated data. It cannot be undone. Uploaded files may be removed before the process completes.'}
            </Txt>
            <Txt style={styles.muted}>
              {ar ? 'اكتب حذف للتأكيد' : 'Type DELETE to confirm'}
            </Txt>
            <TextInput
              accessibilityLabel={
                ar ? 'تأكيد حذف الحساب' : 'Confirm account deletion'
              }
              value={confirmDelete}
              onChangeText={setConfirmDelete}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={[
                s.field,
                {
                  padding: 12,
                  color: colors.ink,
                  textAlign: ar ? 'right' : 'left',
                },
              ]}
            />
            {deleteError ? (
              <View accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Txt style={styles.error}>{deleteError}</Txt>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                busy
                  ? ar
                    ? 'جارٍ حذف الحساب…'
                    : 'Deleting account…'
                  : ar
                    ? 'احذف حسابي نهائيًا'
                    : 'Permanently delete my account'
              }
              accessibilityState={{
                disabled:
                  busy || confirmDelete.trim() !== (ar ? 'حذف' : 'DELETE'),
              }}
              disabled={
                busy || confirmDelete.trim() !== (ar ? 'حذف' : 'DELETE')
              }
              onPress={() => void deleteAccount()}
              style={[
                s.deleteButton,
                {
                  backgroundColor: '#9C342B',
                  opacity:
                    busy || confirmDelete.trim() !== (ar ? 'حذف' : 'DELETE')
                      ? 0.45
                      : 1,
                },
              ]}
            >
              <Txt style={[s.deleteText, { color: '#FFF' }]}>
                {busy
                  ? ar
                    ? 'جارٍ حذف الحساب…'
                    : 'Deleting account…'
                  : ar
                    ? 'احذف حسابي نهائيًا'
                    : 'Permanently delete my account'}
              </Txt>
            </Pressable>
            <Action
              title={ar ? 'إلغاء' : 'Cancel'}
              onPress={() => setDeleteOpen(false)}
              disabled={busy}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
function SettingsRow({
  label,
  icon,
  disabled,
  danger = false,
  onPress,
}: {
  label: string;
  icon: 'arrow' | 'trash';
  disabled: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const ar = useContext(Language) === 'ar';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 48,
        flexDirection: ar ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={icon} size={20} color={danger ? '#9C342B' : colors.teal} />
      <Txt
        style={{
          flex: 1,
          fontWeight: '700',
          fontSize: 15,
          color: danger ? '#9C342B' : colors.ink,
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
const s = StyleSheet.create({
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  deleteButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4AAA4',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deleteText: { color: '#9C342B', fontWeight: '700', textAlign: 'center' },
  modalShade: {
    flex: 1,
    backgroundColor: 'rgba(17,9,3,0.55)',
    justifyContent: 'center',
    padding: 22,
  },
  deletePanel: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '90%',
    flexGrow: 0,
    borderRadius: 24,
    backgroundColor: colors.paper,
  },
});
