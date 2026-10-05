import { useContext, useRef, useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase, authProviderEnabled } from './client';
import { artwork } from './CoffeeScreens';
import { AppVersion } from './AppVersion';
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
const exchangedCodes = new Set<string>();
export async function finishOAuth(url: string) {
  if (!supabase || !url.startsWith('beanmora://auth')) return;
  const code = new URL(url).searchParams.get('code');
  if (code && !exchangedCodes.has(code)) {
    exchangedCodes.add(code);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      exchangedCodes.delete(code);
      throw error;
    }
  }
}
export function AccountScreen({
  session,
  back,
}: {
  session: Session | null;
  back: () => void;
}) {
  const t = useCopy();
  const ar = useContext(Language) === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const emailRef = useRef<TextInput>(null);
  function authError(message: string) {
    const lower = message.toLowerCase();
    return lower.includes('invalid login')
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
      if (mode === 'signup') {
        if (password.length < 8) {
          setError(
            ar
              ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
              : 'Use at least 8 characters for your password.',
          );
          return;
        }
        const { data, error } = await supabase!.auth.signUp({
          email: email.trim(),
          password,
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
      );
      if (error) throw error;
      setNotice(
        ar
          ? 'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.'
          : 'Password reset link sent to your email.',
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
        Platform.OS === 'web' ? window.location.origin : 'beanmora://auth';
      const { data, error } = await supabase!.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
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
  if (session)
    return (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { width: '100%', maxWidth: 620, alignSelf: 'center', gap: 22 },
        ]}
      >
        <View style={{ alignItems: 'center', padding: 22 }}>
          <Brand />
          <Txt heading style={[styles.title, { marginTop: 20 }]}>
            {t.account}
          </Txt>
          <Txt style={styles.muted}>{session.user.email}</Txt>
        </View>
        <View style={styles.card}>
          <Txt>{t.profileNote}</Txt>
          <Action
            title={t.logout}
            onPress={() => void authenticate()}
            selected
            disabled={busy}
          />
          {error ? <Txt style={styles.error}>{error}</Txt> : null}
        </View>
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
              {ar ? 'مرحباً بك مجدداً' : 'Welcome back'}
            </Txt>
            <Txt style={s.tagline}>
              {ar
                ? 'سجل دخولك لمتابعة وصفاتك وحفظ\nحبوبك المفضلة.'
                : 'Sign in to follow recipes and save\nyour favorite beans.'}
            </Txt>
          </View>
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
                  onPress={() => {
                    setMode(value);
                    setError('');
                    setNotice('');
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
            <View style={s.field}>
              <Icon name="lock" size={21} color={colors.muted} />
              <TextInput
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
              {password ? (
                <IconButton
                  name="eye"
                  label={show ? t.hide : t.show}
                  size={18}
                  onPress={() => setShow((v) => !v)}
                />
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
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
            {error ? <Txt style={styles.error}>{error}</Txt> : null}
            {notice ? <Txt style={styles.success}>{notice}</Txt> : null}
            <Action
              title={
                mode === 'login'
                  ? t.login
                  : ar
                    ? 'إنشاء حساب'
                    : 'Create account'
              }
              onPress={() => void authenticate()}
              selected
              disabled={busy || !email.trim() || !password}
            />
            <View style={s.divider}>
              <View style={s.rule} />
              <Txt style={{ fontSize: 13, color: colors.muted }}>
                {ar ? 'أو تابع باستخدام' : 'Or continue with'}
              </Txt>
              <View style={s.rule} />
            </View>
            <View style={s.social}>
              {(['apple', 'google', 'mail'] as const).map((provider) => (
                <Pressable
                  key={provider}
                  accessibilityRole="button"
                  accessibilityLabel={
                    provider === 'mail'
                      ? ar
                        ? 'الدخول بالبريد الإلكتروني'
                        : 'Use email'
                      : provider === 'apple'
                        ? 'Apple'
                        : 'Google'
                  }
                  disabled={busy}
                  onPress={() =>
                    provider === 'mail'
                      ? emailRef.current?.focus()
                      : void social(provider)
                  }
                  style={s.socialButton}
                >
                  <Icon name={provider} size={25} />
                </Pressable>
              ))}
            </View>
            <Txt style={s.terms}>
              {ar
                ? 'بمتابعتك، أنت توافق على شروط الاستخدام\nوسياسة الخصوصية.'
                : 'By continuing, you agree to the terms of use\nand privacy policy.'}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.guest}
              onPress={back}
              style={{ alignSelf: 'center', padding: 4 }}
            >
              <Txt style={{ fontSize: 12, color: colors.muted }}>{t.guest}</Txt>
            </Pressable>
          </View>
          <AppVersion light />
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
const s = StyleSheet.create({
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
    gap: 28,
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
    minHeight: 39,
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
  social: { flexDirection: 'row', gap: 10 },
  socialButton: {
    flex: 1,
    height: 49,
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
