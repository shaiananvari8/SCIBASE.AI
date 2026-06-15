# Demo Transcript

Fresh verification run: 2026-06-15.

Commands run from `repository-version-tag-governor/`:

```bash
npm run check
npm test
npm run demo
```

Observed output:

```text
4 tests passed
Wrote reports
Mixed packet status: hold_tag_publication
Audit digest: 9dc7b2c8ec29eb7ea6d6c580bf662d2030955576c69344176e6d2caf58bd38f9
```

The demo writes the reviewer packet, markdown report, and SVG summary under `reports/`. The branch also includes `reports/demo.avi` from `npm run demo:video`.

All data is synthetic; no Git state mutation, external service calls, real repository inspection, or tag publication occurs.
