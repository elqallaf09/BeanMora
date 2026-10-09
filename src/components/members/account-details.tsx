"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  accountCountries,
  accountCountryFlag,
  loadAccountDetails,
  saveAccountDetails,
} from "@/lib/account-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountDetails({ owner }: { owner: string }) {
  const t = useTranslations(),
    locale = useLocale() === "ar" ? "ar" : "en",
    router = useRouter();
  const [country, setCountry] = useState(""),
    [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void loadAccountDetails(createClient(), owner)
      .then((data) => {
        if (active) {
          setCountry(data.country);
          setPhone(data.phone);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [owner, revision]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await saveAccountDetails(
        createClient(),
        owner,
        country,
        phone,
      );
      setPhone(result.phone);
      setNotice(t("settings.accountDetailsSaved"));
      router.refresh();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(
        t(
          code === "ACCOUNT_COUNTRY"
            ? "auth.chooseCountry"
            : code === "ACCOUNT_PHONE"
              ? "auth.phoneInvalid"
              : "settings.accountDetailsFailed",
        ),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      data-testid="account-details"
      className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <h2 className="font-bold">{t("settings.accountDetails")}</h2>
      <p className="text-sm text-[var(--color-muted-text)]">
        {t("settings.accountDetailsHint")}
      </p>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : failed ? (
        <Button variant="outline" onClick={() => setRevision((n) => n + 1)}>
          {t("common.retry")}
        </Button>
      ) : (
        <form onSubmit={save} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="account-country">{t("auth.countryLabel")}</Label>
            <select
              id="account-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={busy}
              className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3"
            >
              <option value="">{t("auth.chooseCountry")}</option>
              {[...accountCountries]
                .sort((a, b) => a[locale].localeCompare(b[locale], locale))
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {accountCountryFlag(c.code)} {c[locale]}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-phone">{t("auth.phoneLabel")}</Label>
            <Input
              id="account-phone"
              dir="ltr"
              type="tel"
              autoComplete="tel"
              maxLength={32}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
              placeholder="+96550000000"
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? t("common.loading") : t("common.save")}
          </Button>
        </form>
      )}
      {error ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-[var(--color-teal)]">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
