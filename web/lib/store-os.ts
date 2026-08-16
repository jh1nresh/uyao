export type StoreAgentId = "manager" | "inventory" | "purchasing" | "checkout";

export interface StoreAgent {
  id: StoreAgentId;
  name: string;
  description: string;
  state: "online" | "working" | "approval" | "idle";
  stateLabel: string;
  summary: string;
}

export interface RestockStep {
  agentId: StoreAgentId;
  label: string;
  detail: string;
  state: "completed" | "organized" | "approval";
  stateLabel: string;
}

export interface AuditEntry {
  agentId: StoreAgentId;
  handoff: string;
  at: string;
  detail: string;
}

export interface RestockWorkItem {
  id: string;
  type: string;
  title: string;
  pharmacy: string;
  sourceCount: number;
  requiresApproval: boolean;
  approvalLabel: string;
  steps: readonly RestockStep[];
  draft: {
    product: string;
    quantity: number;
    supplier: string;
    priceCeiling: string;
    sent: boolean;
  };
  audit: readonly AuditEntry[];
}

export const STORE_AGENTS: readonly StoreAgent[] = [
  {
    id: "manager",
    name: "店長 Agent",
    description: "統整 4 件跨角色工作",
    state: "online",
    stateLabel: "在線",
    summary:
      "庫存 Agent 發現葉黃素的掃描與結帳差異。我請它先完成來源核對，再讓採購 Agent 依確認後的數量準備草稿。",
  },
  {
    id: "inventory",
    name: "庫存 Agent",
    description: "掃描與數量證據",
    state: "working",
    stateLabel: "處理中",
    summary:
      "我已核對三個來源：掃描 8、結帳 6、人工更正 1。這些是觀察證據，不代表精確庫存，仍需要藥局人員確認。",
  },
  {
    id: "purchasing",
    name: "採購 Agent",
    description: "補貨草稿與供應商",
    state: "approval",
    stateLabel: "等你批准",
    summary:
      "補貨草稿已建立，包含供應商、規格與 12 盒建議數量。目前只是固定草稿，尚未送出任何訂單。",
  },
  {
    id: "checkout",
    name: "結帳 Agent",
    description: "交易、收據與對帳",
    state: "idle",
    stateLabel: "待命",
    summary:
      "這張補貨工作不需要交易、退款或收據操作。我會保持待命，不取得這張工作不需要的權限。",
  },
] as const;

export const STORE_AGENTS_EN: readonly StoreAgent[] = [
  {
    id: "manager",
    name: "Manager Agent",
    description: "Coordinates cross-agent work",
    state: "online",
    stateLabel: "Online",
    summary:
      "The Inventory Agent found a mismatch between scans and checkout records for lutein. I asked it to verify the evidence before the Procurement Agent prepares a draft from the confirmed quantity.",
  },
  {
    id: "inventory",
    name: "Inventory Agent",
    description: "Scans and quantity evidence",
    state: "working",
    stateLabel: "Working",
    summary:
      "I checked three sources: 8 scans, 6 checkout records, and 1 manual correction. These are observations, not exact inventory; pharmacy staff still need to confirm the available quantity.",
  },
  {
    id: "purchasing",
    name: "Procurement Agent",
    description: "Restock drafts and suppliers",
    state: "approval",
    stateLabel: "Needs approval",
    summary:
      "The restock draft includes the supplier, package details, and a suggested quantity of 12 boxes. It is a fixed draft and no order has been sent.",
  },
  {
    id: "checkout",
    name: "Checkout Agent",
    description: "Transactions, receipts, and reconciliation",
    state: "idle",
    stateLabel: "Standing by",
    summary:
      "This restock task does not require a transaction, refund, or receipt action. I will remain on standby without receiving unnecessary permissions.",
  },
] as const;

