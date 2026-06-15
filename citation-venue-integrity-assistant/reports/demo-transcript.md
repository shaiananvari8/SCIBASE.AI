# Demo Transcript

Fresh verification run: 2026-06-15.

Commands run from `citation-venue-integrity-assistant/`:

```bash
npm run check
npm test
npm run demo
```

Observed output:

```text
4 tests passed
Wrote reports
Mixed packet status: hold_citation_insertions
Audit digest: 5caac840675042c84c372dc48270207d3d1fc9ead899f20c4a319b4551abb63f
```

The demo writes the reviewer packet, markdown report, and SVG summary under `reports/`. The branch also includes `reports/demo.avi` from `npm run demo:video`.

All data is synthetic; no Crossref, PubMed, Semantic Scholar, publisher, manuscript-system, or external API calls are made.
