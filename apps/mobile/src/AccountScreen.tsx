import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from './native';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase, authProviderEnabled } from './client';
import {
  createOAuthCallbackHandler,
  nativeAuthRedirect,
} from './oauthCallback';
import { artwork } from './CoffeeScreens';
import { AppVersion } from './AppVersion';
import { PasswordRecovery } from './PasswordRecovery';
import { LegalLinks } from './LegalLinks';
import { CountryPicker } from './CountryPicker';
import { signupDetails, usernameAvailable } from './core/account-profile';
import { useLabels,
  Action,
  Field,
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
  recovery = false,
  onRecovered = () => {},
}: {
  session: Session | null;
  profileContent?: ReactNode;
  settings: () => void;
  back: () => void;
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const t = useCopy();
  const locale = useContext(Language);
  const ar = locale === 'ar';
  const L = useLabels();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
  function authError(message: string) {
    const fieldErrors: Record<string, string> = {
      ACCOUNT_EMAIL: L('أدخل بريدًا إلكترونيًا صحيحًا.', 'Enter a valid email address.'),
      ACCOUNT_USERNAME: L('اسم المستخدم من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو شرطة سفلية.', 'Use 3–30 English letters, numbers or underscores for your username.', 'ユーザー名は英字・数字・アンダースコアの3〜30文字にしてください。'),
      ACCOUNT_USERNAME_TAKEN: L('اسم المستخدم مستخدم، اختر اسمًا آخر.', 'Username is taken. Choose another.', 'このユーザー名は使用されています。別の名前を選んでください。'),
      ACCOUNT_COUNTRY: L('اختر دولتك.', 'Choose your country.', '国・地域を選択してください。'),
      ACCOUNT_PHONE: L('أدخل رقم الهاتف مع رمز الدولة، مثل +96550000000.', 'Enter your phone with its country code, for example +96550000000.', '国番号を含む電話番号を入力してください（例：+819012345678）。'),
      ACCOUNT_PASSWORD: L('كلمة المرور يجب أن تكون 8 أحرف على الأقل.', 'Use at least 8 characters for your password.'),
      ACCOUNT_CONFIRMATION: L('كلمتا المرور غير متطابقتين.', 'The passwords do not match.'),
    };
    if (fieldErrors[message]) return fieldErrors[message];
    const lower = message.toLowerCase();
    return lower.startsWith('oauth_') ||
      lower.includes('code verifier') ||
      lower.includes('pkce')
      ? L('تعذّر إكمال تسجيل الدخول. حاول مرة ثانية.', 'Could not complete sign-in. Please try again.')
      : lower.includes('invalid login')
        ? t.invalidCredentials
        : lower.includes('not confirmed')
          ? t.emailNotConfirmed
          : lower.includes('network') || lower.includes('fetch')
            ? t.networkError
            : t.authError;
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError(
          L('أدخل بريدًا إلكترونيًا صحيحًا.', 'Enter a valid email address.'),
        );
        emailRef.current?.focus();
        return;
      }
      if (mode === 'signup') {
        const details = signupDetails({ country, username, email, password, confirmation, phone }, locale);
        if (!(await usernameAvailable(supabase!, details.metadata.username))) throw new Error('ACCOUNT_USERNAME_TAKEN');
        const { data, error } = await supabase!.auth.signUp({
          email: details.email,
          password: details.password,
          options: {
            data: details.metadata,
            emailRedirectTo:
              Platform.OS === 'web'
                ? window.location.origin
                : nativeAuthRedirect,
          },
        });
        if (error) throw error;
        if (!data.session)
          setNotice(
            L('راجع بريدك الإلكتروني لتأكيد حسابك.', 'Check your email to confirm your account.'),
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
        L('أدخل بريدك الإلكتروني أولاً.', 'Enter your email first.'),
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
        L('إذا كان البريد مرتبطًا بحساب، ستصلك رسالة لاسترجاع كلمة المرور. افتح الرابط على هذا الجهاز.', 'If this email has an account, a password recovery message will arrive. Open its link on this device.'),
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
        testID="account-screen"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { width: '100%', maxWidth: 1280, alignSelf: 'center', gap: 16 },
        ]}
      >
        {profileContent}
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
                ? L('ابدأ رحلتك مع القهوة', 'Your coffee journey starts here')
                : L('مرحباً بك مجدداً', 'Welcome back')}
            </Txt>
            <Txt style={s.tagline}>
              {mode === 'signup'
                ? L('احفظ وصفاتك، رتّب أكياسك، وتابع تجارب التحضير.', 'Save recipes, organize your coffees, and track your brews.')
                : L('سجّل دخولك لمتابعة وصفاتك وحبوبك المفضلة.', 'Sign in to follow recipes and save your favorite beans.')}
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
                {L('استكشف البن والوصفات مباشرة', 'Explore coffees and recipes right away')}
              </Txt>
            </View>
            <Txt style={{ color: colors.teal, fontSize: 24 }}>
              {ar ? '←' : '→'}
            </Txt>
          </Pressable>
          <Action title={L('الإعدادات', 'Settings')} onPress={settings} />
          <View style={s.panel}>
            <View style={s.segment}>
              {(['signup', 'login'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={
                    value === 'login'
                      ? L('اختيار تسجيل الدخول', 'Use email sign in')
                      : L('إنشاء حساب', 'Create account')
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
                      : L('إنشاء حساب', 'Create account')}
                  </Txt>
                </Pressable>
              ))}
            </View>
            {mode === 'signup' ? <View style={{ gap: 10 }}>
              <Txt style={s.label}>{L('الدولة', 'Country')}</Txt>
              <CountryPicker value={country} onChange={setCountry} disabled={busy} />
              <Field label={L('اسم المستخدم', 'Username')} value={username} onChangeText={setUsername} maxLength={30} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" editable={!busy} />
              <Txt style={s.fieldHint}>{L('من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو شرطة سفلية.', '3–30 English letters, numbers or underscores.', '英字・数字・アンダースコアの3〜30文字。')}</Txt>
            </View> : null}
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
                  {L('استخدم 8 أحرف على الأقل.', 'Use at least 8 characters.')}
                </Txt>
                <Txt style={s.label}>
                  {L('تأكيد كلمة المرور', 'Confirm password')}
                </Txt>
                <View style={s.field}>
                  <Icon name="lock" size={21} color={colors.muted} />
                  <TextInput
                    ref={confirmationRef}
                    accessibilityLabel={
                      L('تأكيد كلمة المرور', 'Confirm password')
                    }
                    placeholder={
                      L('أعد كتابة كلمة المرور', 'Re-enter your password')
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
                <Field label={L('رقم الهاتف', 'Phone number')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder={locale === 'ja' ? '+819012345678' : '+96550000000'} maxLength={32} editable={!busy} style={{ writingDirection: 'ltr', textAlign: 'left' }} />
                <Txt style={s.fieldHint}>{L('مع رمز الدولة. رقم الهاتف خاص بحسابك ولا يظهر في الملف العام.', 'Include the country code. Your phone is private and does not appear on your public profile.', '国番号を含めてください。電話番号は非公開で、プロフィールには表示されません。')}</Txt>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  L('نسيت كلمة المرور؟', 'Forgot password?')
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
                  {L('نسيت كلمة المرور؟', 'Forgot password?')}
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
                  ? L('جارٍ المتابعة…', 'Please wait…')
                  : mode === 'login'
                    ? t.login
                    : L('إنشاء حساب', 'Create account')
              }
              onPress={() => void authenticate()}
              selected
              disabled={
                busy ||
                !email.trim() ||
                !password ||
                (mode === 'signup' && (!confirmation || !country || !username.trim() || !phone.trim()))
              }
            />
            <View style={s.divider}>
              <View style={s.rule} />
              <Txt style={{ fontSize: 13, color: colors.muted }}>
                {L('أو تابع باستخدام', 'Or continue with')}
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
                      ? L('تابع باستخدام Apple', 'Continue with Apple')
                      : L('تابع باستخدام Google', 'Continue with Google')
                  }
                  disabled={busy}
                  onPress={() => void social(provider)}
                  style={s.socialButton}
                >
                  <Icon name={provider} size={25} />
                  <Txt style={{ fontSize: 14, fontWeight: '700' }}>
                    {provider === 'google'
                      ? L('تابع باستخدام Google', 'Continue with Google')
                      : L('تابع باستخدام Apple', 'Continue with Apple')}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <Txt style={s.terms}>
              {L('بمتابعتك، أنت توافق على شروط الاستخدام\nوسياسة الخصوصية.', 'By continuing, you agree to the terms of use\nand privacy policy.')}
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
