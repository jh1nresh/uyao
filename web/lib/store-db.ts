import postgres from "postgres";

type StoreSql = ReturnType<typeof postgres>;

declare global {
  var __uyaoStoreSql: StoreSql | undefined;
}

export function isStoreDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function storeDb(): StoreSql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未設定");

  if (!globalThis.__uyaoStoreSql) {
    globalThis.__uyaoStoreSql = postgres(url, {
      max: 1,
      prepare: false,
      connect_timeout: 5,
      idle_timeout: 20,
    });
  }
  return globalThis.__uyaoStoreSql;
}

export async function closeStoreDb(): Promise<void> {
  if (!globalThis.__uyaoStoreSql) return;
  const sql = globalThis.__uyaoStoreSql;
  globalThis.__uyaoStoreSql = undefined;
  await sql.end({ timeout: 5 });
}
