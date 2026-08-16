"use client";

import { useEffect, useState, type FormEvent } from "react";

import { BrandMark } from "@/components/BrandMark";

import styles from "./StoreOsLogin.module.css";

export function StoreOsLogin({ configured }: { configured: boolean }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("invite");
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) setInviteToken(token);
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
      ? await response.json().catch(() => ({ error: "登入失敗，請稍後再試" })) as { error?: string }
      : { error: "無法連上登入服務" };
    setError(result.error ?? "登入失敗，請稍後再試");
    setSubmitting(false);
  }

  if (inviteToken) return <StoreOsActivate token={inviteToken} configured={configured} />;

  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        <header>
          <BrandMark size={34} />
          <div><strong>uYao Store</strong><span>店家工作台</span></div>
        </header>
        <div className={styles.intro}>
          <p>STORE ACCESS</p>
          <h1>登入你的藥局</h1>
          <span>查看客戶預留單號與最新處理狀態。</span>
        </div>
        <form onSubmit={submit}>
          <label>
            <span>Email</span>
            <input name="username" type="email" autoComplete="username" required disabled={!configured} />
          </label>
          <label>
            <span>密碼</span>
            <input name="password" type="password" autoComplete="current-password" required disabled={!configured} />
          </label>
          <button type="submit" disabled={!configured || submitting}>
            {submitting ? "登入中…" : "登入 Store OS"}
          </button>
        </form>
        {!configured && (
          <p className={styles.setupNotice}>這個環境尚未設定店家帳號，登入目前停用。</p>
        )}
        <p className={styles.error} role="alert" aria-live="polite">{error}</p>
        <footer>登入後只會顯示你所屬門市的預留資料。</footer>
      </section>
    </main>
  );
}

export function StoreOsActivate({ token, configured }: { token: string; configured: boolean }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || submitting) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("passwordConfirm") ?? "")) {
      setError("兩次輸入的密碼不同");
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
      ? await response.json().catch(() => ({ error: "開通失敗，請稍後再試" })) as { error?: string }
      : { error: "無法連上開通服務" };
    setError(result.error ?? "開通失敗，請稍後再試");
    setSubmitting(false);
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        <header>
          <BrandMark size={34} />
          <div><strong>uYao Store</strong><span>店家開通</span></div>
        </header>
        <div className={styles.intro}>
          <p>PHARMACY INVITE</p>
          <h1>建立店家帳號</h1>
          <span>完成後，這個帳號只會進入邀請所屬的藥局。</span>
        </div>
        <form onSubmit={submit}>
          <label><span>你的姓名</span><input name="displayName" autoComplete="name" required disabled={!configured} /></label>
          <label><span>設定密碼（至少 12 個字元）</span><input name="password" type="password" autoComplete="new-password" minLength={12} required disabled={!configured} /></label>
          <label><span>再次輸入密碼</span><input name="passwordConfirm" type="password" autoComplete="new-password" minLength={12} required disabled={!configured} /></label>
          <button type="submit" disabled={!configured || submitting}>{submitting ? "開通中…" : "開通 Store OS"}</button>
        </form>
        {!configured && <p className={styles.setupNotice}>這個環境尚未啟用店家開通。</p>}
        <p className={styles.error} role="alert" aria-live="polite">{error}</p>
        <footer>邀請只能使用一次，過期或撤銷後會自動失效。</footer>
      </section>
    </main>
  );
}
