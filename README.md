# uYao

**English** | [繁體中文](README.zh-TW.md)

uYao is an AI operating system for independent pharmacies. It turns inventory, expiry, and local demand signals into return, reorder, and reservation work; pharmacists approve critical decisions in LINE, and the agent carries out only the authorized workflow and records the outcome. It connects to the pharmacy's existing scanner and POS workflow instead of replacing them or adding another daily dashboard.

- Company and pilot: [uyaohealth.com](https://uyaohealth.com)
- Consumer search: [shop.uyaohealth.com](https://shop.uyaohealth.com)

> uYao is currently a pilot prototype. Inventory shown without a live pharmacy scanner connection is simulated and must not be treated as confirmed real-time stock. Agent-to-supplier ordering is defined in the Pharmacy OS v1 spec and is not yet a production-live capability.

## How it works

```text
Pharmacy scanner ─→ transparent connector ─→ inventory / expiry observations ─┐
Consumer search ────────────────────────────→ local demand signals ────────────┤
                                                                                ▼
                                                                       uYao WorkItem
                                                                                ▼
                                                             pharmacist decision in LINE
                                                                                ▼
                                                         authorized workflow execution
                                                                                ▼
                                                    verified result → OutcomeReceipt
```

For reordering, the target loop continues from a pharmacist-approved, immutable order snapshot to agent transmission, supplier acknowledgement, receiving and invoice reconciliation. Any change to the product, quantity, supplier, price limit, or substitution policy requires approval again.

## Repository

| Path | Purpose |
|---|---|
| `src/` | GS1 and EAN parsing, scan-session classification, USB HID forwarding, SQLite spool, and data tools |
| `web/` | Next.js company site, consumer search, pharmacy pilot flow, LINE reservations, and operations console |
| `setup/` | Raspberry Pi service and local pipeline simulator |
| `specs/` | Product, hardware, demand-capture, and web specifications |
| `tests/` | Scanner pipeline tests |

## Quick start

### Scanner pipeline

```bash
python3 -m pip install -e ".[dev]"
python3 -m pytest -q
```

### Web

```bash
cd web
npm ci
npm run dev        # http://localhost:3100
npm run test
npm run typecheck
```

## Product boundaries

- The scanner connector observes and forwards scans; it does not replace the pharmacy POS.
- GS1 DataMatrix can carry GTIN, expiry, and batch data. A typical one-dimensional barcode does not contain complete expiry or batch data.
- A scan proves that an item was recently observed, not the pharmacy's exact on-hand quantity.
- The consumer product supports nearby search, reservation, and in-store pickup. It does not provide a shopping cart, online payment, delivery, or prescription-drug transactions.
- Pharmacists keep decision authority in LINE; routine work should not require logging into another dashboard.
- The agent executes only an approved snapshot or a future revocable, bounded delegation policy. Anything outside those limits returns to the pharmacist for approval.

## Documentation

- [Pharmacy OS v1 phases](specs/pharmacy-os-v1.md)
- [Scanner box P1](specs/box-p1.md)
- [Web marketplace](specs/web-marketplace.md)
- [Company landing page](specs/company-landing-page.md)
- [Demand capture](specs/demand-capture.md)
- [Hardware options](specs/hardware-options.md)
- [Web development](web/README.md)
