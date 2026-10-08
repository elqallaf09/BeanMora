import { useContext, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Platform, Pressable, View } from "./native";
import { supabase } from "./client";
import { nativeAuthRedirect } from "./oauthCallback";
import { Action, Field, Icon, Language, Txt, colors, styles } from "./ui";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function AccountSecurity({ session }: { session: Session }) {
  const ar = useContext(Language) === "ar";
  const [panel, setPanel] = useState<"email" | "password" | null>(null);
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const currentEmail = session.user.email ?? "";
  const pendingEmail =
    session.user.new_email ||
    (requestedEmail !== currentEmail ? requestedEmail : "");
  const hasEmailPassword =
    session.user.app_metadata.provider === "email" ||
    session.user.identities?.some((i) => i.provider === "email");
  const redirect =
    Platform.OS === "web" ? window.location.origin : nativeAuthRedirect;

  const toggle = (next: "email" | "password") => {
    if (busy) return;
    setPanel((value) => (value === next ? null : next));
    setCurrent("");
    setPassword("");
    setConfirmation("");
    setNonce("");
    setNeedsNonce(false);
    setError("");
    setNotice("");
  };
  async function request(action: () => Promise<void>) {
    if (!supabase || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (failure) {
      const code =
        typeof failure === "object" && failure && "code" in failure
          ? String(failure.code)
          : "";
      const message = failure instanceof Error ? failure.message : "";
      setError(
        code === "invalid_credentials" || message.includes("Invalid login")
          ? ar
            ? "كلمة المرور الحالية غير صحيحة."
            : "The current password is incorrect."
          : code === "email_exists" ||
              message.includes("already been registered")
            ? ar
              ? "هذا البريد مستخدم لحساب آخر."
              : "This email belongs to another account."
            : code === "same_password"
              ? ar
                ? "اختر كلمة مرور مختلفة عن الحالية."
                : "Choose a password different from the current one."
              : code === "reauthentication_not_valid"
                ? ar
                  ? "رمز التحقق غير صحيح أو انتهت صلاحيته."
                  : "The verification code is incorrect or expired."
                : code === "weak_password"
                  ? ar
                    ? "اختر كلمة مرور أقوى، من 8 أحرف على الأقل."
                    : "Choose a stronger password with at least 8 characters."
                  : code.includes("rate_limit")
                    ? ar
                      ? "وصلت لحد المحاولات. انتظر قليلًا ثم حاول."
                      : "Too many attempts. Wait a moment and try again."
                    : ar
                      ? "تعذّر تأكيد التغيير. تحقق من الاتصال وأعد المحاولة."
                      : "Could not confirm the change. Check your connection and retry.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function verifyCurrentPassword() {
    if (!hasEmailPassword) return;
    if (!current) throw new Error("Invalid login");
    const { data, error } = await supabase!.auth.signInWithPassword({
      email: currentEmail,
      password: current,
    });
    if (error) throw error;
    if (data.user?.id !== session.user.id) throw new Error("ACCOUNT_MISMATCH");
  }
  async function changeEmail() {
    const next = email.trim().toLowerCase();
    if (!emailPattern.test(next) || next === currentEmail.toLowerCase()) {
      setError(
        ar
          ? "أدخل بريدًا صحيحًا مختلفًا عن بريدك الحالي."
          : "Enter a valid email different from your current one.",
      );
      return;
    }
    await request(async () => {
      await verifyCurrentPassword();
      const { data: verified, error: verificationError } =
        await supabase!.auth.getUser();
      if (verificationError) throw verificationError;
      if (verified.user?.id !== session.user.id)
        throw new Error("ACCOUNT_MISMATCH");
      const { error } = await supabase!.auth.updateUser(
        { email: next },
        { emailRedirectTo: redirect },
      );
      if (error) throw error;
      setRequestedEmail(next);
      setCurrent("");
      setEmail("");
      setPanel(null);
      setNotice(
        ar
          ? "أرسلنا طلب التغيير. افتح رسالة التأكيد في البريد الحالي والجديد إذا طُلب منك. يبقى بريدك الحالي حتى يكتمل التحقق."
          : "Confirmation requested. Open the confirmation emails in your current and new inboxes if required. Your current email remains until verification is complete.",
      );
    });
  }
  async function changePassword() {
    if (password.length < 8 || password !== confirmation) {
      setError(
        ar
          ? "استخدم 8 أحرف على الأقل وتأكد من تطابق كلمتي المرور."
          : "Use at least 8 characters and matching passwords.",
      );
      return;
    }
    if (needsNonce && !nonce.trim()) {
      setError(
        ar
          ? "أدخل رمز التحقق المرسل إلى بريدك."
          : "Enter the verification code sent to your email.",
      );
      return;
    }
    await request(async () => {
      await verifyCurrentPassword();
      const { data: verified, error: verificationError } =
        await supabase!.auth.getUser();
      if (verificationError) throw verificationError;
      if (verified.user?.id !== session.user.id)
        throw new Error("ACCOUNT_MISMATCH");
      const { error } = await supabase!.auth.updateUser({
        password,
        ...(hasEmailPassword ? { current_password: current } : {}),
        ...(needsNonce ? { nonce: nonce.trim() } : {}),
      });
      if (
        error?.code === "reauthentication_needed" ||
        (error && /reauthentication.*(needed|required)/i.test(error.message))
      ) {
        const { error: sendError } = await supabase!.auth.reauthenticate();
        if (sendError) throw sendError;
        setNeedsNonce(true);
        setNotice(
          ar
            ? "أرسلنا رمز تحقق إلى بريدك. أدخله لإكمال تغيير كلمة المرور."
            : "A verification code was sent to your email. Enter it to finish changing your password.",
        );
        return;
      }
      if (error) throw error;
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setNonce("");
      setNeedsNonce(false);
      setPanel(null);
      setNotice(
        ar ? "تم تغيير كلمة المرور بنجاح." : "Password changed successfully.",
      );
    });
  }
  return (
    <View testID="account-security" style={[styles.card, { gap: 14 }]}>
      <View style={[styles.row, { flexDirection: ar ? "row-reverse" : "row" }]}>
        <Icon name="lock" color={colors.teal} />
        <Txt heading style={styles.subtitle}>
          {ar ? "أمان الحساب" : "Account security"}
        </Txt>
      </View>
      <Txt style={styles.muted}>
        {ar
          ? "إدارة بريد الدخول وكلمة المرور."
          : "Manage your sign-in email and password."}
      </Txt>
      <SecurityRow
        label={ar ? "تغيير البريد الإلكتروني" : "Change email"}
        icon="mail"
        selected={panel === "email"}
        disabled={busy}
        onPress={() => toggle("email")}
      />
      {panel === "email" ? (
        <View style={{ gap: 12 }}>
          <Field
            label={ar ? "البريد الإلكتروني الجديد" : "New email"}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
          {hasEmailPassword ? (
            <Field
              label={ar ? "كلمة المرور الحالية" : "Current password"}
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
          ) : null}
          <Txt style={styles.muted}>
            {ar
              ? "التغيير يحتاج تأكيد ملكية البريد. لا يتغير بريد الدخول بمجرد إرسال الطلب."
              : "Verify ownership through the confirmation email. Sending a request does not change your sign-in email."}
          </Txt>
          <Action
            title={ar ? "إرسال رابط التأكيد" : "Send confirmation link"}
            selected
            disabled={busy || !email.trim() || (!!hasEmailPassword && !current)}
            onPress={() => void changeEmail()}
          />
        </View>
      ) : null}
      {pendingEmail ? (
        <View
          testID="pending-email-change"
          style={{
            padding: 12,
            backgroundColor: colors.chip,
            borderRadius: 12,
            gap: 8,
          }}
        >
          <Txt>
            {ar
              ? "تغيير البريد بانتظار التأكيد"
              : "Email change awaiting confirmation"}
          </Txt>
          <Txt
            style={{
              writingDirection: "ltr",
              textAlign: ar ? "right" : "left",
              fontSize: 14,
            }}
          >
            {pendingEmail}
          </Txt>
          <Action
            compact
            disabled={busy}
            title={ar ? "تحقق من التأكيد" : "Check confirmation"}
            onPress={() =>
              void request(async () => {
                const { data, error } = await supabase!.auth.getUser();
                if (error) throw error;
                if (data.user?.id !== session.user.id)
                  throw new Error("ACCOUNT_MISMATCH");
                if (data.user.email === pendingEmail) {
                  const { error: refreshError } =
                    await supabase!.auth.refreshSession();
                  if (refreshError) throw refreshError;
                  setRequestedEmail("");
                  setNotice(
                    ar
                      ? "تم تأكيد البريد الجديد."
                      : "Your new email is confirmed.",
                  );
                } else
                  setNotice(
                    ar
                      ? "لم يكتمل التأكيد بعد. راجع رسائل البريد الحالي والجديد."
                      : "Confirmation is still pending. Check your current and new inboxes.",
                  );
              })
            }
          />
        </View>
      ) : null}
      <SecurityRow
        label={ar ? "تغيير كلمة المرور" : "Change password"}
        icon="lock"
        selected={panel === "password"}
        disabled={busy}
        onPress={() => toggle("password")}
      />
      {panel === "password" ? (
        <View style={{ gap: 12 }}>
          {hasEmailPassword ? (
            <>
              <Field
                label={ar ? "كلمة المرور الحالية" : "Current password"}
                value={current}
                onChangeText={setCurrent}
                secureTextEntry
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Field
                label={ar ? "كلمة المرور الجديدة" : "New password"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Field
                label={
                  ar ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"
                }
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              {needsNonce ? (
                <Field
                  label={ar ? "رمز التحقق" : "Verification code"}
                  value={nonce}
                  onChangeText={setNonce}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="one-time-code"
                  editable={!busy}
                />
              ) : null}
              <Action
                selected
                disabled={busy || !current || !password || !confirmation}
                title={ar ? "حفظ كلمة المرور" : "Save password"}
                onPress={() => void changePassword()}
              />
            </>
          ) : (
            <Txt>
              {ar
                ? "دخلت عبر Google أو Apple. أرسل رابطًا إلى بريدك لتعيين كلمة مرور."
                : "You signed in with Google or Apple. Send a link to your email to set a password."}
            </Txt>
          )}
          <Action
            compact
            disabled={busy || !currentEmail}
            title={
              ar
                ? "إرسال رابط استرجاع كلمة المرور"
                : "Send password recovery link"
            }
            onPress={() =>
              void request(async () => {
                const { error } = await supabase!.auth.resetPasswordForEmail(
                  currentEmail,
                  { redirectTo: redirect },
                );
                if (error) throw error;
                setCurrent("");
                setPassword("");
                setConfirmation("");
                setNotice(
                  ar
                    ? "أرسلنا رابط تعيين كلمة المرور إلى بريدك."
                    : "A password reset link was sent to your email.",
                );
              })
            }
          />
        </View>
      ) : null}
      {busy ? (
        <Txt accessibilityRole="alert" style={styles.muted}>
          {ar ? "جارٍ التحقق…" : "Verifying…"}
        </Txt>
      ) : null}
      {error ? (
        <Txt accessibilityRole="alert" style={styles.error}>
          {error}
        </Txt>
      ) : null}
      {notice ? (
        <View accessibilityLiveRegion="polite">
          <Txt style={styles.success}>{notice}</Txt>
        </View>
      ) : null}
    </View>
  );
}

function SecurityRow({
  label,
  icon,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  icon: "mail" | "lock";
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const ar = useContext(Language) === "ar";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 52,
        flexDirection: ar ? "row-reverse" : "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: selected ? colors.teal : colors.line,
        borderRadius: 14,
      }}
    >
      <Icon name={icon} size={20} color={colors.teal} />
      <Txt style={{ flex: 1, fontWeight: "700" }}>{label}</Txt>
      <Icon name="arrow" size={18} color={colors.muted} />
    </Pressable>
  );
}
