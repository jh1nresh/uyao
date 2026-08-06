import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "./kv";
import { checkReservation, clientIp } from "./rate-limit";

const req = (ip: string) =>
  ({ headers: { get: (k: string) => (k === "x-forwarded-for" ? ip : null) } }) as Request;

beforeEach(() => __resetForTests());

/**
 * 每一筆成功預留都會推一則 LINE 到藥局老闆手機。沒有節流的話一個迴圈
 * 就能把他洗版到封鎖我們 —— 那是這個產品最不能失去的東西。
 */
describe("預留節流", () => {
  it("同一支手機超過額度就擋", async () => {
    const ok: boolean[] = [];
    for (let i = 0; i < 7; i += 1) {
      ok.push((await checkReservation(req("1.1.1.1"), "0912345678")).ok);
    }
    expect(ok.filter(Boolean).length).toBeLessThan(7);
    expect(ok[0]).toBe(true);
    expect(ok.at(-1)).toBe(false);
  });

  it("換手機號也擋得住 —— 號碼只驗格式不驗真偽，真正的閘門是 IP", async () => {
    let blocked = false;
    for (let i = 0; i < 30; i += 1) {
      const r = await checkReservation(req("2.2.2.2"), `09000000${String(i).padStart(2, "0")}`);
      if (!r.ok) { blocked = true; break; }
    }
    expect(blocked).toBe(true);
  });

  it("示範單另外從嚴 —— demo 旗標是使用者傳的，能對任何已綁定藥局發卡片", async () => {
    const demoOk: boolean[] = [];
    for (let i = 0; i < 5; i += 1) {
      demoOk.push((await checkReservation(req("3.3.3.3"), `09111111${i}1`, true)).ok);
    }
    // 示範額度必須比真單嚴格
    const realOk: boolean[] = [];
    __resetForTests();
    for (let i = 0; i < 5; i += 1) {
      realOk.push((await checkReservation(req("3.3.3.3"), `09222222${i}1`, false)).ok);
    }
    expect(demoOk.filter(Boolean).length).toBeLessThan(realOk.filter(Boolean).length);
  });

  it("不同 IP 互不影響", async () => {
    for (let i = 0; i < 25; i += 1) {
      await checkReservation(req("4.4.4.4"), `09333333${String(i).padStart(2, "0")}`);
    }
    expect((await checkReservation(req("5.5.5.5"), "0944444444")).ok).toBe(true);
  });

  it("被擋時要給 retry-after，不能讓人不知道等多久", async () => {
    let last = { ok: true, retryAfterSec: 0 };
    for (let i = 0; i < 10; i += 1) {
      last = await checkReservation(req("6.6.6.6"), "0912345678");
    }
    expect(last.ok).toBe(false);
    expect(last.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("取用戶 IP", () => {
  it("x-forwarded-for 取最靠近使用者的第一個", () => {
    expect(clientIp(req("9.9.9.9, 10.0.0.1, 10.0.0.2"))).toBe("9.9.9.9");
  });

  it("拿不到就回 unknown，不能 throw", () => {
    expect(clientIp({ headers: { get: () => null } } as unknown as Request)).toBe("unknown");
  });
});
