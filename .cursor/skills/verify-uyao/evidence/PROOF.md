# Proof run

Local storeOS, path `reservation-inbox`. Ran from repo root after `launch` became ready on port 43100.

```bash
.cursor/skills/verify-uyao/bin/verify-uyao doctor
.cursor/skills/verify-uyao/bin/verify-uyao launch
.cursor/skills/verify-uyao/bin/verify-uyao drive reservation-inbox
.cursor/skills/verify-uyao/bin/verify-uyao screenshot
.cursor/skills/verify-uyao/bin/verify-uyao snapshot
.cursor/skills/verify-uyao/bin/verify-uyao cleanup
```

Observed after drive: heading `需要你`, pending code `A-482`, confirm button visible, store name `uYao 示範藥局`, URL `http://127.0.0.1:43100/store-os-preview`.

Artifacts (still present after cleanup):

- `reservation-inbox/drive.png`
- `reservation-inbox/drive.aria.json`
- `reservation-inbox/screenshot.png`
- `reservation-inbox/snapshot.aria.json`

Cleanup killed only pids 3846 (Chrome) and 3797 (Next). Evidence was not deleted.
