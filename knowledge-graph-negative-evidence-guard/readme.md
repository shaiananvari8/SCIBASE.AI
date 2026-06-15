# Knowledge Graph Negative-Evidence Guard

This module is a focused SCIBASE.AI issue #17 submission for Scientific Knowledge Graph Integration.

It prevents public graph recommendations from quietly routing around negative scientific evidence. The guard inspects synthetic knowledge-graph packets for contradictions, retractions, failed replications, stale unresolved review windows, and private or embargoed negative evidence before entity pages or recommendation edges publish.

## What It Covers

- Retractions or withdrawn evidence blocking dependent graph paths.
- Conflicting positive and negative evidence requiring curator review.
- High-confidence failed replications downgrading recommendations until resolved.
- Public recommendations refusing private or embargoed evidence chains.
- Reviewer packets that explain blockers, required actions, and recommendation decisions.

## What It Does Not Do

- No live research data is read.
- No external ontology, DOI, storage, payment, or private repository APIs are called.
- No credentials, personal data, private manuscripts, or private datasets are included.
- No broad entity-extraction system is reimplemented; this is a safety gate for negative evidence and recommendation publication.

## Reviewer Path

```bash
npm run check
npm test
npm run demo
```

Generated reviewer artifacts:

- `reports/negative-evidence-packet.json`
- `reports/negative-evidence-report.md`
- `reports/summary.svg`
- `reports/demo-transcript.md`

## Claim

The PR conversation includes `/claim #17` for Algora detection.
