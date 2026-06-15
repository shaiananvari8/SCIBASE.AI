# Demo Transcript

Fresh verification run: 2026-06-15.

Commands run from `challenge-reviewer-workload-sla-guard/`:

```bash
npm run check
npm test
npm run demo
```

Observed output:

```text
challenge-reviewer-workload-sla-guard tests passed (4)
status=hold_review_window blockers=9 warnings=3 capacityGaps=3 digest=4eeac8cabcce4c5c
```

The demo writes the reviewer packet, markdown report, and SVG summary under `reports/`. The branch also includes `reports/demo.avi` from `npm run demo:video`.

All data is synthetic; no identity, reviewer, payment, challenge workspace, or external API calls are made.
