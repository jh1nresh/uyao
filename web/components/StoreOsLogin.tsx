"use client";

import { useState, type FormEvent } from "react";

import { BrandMark } from "@/components/BrandMark";

import styles from "./StoreOsLogin.module.css";

export function StoreOsLogin({ configured }: { configured: boolean }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
            <span>帳號</span>
            <input name="username" type="text" autoComplete="username" required disabled={!configured} />
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
