# Bayesian Prior Sensitivity Assistant

Synthetic, dependency-free auto peer-review assistant for SCIBASE issue #16, AI-Powered Research Assistant Suite.

This module evaluates Bayesian analysis review packets for prior-sensitivity and posterior-robustness risks before an AI assistant promotes manuscript feedback to authors or reviewers.

## What It Checks

- priors used without manuscript disclosure
- informative priors without domain justification
- posterior direction flips under alternate priors
- large posterior shifts under prior sensitivity runs
- convergence failures, divergent transitions, and low effective sample size
- missing or weak prior predictive checks
- strong manuscript claims that are not robust across priors

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

The demo writes reviewer artifacts under `reports/`:

- `bayesian-prior-sensitivity-packet.json`
- `bayesian-prior-sensitivity-report.md`
- `summary.svg`
- `demo-transcript.md`
- `demo.avi`

## Safety

All records are synthetic. The module does not read local files outside this folder, call external services, execute notebooks, or process real manuscripts.