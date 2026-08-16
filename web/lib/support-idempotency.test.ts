import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "./kv";
import {
  claimSupportRequest,
  completeSupportRequest,
} from "./support-idempotency";

describe("支援單防重送", () => {
  beforeEach(() => __resetForTests());

  it("第一個請求取得 claim，重送時讀回處理中狀態", async () => {
    await expect(claimSupportRequest("user-1", "request-12345678", "SUP-ONE")).resolves.toBeNull();
    await expect(claimSupportRequest("user-1", "request-12345678", "SUP-TWO")).resolves.toEqual({
      ticketId: "SUP-ONE",
      status: "processing",
    });
  });

  it("完成後重送會拿到原本的支援單號", async () => {
    await claimSupportRequest("user-1", "request-12345678", "SUP-ONE");
    await completeSupportRequest("user-1", "request-12345678", "SUP-ONE");
    await expect(claimSupportRequest("user-1", "request-12345678", "SUP-TWO")).resolves.toEqual({
      ticketId: "SUP-ONE",
      status: "sent",
    });
  });
});
