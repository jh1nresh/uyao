# uYao

**English** | [繁體中文](README.zh-TW.md)

uYao turns pharmacy inventory, expiry, and local demand signals into pharmacist-approved return, reorder, and reservation workflows. It connects to the pharmacy's existing scanner and POS workflow instead of replacing them.

- Company and pilot: [uyao.vercel.app](https://uyao.vercel.app)
- Consumer search: [shop-uyao.vercel.app](https://shop-uyao.vercel.app)

> uYao is currently a pilot prototype. Inventory shown without a live pharmacy scanner connection is simulated and must not be treated as confirmed real-time stock.

## How it works

```text
Pharmacy scanner → transparent scanner connector → pharmacy computer
                         └→ parse / offline spool → uYao API
                                                    ├→ inventory and expiry signals
                                                    ├→ action recommendations
                                                    └→ pharmacist approval in LINE

Consumer search → select pharmacy → reserve → pharmacy receives LINE alert → in-store pickup
```

## Repository

| Path | Purpose |
|---|---|
| `src/` | GS1 and EAN parsing, scan-session classification, USB HID forwarding, SQLite spool, and data tools |
| `web/` | Next.js company site, consumer search, pharmacy pilot flow, LINE reservations, and operations console |
| `setup/` | Raspberry Pi service, demo simulator, and YC demo runbook |
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
- LINE is the pharmacy approval and notification interface. The agent does not autonomously execute critical decisions.

## Documentation

- [Scanner box P1](specs/box-p1.md)
- [Web marketplace](specs/web-marketplace.md)
- [Company landing page](specs/company-landing-page.md)
- [Demand capture](specs/demand-capture.md)
- [Hardware options](specs/hardware-options.md)
- [YC demo runbook](setup/yc-demo-runbook.md)
- [Web development](web/README.md)
