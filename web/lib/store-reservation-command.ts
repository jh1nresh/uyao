export type StoreReservationAction = "confirm" | "reject" | "pickup";

export interface StoreReservationCommand {
  action: StoreReservationAction;
  code: string;
}

const COMMANDS: Array<[StoreReservationAction, RegExp]> = [
  ["confirm", /^(?:確認|確認有貨|有貨)\s*([a-z])[-\s]?(\d{3})$/i],
  ["reject", /^(?:缺貨|沒貨|無庫存|回報無庫存)\s*([a-z])[-\s]?(\d{3})$/i],
  ["pickup", /^(?:完成|已取|已領|取貨完成)\s*([a-z])[-\s]?(\d{3})$/i],
];

/** Deterministic Store OS commands: auditable actions, not free-form LLM intent. */
export function parseStoreReservationCommand(input: string): StoreReservationCommand | null {
  const cleaned = input.trim();
  for (const [action, pattern] of COMMANDS) {
    const match = pattern.exec(cleaned);
    if (match) return { action, code: `${match[1].toUpperCase()}-${match[2]}` };
  }
  return null;
}
