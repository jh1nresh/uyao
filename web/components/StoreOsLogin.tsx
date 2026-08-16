"use client";

import { useEffect, useState, type FormEvent } from "react";

import { BrandMark } from "@/components/BrandMark";
import type { Locale } from "@/lib/i18n";
import { parseStoreOsLocale, STORE_OS_LOCALE_STORAGE_KEY } from "@/lib/store-os-locale";

import styles from "./StoreOsLogin.module.css";

export function StoreOsLogin({ configured }: { configured: boolean }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("zh");
  const english = locale === "en";

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("invite");
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) setInviteToken(token);
    setLocale(parseStoreOsLocale(window.localStorage.getItem(STORE_OS_LOCALE_STORAGE_KEY)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || submitting) return;
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/store/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    }).catch(() => null);

    if (response?.ok) {
      window.location.reload();
      return;
    }

    const result = response
      ? await response.json().catch(() => ({ error: english ? "Sign-in failed. Please try again later." : "登入失敗，請稍後再試" })) as { error?: string }
      : { error: english ? "Unable to reach the sign-in service." : "無法連上登入服務" };
    const englishError = response?.status === 429
      ? "Too many attempts. Please try again in 15 minutes."
      : response?.status === 503
        ? "The sign-in service is temporarily unavailable."
        : "The email or password is incorrect.";
    setError(english ? englishError : (result.error ?? "登入失敗，請稍後再試"));
    setSubmitting(false);
  }

  if (inviteToken) return <StoreOsActivate token={inviteToken} configured={configured} locale={locale} />;

  return (
    <main className={styles.screen} lang={english ? "en" : "zh-Hant-TW"}>
      <section className={styles.card}>
        <header>
          <BrandMark size={34} />
          <div><strong>uYao Store</strong><span>{english ? "Pharmacy workspace" : "店家工作台"}</span></div>
        </header>
        <div className={styles.intro}>
          <p>STORE ACCESS</p>
          <h1>{english ? "Sign in to your pharmacy" : "登入你的藥局"}</h1>
          <span>{english ? "Review customer reservation codes and their latest status." : "查看客戶預留單號與最新處理狀態。"}</span>
        </div>
        <form onSubmit={submit}>
          <label>
            <span>Email</span>
            <input name="username" type="email" autoComplete="username" required disabled={!configured} />
          </label>
          <label>
            <span>{english ? "Password" : "密碼"}</span>
            <input name="password" type="password" autoComplete="current-password" required disabled={!configured} />
          </label>
          <button type="submit" disabled={!configured || submitting}>
            {submitting ? (english ? "Signing in…" : "登入中…") : (english ? "Sign in to StoreOS" : "登入 Store OS")}
          </button>
        </form>
        {!configured && (
          <p className={styles.setupNotice}>{english ? "Store accounts are not configured in this environment, so sign-in is disabled." : "這個環境尚未設定店家帳號，登入目前停用。"}</p>
        )}
        <p className={styles.error} role="alert" aria-live="polite">{error}</p>
        <footer>{english ? "After signing in, you will only see reservations for your assigned store." : "登入後只會顯示你所屬門市的預留資料。"}</footer>
      </section>
    </main>
  );
}

export function StoreOsActivate({ token, configured, locale = "zh" }: { token: string; configured: boolean; locale?: Locale }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const english = locale === "en";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || submitting) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("passwordConfirm") ?? "")) {
      setError(english ? "The passwords do not match." : "兩次輸入的密碼不同");
      return;
    }
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/store/auth/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, displayName: form.get("displayName"), password }),
    }).catch(() => null);
    if (response?.ok) {
      window.location.replace("/");
      return;
    }
    const result = response
      ? await response.json().catch(() => ({ error: english ? "Activation failed. Please try again later." : "開通失敗，請稍後再試" })) as { error?: string }
      : { error: english ? "Unable to reach the activation service." : "無法連上開通服務" };
    const englishError = response?.status === 429
      ? "Too many attempts. Please try again in 15 minutes."
      : response?.status === 410
        ? "This invitation has expired."
        : response?.status === 409
          ? "An account already exists for this invitation."
          : response?.status === 422
            ? "The invitation or account details are invalid."
            : response?.status === 503
              ? "The activation service is temporarily unavailable."
              : "Activation failed. Please try again later.";
    setError(english ? englishError : (result.error ?? "開通失敗，請稍後再試"));
    setSubmitting(false);
  }

  return (
    <main className={styles.screen} lang={english ? "en" : "zh-Hant-TW"}>
      <section className={styles.card}>
        <header>
          <BrandMark size={34} />
          <div><strong>uYao Store</strong><span>{english ? "Pharmacy activation" : "店家開通"}</span></div>
        </header>
        <div className={styles.intro}>
          <p>PHARMACY INVITE</p>
          <h1>{english ? "Create a store account" : "建立店家帳號"}</h1>
          <span>{english ? "Once activated, this account can only access the pharmacy linked to the invitation." : "完成後，這個帳號只會進入邀請所屬的藥局。"}</span>
        </div>
        <form onSubmit={submit}>
          <label><span>{english ? "Your name" : "你的姓名"}</span><input name="displayName" autoComplete="name" required disabled={!configured} /></label>
          <label><span>{english ? "Create a password (at least 12 characters)" : "設定密碼（至少 12 個字元）"}</span><input name="password" type="password" autoComplete="new-password" minLength={12} required disabled={!configured} /></label>
          <label><span>{english ? "Enter the password again" : "再次輸入密碼"}</span><input name="passwordConfirm" type="password" autoComplete="new-password" minLength={12} required disabled={!configured} /></label>
          <button type="submit" disabled={!configured || submitting}>{submitting ? (english ? "Activating…" : "開通中…") : (english ? "Activate StoreOS" : "開通 Store OS")}</button>
        </form>
        {!configured && <p className={styles.setupNotice}>{english ? "Store activation is not enabled in this environment." : "這個環境尚未啟用店家開通。"}</p>}
        <p className={styles.error} role="alert" aria-live="polite">{error}</p>
        <footer>{english ? "An invitation can only be used once and becomes invalid after it expires or is revoked." : "邀請只能使用一次，過期或撤銷後會自動失效。"}</footer>
      </section>
    </main>
  );
}
