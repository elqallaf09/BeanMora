import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from './native';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import {
  supabase,
  publicSupabase,
  authProviderEnabled,
  catalogScope,
  clearDeletedSession,
} from './client';
import { deleteCurrentAccount } from './core/account-deletion';
import {
  createOAuthCallbackHandler,
  nativeAuthRedirect,
} from './oauthCallback';
import { catalogCacheKey } from './catalogCache';
import { recipeShelfKey } from './useRecipeShelf';
import { invalidatePublicCatalog } from './data';
import { artwork } from './CoffeeScreens';
import { AppVersion } from './AppVersion';
import { AccountSecurity } from './AccountSecurity';
import { PasswordRecovery } from './PasswordRecovery';
import { LegalLinks } from './LegalLinks';
import {
  Action,
  Brand,
  Icon,
  IconButton,
  Language,
  Txt,
  colors,
  styles,
  useCopy,
} from './ui';

WebBrowser.maybeCompleteAuthSession();
export const finishOAuth = supabase
  ? createOAuthCallbackHandler(
      supabase.auth,
      Platform.OS === 'web' ? window.location.origin : nativeAuthRedirect,
    )
  : async () => {};
export function AccountScreen({
  session,
  profileContent,
  settings,
  back,
  onDeleted,
  recovery = false,
  onRecovered = () => {},
}: {
  session: Session | null;
  profileContent?: ReactNode;
  settings: () => void;
  back: () => void;
  onDeleted: (localCleanupFailed: boolean) => void;
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const t = useCopy();
  const ar = useContext(Language) === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [appleEnabled, setAppleEnabled] = useState(false);
  const inFlight = useRef(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);
  useEffect(() => {
    let active = true;
    if (!session && supabase)
      void authProviderEnabled('apple')
        .then((enabled) => {
          if (active) setAppleEnabled(enabled);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);
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
  function authError(message: string) {
    const lower = message.toLowerCase();
    return lower.startsWith('oauth_') ||
      lower.includes('code verifier') ||
      lower.includes('pkce')
      ? ar
        ? 'تعذّر إكمال تسجيل الدخول. حاول مرة ثانية.'
        : 'Could not complete sign-in. Please try again.'
      : lower.includes('invalid login')
        ? t.invalidCredentials
        : lower.includes('not confirmed')
          ? t.emailNotConfirmed
          : lower.includes('network') || lower.includes('fetch')
            ? t.networkError
            : ar
              ? t.authError
              : message || t.authError;
  }
  async function request(action: () => Promise<void>) {
    if (!supabase || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : t.authError));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function authenticate() {
    await request(async () => {
      if (session) {
        const { error } = await supabase!.auth.signOut({ scope: 'local' });
        if (error) throw error;
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError(
          ar
            ? 'أدخل بريدًا إلكترونيًا صحيحًا.'
            : 'Enter a valid email address.',
        );
        emailRef.current?.focus();
        return;
      }
      if (mode === 'signup') {
        if (password.length < 8) {
          setError(
            ar
              ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
              : 'Use at least 8 characters for your password.',
          );
          return;
        }
        if (password !== confirmation) {
          setError(
            ar ? 'كلمتا المرور غير متطابقتين.' : 'The passwords do not match.',
          );
          confirmationRef.current?.focus();
          return;
        }
        const { data, error } = await supabase!.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo:
              Platform.OS === 'web'
                ? window.location.origin
                : nativeAuthRedirect,
          },
        });
        if (error) throw error;
        if (!data.session)
          setNotice(
            ar
              ? 'راجع بريدك الإلكتروني لتأكيد حسابك.'
              : 'Check your email to confirm your account.',
          );
      } else {
        const { data, error } = await supabase!.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.session) throw new Error(t.authError);
      }
      setPassword('');
      setConfirmation('');
    });
  }
  async function resetPassword() {
    if (!email.trim()) {
      setNotice(
        ar ? 'أدخل بريدك الإلكتروني أولاً.' : 'Enter your email first.',
      );
      emailRef.current?.focus();
      return;
    }
    await request(async () => {
      const { error } = await supabase!.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            Platform.OS === 'web' ? window.location.origin : nativeAuthRedirect,
        },
      );
      if (error) throw error;
      setNotice(
        ar
          ? 'إذا كان البريد مرتبطًا بحساب، ستصلك رسالة لاسترجاع كلمة المرور. افتح الرابط على هذا الجهاز.'
          : 'If this email has an account, a password recovery message will arrive. Open its link on this device.',
      );
    });
  }
  async function social(provider: 'apple' | 'google') {
    await request(async () => {
      if (!(await authProviderEnabled(provider))) {
        setError(
          ar
            ? 'تسجيل ' +
                (provider === 'apple' ? 'Apple' : 'Google') +
                ' غير مفعّل حالياً. يمكنك الدخول بالبريد الإلكتروني.'
            : (provider === 'apple' ? 'Apple' : 'Google') +
                ' sign-in is not enabled. Use email to sign in.',
        );
        return;
      }
      const redirectTo =
        Platform.OS === 'web' ? window.location.origin : nativeAuthRedirect;
      const { data, error } = await supabase!.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          ...(provider === 'google'
            ? { queryParams: { prompt: 'select_account' } }
            : {}),
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error(t.authError);
      if (Platform.OS === 'web') {
        window.location.assign(data.url);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );
      if (result.type === 'success') await finishOAuth(result.url);
    });
  }
  if (recovery && session) return <PasswordRecovery done={onRecovered} />;
  if (session)
    return (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 20 },
        ]}
      >
        <View
          style={[
            styles.row,
            {
              justifyContent: 'space-between',
              flexDirection: ar ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={{ gap: 3, flex: 1 }}>
            <Txt heading style={styles.title}>
              {t.account}
            </Txt>
            <Txt style={[styles.muted, { writingDirection: 'ltr' }]}>
              {session.user.email}
            </Txt>
          </View>
          <Action
            compact
            title={ar ? 'الإعدادات' : 'Settings'}
            onPress={settings}
          />
        </View>
        {profileContent}
        <AccountSecurity session={session} />
        <View style={styles.card}>
          <LegalLinks />
          <Action
            title={t.logout}
            onPress={() => void authenticate()}
            selected
            disabled={busy}
          />
          {error ? <Txt style={styles.error}>{error}</Txt> : null}
        </View>
        <View style={[styles.card, { gap: 12 }]}>
          <Txt heading>{ar ? 'حسابك وبياناتك' : 'Your account and data'}</Txt>
          <Txt style={styles.muted}>
            {ar
              ? 'إدارة بياناتك وحذف حسابك نهائيًا.'
              : 'Manage your data and permanent account deletion.'}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              ar ? 'حذف الحساب والبيانات' : 'Delete account and data'
            }
            disabled={busy}
            onPress={() => {
              setConfirmDelete('');
              setDeleteError('');
              setDeleteOpen(true);
            }}
            style={s.deleteButton}
          >
            <Txt style={s.deleteText}>
              {ar ? 'حذف الحساب والبيانات' : 'Delete account and data'}
            </Txt>
          </Pressable>
        </View>
        <Modal
          visible={deleteOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeleteOpen(false);
          }}
        >
          <View style={s.modalShade}>
            <View
              style={s.deletePanel}
              accessibilityViewIsModal
              testID="delete-account-dialog"
            >
              <Txt heading style={{ fontSize: 22 }}>
                {ar
                  ? 'حذف الحساب نهائيًا؟'
                  : 'Permanently delete your account?'}
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
                <View
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
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
            </View>
          </View>
        </Modal>
        <AppVersion />
      </ScrollView>
    );
  return (
    <ImageBackground
      source={artwork.login}
      resizeMode="cover"
      imageStyle={{ width: '100%', height: '100%' }}
      style={{
        flex: 1,
        width: '100%',
        overflow: 'hidden',
        backgroundColor: colors.brown,
      }}
    >
      <View style={s.shade} />
      <View style={s.back}>
        <IconButton name="back" label={t.back} color="#FFF" onPress={back} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.page}
        >
          <View style={s.intro}>
            <Brand light large />
            <Txt heading style={s.welcome}>
              {mode === 'signup'
                ? ar
                  ? 'ابدأ رحلتك مع القهوة'
                  : 'Your coffee journey starts here'
                : ar
                  ? 'مرحباً بك مجدداً'
                  : 'Welcome back'}
            </Txt>
            <Txt style={s.tagline}>
              {mode === 'signup'
                ? ar
                  ? 'احفظ وصفاتك، رتّب أكياسك، وتابع تجارب التحضير.'
                  : 'Save recipes, organize your coffees, and track your brews.'
                : ar
                  ? 'سجّل دخولك لمتابعة وصفاتك وحبوبك المفضلة.'
                  : 'Sign in to follow recipes and save your favorite beans.'}
            </Txt>
          </View>
          <Pressable
            testID="guest-browse"
            accessibilityRole="button"
            accessibilityLabel={t.guest}
            onPress={back}
            style={({ pressed }) => [
              s.guest,
              {
                opacity: pressed ? 0.8 : 1,
                flexDirection: ar ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={s.guestIcon}>
              <Icon name="search" size={23} color={colors.teal} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt style={s.guestTitle}>{t.guest}</Txt>
              <Txt style={s.guestNote}>
                {ar
                  ? 'استكشف البن والوصفات مباشرة'
                  : 'Explore coffees and recipes right away'}
              </Txt>
            </View>
            <Txt style={{ color: colors.teal, fontSize: 24 }}>
              {ar ? '←' : '→'}
            </Txt>
          </Pressable>
          <Action title={ar ? 'الإعدادات' : 'Settings'} onPress={settings} />
          <View style={s.panel}>
            <View style={s.segment}>
              {(['signup', 'login'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={
                    value === 'login'
                      ? ar
                        ? 'اختيار تسجيل الدخول'
                        : 'Use email sign in'
                      : ar
                        ? 'إنشاء حساب'
                        : 'Create account'
                  }
                  accessibilityState={{ selected: mode === value }}
                  disabled={busy}
                  onPress={() => {
                    setMode(value);
                    setError('');
                    setNotice('');
                    setConfirmation('');
                    setShow(false);
                  }}
                  style={[
                    s.segmentButton,
                    mode === value && { backgroundColor: colors.brown },
                  ]}
                >
                  <Txt
                    style={{
                      textAlign: 'center',
                      fontSize: 13,
                      fontWeight: '700',
                      color: mode === value ? '#FFF' : colors.brown,
                    }}
                  >
                    {value === 'login'
                      ? t.login
                      : ar
                        ? 'إنشاء حساب'
                        : 'Create account'}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <Txt style={s.label}>{t.email}</Txt>
            <View style={s.field}>
              <Icon name="user" size={21} color={colors.muted} />
              <TextInput
                ref={emailRef}
                accessibilityLabel={t.email}
                placeholder={t.email}
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!busy}
                style={[
                  s.input,
                  {
                    textAlign: ar ? 'right' : 'left',
                    fontFamily: ar ? 'Tajawal-Regular' : undefined,
                  },
                ]}
              />
            </View>
            <Txt style={s.label}>{t.password}</Txt>
            <View style={s.field}>
              <Icon name="lock" size={21} color={colors.muted} />
              <TextInput
                ref={passwordRef}
                accessibilityLabel={t.password}
                placeholder={t.password}
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                returnKeyType={mode === 'signup' ? 'next' : 'go'}
                editable={!busy}
                onSubmitEditing={() =>
                  mode === 'signup'
                    ? confirmationRef.current?.focus()
                    : void authenticate()
                }
                style={[
                  s.input,
                  {
                    textAlign: ar ? 'right' : 'left',
                    fontFamily: ar ? 'Tajawal-Regular' : undefined,
                  },
                ]}
              />
              {
                <IconButton
                  name="eye"
                  label={show ? t.hide : t.show}
                  size={18}
                  onPress={() => setShow((v) => !v)}
                />
              }
            </View>
            {mode === 'signup' ? (
              <>
                <Txt style={s.fieldHint}>
                  {ar
                    ? 'استخدم 8 أحرف على الأقل.'
                    : 'Use at least 8 characters.'}
                </Txt>
                <Txt style={s.label}>
                  {ar ? 'تأكيد كلمة المرور' : 'Confirm password'}
                </Txt>
                <View style={s.field}>
                  <Icon name="lock" size={21} color={colors.muted} />
                  <TextInput
                    ref={confirmationRef}
                    accessibilityLabel={
                      ar ? 'تأكيد كلمة المرور' : 'Confirm password'
                    }
                    placeholder={
                      ar ? 'أعد كتابة كلمة المرور' : 'Re-enter your password'
                    }
                    placeholderTextColor={colors.muted}
                    value={confirmation}
                    onChangeText={setConfirmation}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    editable={!busy}
                    onSubmitEditing={() => void authenticate()}
                    style={[
                      s.input,
                      {
                        textAlign: ar ? 'right' : 'left',
                        fontFamily: ar ? 'Tajawal-Regular' : undefined,
                      },
                    ]}
                  />
                </View>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'
                }
                onPress={() => void resetPassword()}
                disabled={busy}
                style={{
                  alignSelf: 'flex-end',
                  minHeight: 36,
                  justifyContent: 'center',
                }}
              >
                <Txt style={{ fontSize: 13, color: colors.muted }}>
                  {ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Txt>
              </Pressable>
            )}
            {error ? (
              <View accessibilityRole="alert">
                <Txt style={styles.error}>{error}</Txt>
              </View>
            ) : null}
            {notice ? (
              <View accessibilityLiveRegion="polite">
                <Txt style={[styles.success, s.notice]}>{notice}</Txt>
              </View>
            ) : null}
            <Action
              title={
                busy
                  ? ar
                    ? 'جارٍ المتابعة…'
                    : 'Please wait…'
                  : mode === 'login'
                    ? t.login
                    : ar
                      ? 'إنشاء حساب'
                      : 'Create account'
              }
              onPress={() => void authenticate()}
              selected
              disabled={
                busy ||
                !email.trim() ||
                !password ||
                (mode === 'signup' && !confirmation)
              }
            />
            <View style={s.divider}>
              <View style={s.rule} />
              <Txt style={{ fontSize: 13, color: colors.muted }}>
                {ar ? 'أو تابع باستخدام' : 'Or continue with'}
              </Txt>
              <View style={s.rule} />
            </View>
            <View style={s.social}>
              {(appleEnabled
                ? (['google', 'apple'] as const)
                : (['google'] as const)
              ).map((provider) => (
                <Pressable
                  key={provider}
                  accessibilityRole="button"
                  accessibilityLabel={
                    provider === 'apple'
                      ? ar
                        ? 'تابع باستخدام Apple'
                        : 'Continue with Apple'
                      : ar
                        ? 'تابع باستخدام Google'
                        : 'Continue with Google'
                  }
                  disabled={busy}
                  onPress={() => void social(provider)}
                  style={s.socialButton}
                >
                  <Icon name={provider} size={25} />
                  <Txt style={{ fontSize: 14, fontWeight: '700' }}>
                    {provider === 'google'
                      ? ar
                        ? 'تابع باستخدام Google'
                        : 'Continue with Google'
                      : ar
                        ? 'تابع باستخدام Apple'
                        : 'Continue with Apple'}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <Txt style={s.terms}>
              {ar
                ? 'بمتابعتك، أنت توافق على شروط الاستخدام\nوسياسة الخصوصية.'
                : 'By continuing, you agree to the terms of use\nand privacy policy.'}
            </Txt>
            <LegalLinks />
          </View>
          <AppVersion light />
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
const s = StyleSheet.create({
  guest: {
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: '#C9DED6',
  },
  guestIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E6EFEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    color: colors.teal,
  },
  guestNote: { fontSize: 13, lineHeight: 20, color: colors.muted },
  label: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  fieldHint: { fontSize: 13, lineHeight: 20, color: colors.muted },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E6EFEB',
    lineHeight: 24,
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
    padding: 22,
    gap: 16,
    borderRadius: 24,
    backgroundColor: colors.paper,
  },
  shade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17,9,3,0.28)',
  },
  back: { position: 'absolute', left: 12, top: 14, zIndex: 2 },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 65,
    paddingBottom: 40,
    justifyContent: 'center',
    gap: 20,
  },
  intro: { alignItems: 'center', gap: 14 },
  welcome: {
    color: '#FFF',
    fontSize: 30,
    lineHeight: 42,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  tagline: { color: '#FFF', fontSize: 17, lineHeight: 29, textAlign: 'center' },
  panel: {
    backgroundColor: colors.paper,
    borderRadius: 26,
    padding: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: colors.chip,
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingLeft: 15,
    paddingRight: 12,
    backgroundColor: '#F8F5EF',
    minHeight: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  rule: { flex: 1, height: 1, backgroundColor: '#D6CCBD' },
  social: { gap: 10 },
  socialButton: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terms: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 23,
    marginTop: 12,
  },
});
