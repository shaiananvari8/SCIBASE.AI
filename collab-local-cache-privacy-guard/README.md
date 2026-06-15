# Collaborative Local Cache Privacy Guard

Synthetic, dependency-free guard for SCIBASE issue #12, Real-Time Collaborative Editor.

This module evaluates whether browser/local autosave snapshots are safe to persist or offer for restore. It complements autosave recovery work by checking privacy, retention, and exposure risks before cache data is kept on a device.

## What It Checks

- restricted manuscript or dataset excerpts in local autosave text
- anonymous or double-anonymous reviewer identity leakage
- embargoed section titles cached locally
- stale or restricted notebook outputs
- private collaborator notes in recoverable cache payloads
- encryption and storage backend requirements
- shared-device retention windows and weak screen-lock posture

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

The demo writes reviewer artifacts under `reports/`:

- `local-cache-privacy-packet.json`
- `local-cache-privacy-report.md`
- `summary.svg`
- `demo-transcript.md`
- `demo.avi`

## Safety

All records are synthetic. The module does not read browser storage, local files outside this folder, real manuscripts, live collaboration sessions, identity providers, or external services.