# Demo Transcript

Fresh verification run: 2026-06-15.

Commands run from `researcher-reputation-anomaly-guard/`:

```bash
npm run check
npm test
npm run demo
```

Observed output:

```text
4 tests passed
Wrote reports
Risky status: hold_reputation_badges
Audit digest: 9e0a152011f4be2e67389f701d6b73e630a21a387f6e7d44bd73ac13c5c2a3a0
```

The demo writes the reviewer packet, markdown report, and SVG summary under `reports/`. The branch also includes `reports/demo.avi` from `npm run demo:video`.

All data is synthetic; no profile service, identity provider, analytics, payment, GitHub, or external API calls are made.
