# Challenge Reviewer Workload SLA Guard

This is a focused Scientific Bounty System slice for issue #18. It validates whether a challenge has enough active, under-capacity scientific reviewers and arbitrators before live sponsor scoring, arbitration, or award release proceeds.

The guard evaluates:

- reviewer availability, blackout windows, stale activity, open assignment count, and weekly review capacity
- overdue and critically stale challenge reviews
- rubric-criterion coverage by active reviewers with matching expertise
- arbitration backup coverage for contested scientific bounty decisions
- escalation actions when review windows should be held before payout or public award announcements

It is intentionally separate from existing #18 slices for intake, rubric readiness, scoring, arbitration ledgers, appeal flows, anti-collusion, escrow settlement, payout eligibility, sponsor reliability, amendment consent, reviewer consensus, IP redaction, milestone progress, evidence freeze, data-room access, clarification freeze, award transparency, benchmark leakage, deliverable acceptance, reproducibility environment, cancellation/no-award, license/dependency checks, human-subjects review, solver withdrawal, embargo release, and evaluator calibration.

## Verification

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

`npm run demo` generates:

- `reports/workload-review-packet.json`
- `reports/workload-review-report.md`
- `reports/summary.svg`
- `reports/demo-transcript.md`

`npm run demo:video` generates:

- `reports/demo.avi`

## Safety

All examples use synthetic challenge, reviewer, and assignment records. This module does not call identity services, payment systems, private review dashboards, email systems, challenge workspaces, or external APIs.