import { describe, expect, it } from "vitest";

import { allStores, previewDrugsForStore } from "./data";
import {
  getStoreDemoSandbox,
  STORE_DEMO_SANDBOX_SLUG,
  STORE_DEMO_STORE,
} from "./store-demo";

describe("dedicated demo pharmacy", () => {
  it("never enters the real pharmacy dataset", () => {
    expect(allStores().some((store) => store.slug === STORE_DEMO_SANDBOX_SLUG)).toBe(false);
    expect(getStoreDemoSandbox(STORE_DEMO_SANDBOX_SLUG)).toBe(STORE_DEMO_STORE);
  });

  it("has a standalone synthetic shelf", () => {
    const items = previewDrugsForStore(STORE_DEMO_STORE);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.store.slug === STORE_DEMO_SANDBOX_SLUG)).toBe(true);
  });
});