export const RESTOCK_WORK_ITEM = {
  id: "WI-2031",
  type: "RESTOCK",
  title: "葉黃素低庫存處理",
  pharmacy: "安康藥局",
  sourceCount: 3,
  requiresApproval: true,
  approvalLabel: "採購送出前需要批准",
  steps: [
    {
      agentId: "inventory",
      label: "核對數量證據",
      detail: "掃描 8、結帳 6、人工更正 1；可用數量仍需人員確認。",
      state: "completed",
      stateLabel: "已完成",
    },
    {
      agentId: "manager",
      label: "形成店務判斷",
      detail: "保留 2 盒既有預留後，建議把補貨量設為 12 盒。",
      state: "organized",
      stateLabel: "已整理",
    },
    {
      agentId: "purchasing",
      label: "準備補貨草稿",
      detail: "供應商、規格與交期已列出；尚未送出訂單。",
      state: "approval",
      stateLabel: "等你批准",
    },
  ] satisfies readonly RestockStep[],
  draft: {
    product: "葉黃素 30 顆",
    quantity: 12,
    supplier: "示範供應商（待藥局確認）",
    priceCeiling: "尚未提供",
    sent: false,
  },
  audit: [
    {
      agentId: "inventory",
      handoff: "庫存 → 店長",
      at: "09:10",
      detail: "已附上掃描、結帳與更正來源。",
    },
    {
      agentId: "manager",
      handoff: "店長 → 採購",
      at: "09:12",
      detail: "只允許建立草稿，不允許送出。",
    },
    {
      agentId: "purchasing",
      handoff: "採購 → 你",
      at: "09:14",
      detail: "草稿完成，等待供應商與數量批准。",
    },
    {
      agentId: "checkout",
      handoff: "結帳 Agent",
      at: "待命",
      detail: "本工作不需要交易或退款。",
    },
  ] satisfies readonly AuditEntry[],
} as const;

export const RESTOCK_WORK_ITEM_EN: RestockWorkItem = {
  id: "WI-2031",
  type: "RESTOCK",
  title: "Low-stock review for lutein",
  pharmacy: "Ankang Pharmacy",
  sourceCount: 3,
  requiresApproval: true,
  approvalLabel: "Approval required before submitting procurement",
  steps: [
    {
      agentId: "inventory",
      label: "Review quantity evidence",
      detail: "8 scans, 6 checkout records, and 1 manual correction; staff must still confirm the available quantity.",
      state: "completed",
      stateLabel: "Completed",
    },
    {
      agentId: "manager",
      label: "Form an operational decision",
      detail: "After reserving 2 boxes for existing pickups, the suggested restock quantity is 12 boxes.",
      state: "organized",
      stateLabel: "Organized",
    },
    {
      agentId: "purchasing",
      label: "Prepare a restock draft",
      detail: "The supplier, package details, and lead time are listed; no order has been sent.",
      state: "approval",
      stateLabel: "Needs approval",
    },
  ],
  draft: {
    product: "Lutein, 30 count",
    quantity: 12,
    supplier: "Demo supplier (pharmacy confirmation required)",
    priceCeiling: "Not provided",
    sent: false,
  },
  audit: [
    {
      agentId: "inventory",
      handoff: "Inventory → Manager",
      at: "09:10",
      detail: "Attached scan, checkout, and correction evidence.",
    },
    {
      agentId: "manager",
      handoff: "Manager → Procurement",
      at: "09:12",
      detail: "Draft creation only; submission is not authorized.",
    },
    {
      agentId: "purchasing",
      handoff: "Procurement → You",
      at: "09:14",
      detail: "Draft ready; waiting for supplier and quantity approval.",
    },
    {
      agentId: "checkout",
      handoff: "Checkout Agent",
      at: "Standby",
      detail: "No transaction or refund is needed for this task.",
    },
  ],
};

export function storeAgent(id: StoreAgentId): StoreAgent {
  const agent = STORE_AGENTS.find((candidate) => candidate.id === id);
  if (!agent) throw new Error(`Unknown Store Agent: ${id}`);
  return agent;
}

export function storeAgentCopy(id: StoreAgentId, locale: "zh" | "en"): StoreAgent {
  if (locale === "zh") return storeAgent(id);
  const agent = STORE_AGENTS_EN.find((candidate) => candidate.id === id);
  if (!agent) throw new Error(`Unknown Store Agent: ${id}`);
  return agent;
}

export function storeWorkItemCopy(locale: "zh" | "en"): RestockWorkItem {
  return locale === "en" ? RESTOCK_WORK_ITEM_EN : RESTOCK_WORK_ITEM;
}

export function isStoreAgentAvailable(id: StoreAgentId, demoMode: boolean): boolean {
  return id === "manager" || demoMode;
}
