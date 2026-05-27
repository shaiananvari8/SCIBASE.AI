# Researcher Reputation Anomaly Guard

Synthetic, dependency-free reviewer module for SCIBASE issue #11, User & Project Management.

The guard evaluates whether public researcher reputation badges should be shown, held, or sent to manual review. It focuses on metric abuse rather than profile sync:

- download bursts from concentrated network clusters
- self-controlled or weakly verified fork rings
- reciprocal endorsement clusters and new same-affiliation endorsers
- reproducibility-score inflation from self or lab-controlled runs
- private or anonymous-review profile exposure risks
- stale metric evidence windows

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

The demo writes reviewer artifacts under `reports/`:

- `reputation-anomaly-packet.json`
- `reputation-anomaly-report.md`
- `summary.svg`
- `demo.avi`

## Safety

All scenarios are synthetic. The module does not call ORCID, SAML, OAuth, analytics providers, profile services, GitHub, identity providers, payment providers, or production project data.
