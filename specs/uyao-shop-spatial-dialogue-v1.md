# uYao Shop Spatial Dialogue v1

Status: approved for implementation

Surface: consumer Shop homepage

Visual anchors:

- [Static pearl homepage](./assets/uyao-shop-pearl-stage-truth-frame-v1.png)
- [Active spatial dialogue](./assets/uyao-shop-spatial-dialogue-truth-frame-v1.png)

## Goal

Keep the first visit as an indexable, useful catalog page. When the user enters a recognized symptom or a deterministic wellness need, transform the same page into a focused dialogue surface: the visible catalog cards move into inactive side wings, the original words remain editable, and one necessary question occupies the center.

The interaction should make the interface itself the visual output. It must not imply that moving, fading, or surviving cards are medical recommendations.

## V1 boundary

V1 does not call an LLM.

It uses the existing auditable `matchSymptom` map to prove the UI and state contract:

- exact product name or alias → preserve the native GET search;
- ordinary product, ingredient, or unknown query → preserve the native GET search;
- recognized safety-routed symptom → open the safety dialogue;
- recognized daily-wellness expansion → confirm intent, then show deterministic catalog matches;
- red flag or unresolved symptom → show professional handoff, never product results.

A future LLM may interpret language and select the next approved question. It must return typed state into this same UI contract; it must not become the source of product truth, safety policy, or live inventory.

## State model

```text
idle
  └─ first non-empty input ─→ composing
                                ├─ direct query + submit ───────→ native GET /search
                                ├─ symptom + submit ─→ safety question
  │               ├─ red flag ────────────────→ urgent professional handoff
  │               └─ no red flag ─────────────→ pharmacist handoff; no products
                                └─ wellness need + submit ─→ intent confirmation
                      ├─ active symptom ───────→ professional handoff
                      └─ daily wellness ───────→ deterministic product directions
```

## Idle page

- Preserve a real GET search form and no-JavaScript fallback.
- Keep the approved pearl wall, visible desktop horizon, restrained reflective floor, and continuous pearl-resin search capsule.
- Match the approved static truth frame: editorial promise and support copy, the search object, local pharmacy count, partner-pharmacy marquee, category pills, then four visible catalog cards.
- Catalog follows the partner-pharmacy marquee as a flat paper sheet.
- The first four visible catalog cards are the spatial-dialogue side-wing source.
- Restore the existing continuously moving partner-pharmacy marquee directly below the search stage and above the catalog. It pauses on hover, when offscreen, and under reduced motion; it must not be replaced by a static count line.

## Active spatial dialogue

- The first meaningful character begins the spatial transition immediately; the UI does not wait for form submission to reveal the composing surface.
- Partial input is not classified. The composing surface preserves live editing, and submit/Enter is the boundary that either continues through the native GET search or opens an approved safety/wellness question.
- During composing, the moved cards use the neutral label `目錄品項・暫時收起`; the UI must not call them candidates before classification.

### Desktop, 1280 px and wider

- Treat the active-dialogue truth frame as the required visual system, not a loose reference: warm pearl-white wall and floor, dark-green editorial type, translucent resin capsule, soft architectural shadows, restrained rounded corners, and no unrelated dark or dashboard styling.
- Use the shop-specific pearl header shown in the truth frame: serif `uYao 有藥` wordmark, tagline, plain area and language controls, and pharmacy CTA. Hide the global trial strip and dark-mode control on this homepage only; other consumer routes remain unchanged.
- Use a three-column stage: two inactive catalog cards on the left, a 700–740 px active center, and two inactive cards on the right.
- The four cards preserve their real image and name. Source status remains on the idle catalog and any final linked result, not on the decorative side wings.
- Side cards are not links during triage. Use reduced contrast and the label `候選品項・整理中`; do not add scores, rankings, prices, availability, or selection rings.
- The center contains:
  - compressed pearl query capsule with original input and `修改`;
  - progress label;
  - one question;
  - deterministic answer buttons;
  - a working supplemental-context field. Submitting extra context preserves the text and routes to professional confirmation because v1 does not interpret free-form follow-ups.
- Put the safety boundary below the stage in plain language; never imply that completing a symptom question unlocks a product.
- Focus moves to the question heading after the transition.

### Medium viewport

- Use one product rail beside the dialogue when space permits.
- Do not squeeze the center below a readable form width.

### Mobile

- Hide the decorative side wings.
- Keep the query capsule and one-question dialogue.
- Product directions appear below the conclusion only.
- Every control is at least 44 px high and the page has no horizontal overflow.

## Safety dialogue

Question:

> 目前有沒有呼吸困難、胸痛、咳血、意識不清，或症狀明顯惡化？

Actions:

- `以上都沒有`
- `有其中一項`

Both outcomes preserve the original symptom and use existing safety copy. Neither outcome reveals a product. A red-flag outcome uses the stronger safety treatment and directs the user to prompt medical help. A no-red-flag outcome explains that the described symptom still needs pharmacist or clinician assessment.

## Wellness dialogue and conclusion

Question:

> 你是在找日常保養資料，而不是處理正在發生的不舒服嗎？

Actions:

- `是，找日常保養`
- `不是，正在不舒服`

Only the first action unlocks deterministic catalog directions. Show at most three real catalog cards whose existing nutrition-focus or search-term fields match the approved static expansion. Copy must say:

> 以下是可與藥師確認的品項方向，不是治療或個人用藥推薦。

Each result is an explicit link to its real product page. Never auto-redirect, even when one item matches.

## Motion

- Motion communicates the state change, not medical confidence.
- Normal motion target: 480–600 ms using the existing brand easing.
- Side cards enter from the former catalog region toward their settled wings.
- The center surface fades and settles into place.
- Repeated input remounts the state cleanly without duplicate cards.
- Under `prefers-reduced-motion: reduce`, remove travel and keep an immediate cross-fade.

## Product and content invariants

- Preserve original input separately from extracted state.
- Preserve exact product identity, image classification, and existing product-page URLs.
- No diagnosis, dosage, suitability, ranking, live-stock assertion, price, checkout, or guaranteed availability.
- Symptom routes never use a product card as the conclusion.
- Daily-wellness results remain source-backed catalog relationships and require pharmacy confirmation.
- The truth frame's camera and microphone affordances remain absent until they perform real input capture. The implemented supplemental text field and send action must be real, not decorative.
- The existing search page remains the direct-search fallback and canonical result surface.

## Done when

- Idle homepage remains useful and searchable without JavaScript.
- Exact catalog names containing symptom words still go to native search.
- Recognized symptom input opens the spatial safety dialogue on the same page.
- Recognized wellness input can reach a bounded product-direction conclusion.
- Red-flag and unresolved-symptom paths show no products.
- Keyboard focus, back/modify, repeated submit, desktop, mobile, fixed pearl-light palette under a dark system preference, and reduced motion work.
- Focused tests cover query classification and deterministic candidates.
- Full web tests, typecheck, production build, rendered screenshots, and one replayable motion check pass.

## Human boundary

This implementation may be committed and pushed to the existing review PR. Merge and production deployment remain separate explicit actions.
