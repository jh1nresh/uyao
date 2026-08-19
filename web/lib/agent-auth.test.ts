import { afterEach, describe, expect, it } from "vitest";

import { AGENT_KEY_HEADER, identifyAgent } from "./agent-auth";

const ORIGINAL = process.env.UYAO_AGENT_KEYS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.UYAO_AGENT_KEYS;
  else process.env.UYAO_AGENT_KEYS = ORIGINAL;
});

function req(key?: string): Request {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    headers: key ? { [AGENT_KEY_HEADER]: key } : {},
  });
}

describe("agent 金鑰", () => {
  it("認得出設定過的金鑰並回傳代號", () => {
    process.env.UYAO_AGENT_KEYS = "line-care:sk_care_1,line-refill:sk_refill_2";
    expect(identifyAgent(req("sk_care_1"))).toEqual({ id: "line-care" });
    expect(identifyAgent(req("sk_refill_2"))).toEqual({ id: "line-refill" });
  });

  it("沒設定就是沒有任何 agent 有權限", () => {
    delete process.env.UYAO_AGENT_KEYS;
    expect(identifyAgent(req("sk_care_1"))).toBeNull();
    process.env.UYAO_AGENT_KEYS = "";
    expect(identifyAgent(req("sk_care_1"))).toBeNull();
  });

  it("金鑰不對、沒帶、或只帶了代號都回 null", () => {
    process.env.UYAO_AGENT_KEYS = "line-care:sk_care_1";
    expect(identifyAgent(req("sk_care_2"))).toBeNull();
    expect(identifyAgent(req("sk_care_"))).toBeNull();
    expect(identifyAgent(req(""))).toBeNull();
    expect(identifyAgent(req())).toBeNull();
    // 代號不是祕密，拿它當金鑰不能通過
    expect(identifyAgent(req("line-care"))).toBeNull();
  });

  it("沒寫代號的設定仍可用，紀錄上標成 unnamed", () => {
    process.env.UYAO_AGENT_KEYS = "sk_bare";
    expect(identifyAgent(req("sk_bare"))).toEqual({ id: "unnamed" });
  });
});
