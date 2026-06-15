# Demo Transcript

Fresh verification run: 2026-06-15.

Commands run from `data-code-hosting-manifest-guard/`:

```bash
npm run check
npm test
npm run demo
```

Observed output:

```text
4 tests passed
status: block_publication
blockers: 10
warnings: 5
auditDigest: 777f3022d220fed8225ca1f9586d09274e35b149e2cd764a753769c72c8dd951
```

The demo writes the reviewer packet, markdown report, and SVG summary under `reports/`.

All data is synthetic; no credentials, private projects, external APIs, storage writes, DOI issuance, uploads, or repository mutations occur.
