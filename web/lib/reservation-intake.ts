export const RESERVATION_INTAKE_QUERY_MAX = 160;
export const RESERVATION_INTAKE_NOTE_MAX = 500;
export const RESERVATION_INTAKE_ALLERGENS_MAX = 200;
export const RESERVATION_INTAKE_DRAFT_TTL_MS = 30 * 60 * 1000;
export const RESERVATION_INTAKE_STORAGE_KEY = "uyao.reservation-intake";

export interface ReservationIntake {
  source: "shop_search" | "reservation_note" | "allergen_check";
  allergyStatus: "none" | "has_allergies";
  allergens?: string;
  searchQuery?: string;
  note?: string;
  consentedAt: string;
}

export type ReservationIntakeSummary = Omit<ReservationIntake, "consentedAt">;

export interface ReservationIntakeDraft {
  drugSlug: string;
  searchQuery: string;
  capturedAt: number;
}

type IntakeResult =
  | { ok: true; intake?: ReservationIntake }
  | { ok: false; error: string };

function cleanText(raw: unknown, label: string, max: number): { value?: string; error?: string } {
  if (raw === undefined || raw === null || raw === "") return {};
  if (typeof raw !== "string") return { error: `${label}格式錯誤` };
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return {};
  if (Array.from(value).length > max) return { error: `${label}請控制在 ${max} 字內` };
  return { value };
}

/**
 * 每筆預留都要有過敏回答，且健康描述只在使用者明確同意時進入預留資料。
 * 來源與同意時間由伺服器產生，不信任 client 自報。
 */
export function parseReservationIntake(
  raw: unknown,
  now: () => Date = () => new Date(),
): IntakeResult {
  if (raw === undefined || raw === null) {
    return { ok: false, error: "請回答是否有已知過敏" };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "需求描述格式錯誤" };
  }
  const input = raw as Record<string, unknown>;
  const allergyStatus = input.allergyStatus;
  if (allergyStatus !== "none" && allergyStatus !== "has_allergies") {
    return { ok: false, error: "請回答是否有已知過敏" };
  }
  const allergens = cleanText(input.allergens, "過敏原", RESERVATION_INTAKE_ALLERGENS_MAX);
  if (allergens.error) return { ok: false, error: allergens.error };
  if (allergyStatus === "has_allergies" && !allergens.value) {
    return { ok: false, error: "請填寫已知過敏原" };
  }
  const query = cleanText(input.searchQuery, "搜尋內容", RESERVATION_INTAKE_QUERY_MAX);
  if (query.error) return { ok: false, error: query.error };
  const note = cleanText(input.note, "補充描述", RESERVATION_INTAKE_NOTE_MAX);
  if (note.error) return { ok: false, error: note.error };
  if (input.consent !== true) {
    return { ok: false, error: "請先同意把過敏資訊與需求描述提供給藥局" };
  }
  return {
    ok: true,
    intake: {
      source: query.value ? "shop_search" : note.value ? "reservation_note" : "allergen_check",
      allergyStatus,
      ...(allergyStatus === "has_allergies" ? { allergens: allergens.value } : {}),
      ...(query.value ? { searchQuery: query.value } : {}),
      ...(note.value ? { note: note.value } : {}),
      consentedAt: now().toISOString(),
    },
  };
}

export function createReservationIntakeDraft(
  searchQuery: string,
  drugSlug: string,
  capturedAt = Date.now(),
): ReservationIntakeDraft | null {
  const query = cleanText(searchQuery, "搜尋內容", RESERVATION_INTAKE_QUERY_MAX);
  if (!query.value || query.error || !drugSlug) return null;
  return { drugSlug, searchQuery: query.value, capturedAt };
}

/** 只讓同一品項在 30 分鐘內接續剛才的 Shop 搜尋，避免舊症狀黏到別張單。 */
export function readReservationIntakeDraft(
  raw: string | null,
  drugSlug: string,
  now = Date.now(),
): ReservationIntakeDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ReservationIntakeDraft>;
    if (
      value.drugSlug !== drugSlug
      || typeof value.searchQuery !== "string"
      || typeof value.capturedAt !== "number"
      || !Number.isFinite(value.capturedAt)
      || value.capturedAt > now
      || now - value.capturedAt > RESERVATION_INTAKE_DRAFT_TTL_MS
    ) return null;
    return createReservationIntakeDraft(value.searchQuery, value.drugSlug, value.capturedAt);
  } catch {
    return null;
  }
}
