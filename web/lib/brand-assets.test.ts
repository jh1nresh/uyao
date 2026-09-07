import { describe, expect, it } from "vitest";

describe("public brand identity", () => {
  it("keeps every icon frame and legacy public asset on the v4 artwork", async () => {
    // @ts-expect-error Asset tooling is an ES module outside the app TS build.
    const { verifyBrandAssets } = await import("../scripts/generate-brand-assets.mjs");
    expect(await verifyBrandAssets()).toEqual([]);
  });
});
