# Support Agent

Support Agent is the in-workspace helper for Store OS product questions. Common questions are answered in-panel; anything else can become a human email ticket.

## Sub-features

- `support-open` opens the support panel from the sidebar.
- `support-faq` answers a canned question without leaving Store OS.
- `support-compose` accepts a free-text question in `輸入問題`.
- `support-ticket` offers `建立真人支援單` with a reply email when no FAQ matches.

## How to get to it (user POV)

- In the Store Agents sidebar, click `支援 Agent` (`aria-label="支援 Agent · 待命"`).
- The main pane becomes region `uYao 支援` with `今天需要我協助什麼？` and `常見問題`.

## Driving it with verify-uyao

Preconditions:

- Preview or signed-in workspace is up.
- Isolated profile so the panel is Chinese.

- **Open support.** Run `verify-uyao drive support-agent`. The support region is visible and `aria-hidden` is false.
- **Ask a FAQ.** The driver clicks `Store OS 關閉後怎麼收到新工作？`. An agent bubble (`data-role="agent"`) answers that work notifications live in account settings and Store OS remains the source of truth.
- **Human ticket (optional).** Type a question that is not in the FAQ list, send it, and the escalation form `建立真人支援單` appears with `回覆 Email`. Preview pre-fills `demo@uyaohealth.com`. Do not submit a ticket against production unless the run is explicitly authorized.
- **Proof.** Screenshot and snapshot showing the FAQ answer in the support panel.

## Gotchas

- The support panel stays in the DOM when inactive (`data-active="false"`, `aria-hidden="true"`). Assert `data-active="true"` or visible copy, not mere presence.
- Do not type patient, prescription, or full phone data. The UI forbids it.
- Ticket POST hits `/api/store/support` and needs a session plus email wiring. Preview may error; that is not a FAQ-path failure.
