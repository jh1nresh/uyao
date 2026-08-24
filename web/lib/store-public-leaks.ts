/**
 * Strings that must not appear on the Store public agent surface:
 * HTML, Markdown Accept, llms.txt, and store-host /openapi.json.
 */
export const STORE_PUBLIC_LEAK_PATTERNS = [
  { name: "intake", pattern: /intake/i },
  { name: "allergens", pattern: /allergens/i },
  { name: "phone/09 regex", pattern: /\^09|09\\d\{8\}/ },
  { name: "token", pattern: /\btokens?\b/i },
  { name: "inbox", pattern: /\binbox\b|收件匣/i },
  { name: "agentKey", pattern: /agentKey|x-uyao-agent-key/i },
  { name: "reservation write path", pattern: /\/api\/reservations/ },
  { name: "demand write path", pattern: /\/api\/demand/ },
  { name: "pilot write path", pattern: /\/api\/pilot/ },
] as const;

export function storePublicLeaks(body: string): string[] {
  return STORE_PUBLIC_LEAK_PATTERNS
    .filter(({ pattern }) => pattern.test(body))
    .map(({ name }) => name);
}
