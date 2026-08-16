export const STORE_DEMO_SANDBOX_SLUG = "uyao-demo";
export const STORE_DEMO_SOURCE_STORE_SLUG = "建利西藥房";

export function isStoreDemoSandbox(storeSlug: string): boolean {
  return storeSlug === STORE_DEMO_SANDBOX_SLUG;
}
