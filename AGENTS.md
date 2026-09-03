# Codex skill routing

When a user request matches an available skill, use that skill before acting. When uncertain, inspect the skill catalog and choose the smallest relevant set.

- Non-trivial repository implementation, verification, or PR work: `founder-engineering-workflow`
- Visual direction, density, hierarchy, or anti-AI-slop judgment: `design-taste`
- Rendered visual QA and iterative design fixes: `design-review`
- Bugs and unexpected behavior: `debug-program`
- Security-sensitive changes or scans: use the relevant `codex-security:*` skill
- iOS or SwiftUI changes: use the relevant `build-ios-apps:*` skill
- Documents, slides, spreadsheets, PDFs, or image generation: use the matching artifact skill

Keep skill use scoped. Do not invoke extra skills or add workflow files when they do not change the result.
