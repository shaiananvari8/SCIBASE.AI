# Repository Version Tag Governor

Synthetic, dependency-free semantic tag governance module for SCIBASE issue #10, Project Repository & Version Control.

This module evaluates repository release/preprint tag proposals before DOI, citation, or public release publication. It focuses on semantic version integrity, metadata alignment, artifact hash locks, and fork attribution.

## What It Checks

- supported `vX.Y.Z` and `preprint-vX.Y` tag formats
- version tag reuse or collision against existing history
- non-monotonic release and preprint versions
- `metadata.json` version drift
- DOI mismatch between release proposal and metadata
- stale generated citation version
- missing manuscript/data/code/metadata hash locks
- missing result hashes for reproducibility-bearing releases
- missing fork attribution for derived repository versions
- missing changelog evidence

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

The demo writes reviewer artifacts under `reports/`:

- `repository-version-tag-packet.json`
- `repository-version-tag-report.md`
- `summary.svg`
- `demo.avi`

## Safety

All records are synthetic. The module does not call external services, mutate Git state, inspect real repositories, or publish tags.
