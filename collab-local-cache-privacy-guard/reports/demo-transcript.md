# Demo Transcript

Fresh verification run: 2026-06-15.

Commands run from `collab-local-cache-privacy-guard/`:

```bash
npm run check
npm test
npm run demo
```

Observed output:

```text
4 tests passed
Wrote reports
Mixed packet status: hold_local_cache
Audit digest: 1a716f6c979022f3ed9c43f10115cb7d83434c3f8bc56dcdd9f24ea76369cf96
```

The demo writes the reviewer packet, markdown report, and SVG summary under `reports/`. The branch also includes `reports/demo.avi` from `npm run demo:video`.

All data is synthetic; no browser storage, local files outside this module, live collaboration sessions, identity provider, or external API calls are made.
