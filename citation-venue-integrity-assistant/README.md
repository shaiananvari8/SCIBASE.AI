# Citation Venue Integrity Assistant

Synthetic, dependency-free assistant for SCIBASE issue #13, AI-Assisted Research Tools.

This module checks whether a citation recommendation should be inserted, warned, or blocked based on venue-level trust signals. It complements citation metadata and context-fit checks by asking a different question: is the journal or venue safe enough for the AI citation tool to recommend?

## What It Checks

- peer-review status and implausibly fast acceptance timelines
- disputed indexing claims and fake impact-factor signals
- editorial-board verification gaps and board membership complaints
- paper-mill template signals, special issue spikes, and citation rings
- hijacked journal identity risk and ISSN mismatches
- article-processing-charge transparency
- venue scope fit for the highlighted manuscript claim

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

The demo writes reviewer artifacts under `reports/`:

- `citation-venue-integrity-packet.json`
- `citation-venue-integrity-report.md`
- `summary.svg`
- `demo-transcript.md`
- `demo.avi`

## Safety

All records are synthetic. The module does not call Crossref, PubMed, Semantic Scholar, publisher sites, live journal lists, manuscript systems, or external services.