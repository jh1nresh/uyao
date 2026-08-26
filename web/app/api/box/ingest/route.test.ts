import { beforeEach, describe, expect, it } from "vitest";

import { POST } from "./route";
import { __resetForTests } from "@/lib/kv";
import { lotsForStore } from "@/lib/lots";
import { allStores } from "@/lib/data";

/**
 * 這條路徑原本沒有測試 —— 於是 Python 端送上來的 expiry/batch 被
 * 靜默丟棄了一段時間（型別上根本沒有這兩個欄位）。這裡的重點不是
 * 覆蓋率，是釘住「盒子送什麼，雲端就要收什麼」這個合約。
 */

// SIM_GTIN_TO_DRUG 的第一支示範藥
const SIM_GTIN = "04712345678901";

function storeSlug(): string {
  const store = allStores()[0];
  if (!store) throw new Error("fixture 藥局資料是空的");
  return store.slug;
}

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/box/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** Python `ParsedScan.to_dict()` 的形狀。 */
function event(payload: Record<string, unknown>) {
  return {
    id: 1,
    ts: Date.now() / 1000,
    kind: "receiving",
    payload: {
      raw: "]d201047123456789011727103110TW881",
      symbology: "gs1_datamatrix",
      gtin: SIM_GTIN,
      expiry: null,
      batch: null,
      serial: null,
      ...payload,
    },
  };
}

describe("POST /api/box/ingest — 批號效期", () => {
  beforeEach(() => {
    __resetForTests();
  });

  it("persists expiry and batch from a GS1 DataMatrix scan", async () => {
    const slug = storeSlug();
    const res = await post({
      device_id: slug,
      events: [event({ expiry: "2027-06-01", batch: "TW881" })],
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { matched: number; lotsRecorded: number };
    expect(json.matched).toBe(1);
    expect(json.lotsRecorded).toBe(1);

    const lots = await lotsForStore(slug);
    expect(lots).toHaveLength(1);
    expect(lots[0].expiry).toBe("2027-06-01");
    expect(lots[0].batch).toBe("TW881");
  });

  it("still accepts scans with no expiry — that is the normal Taiwan 1D case", async () => {
    const slug = storeSlug();
    const res = await post({ device_id: slug, events: [event({})] });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { matched: number; lotsRecorded: number };
    // 掃描本身仍然算數，只是沒有批號可記
    expect(json.matched).toBe(1);
    expect(json.lotsRecorded).toBe(0);
    expect(await lotsForStore(slug)).toHaveLength(0);
  });

  it("ignores a batch without an expiry (nothing to schedule)", async () => {
    const slug = storeSlug();
    const res = await post({
      device_id: slug,
      events: [event({ batch: "TW881" })],
    });
    const json = (await res.json()) as { lotsRecorded: number };
    expect(json.lotsRecorded).toBe(0);
  });

  it("rejects a malformed expiry rather than storing a wrong return window", async () => {
    const slug = storeSlug();
    const res = await post({
      device_id: slug,
      events: [event({ expiry: "2026-02-31", batch: "TW881" })],
    });
    const json = (await res.json()) as { lotsRecorded: number };
    expect(json.lotsRecorded).toBe(0);
    expect(await lotsForStore(slug)).toHaveLength(0);
  });

  it("marks demo GTIN lots as demo so they never light a real lamp", async () => {
    const slug = storeSlug();
    await post({
      device_id: slug,
      events: [event({ expiry: "2027-06-01", batch: "TW881" })],
    });
    const lots = await lotsForStore(slug);
    // SIM_GTIN 是編造的測試碼 —— 必須維持 demo 標記
    expect(lots[0].demo).toBe(true);
  });

  it("deduplicates repeated scans of the same batch", async () => {
    const slug = storeSlug();
    const body = {
      device_id: slug,
      events: [event({ expiry: "2027-06-01", batch: "TW881" })],
    };
    await post(body);
    await post(body);
    expect(await lotsForStore(slug)).toHaveLength(1);
  });

  it("keeps unbound devices from writing lots", async () => {
    const res = await post({
      device_id: "not-a-real-store",
      events: [event({ expiry: "2027-06-01", batch: "TW881" })],
    });
    const json = (await res.json()) as { unbound?: boolean };
    expect(json.unbound).toBe(true);
    expect(await lotsForStore("not-a-real-store")).toHaveLength(0);
  });
});
