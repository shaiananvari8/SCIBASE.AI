# Acceptance Notes

## Reviewer Path

1. Start with `requirements-map.md` to see the issue #18 mapping and scope boundary.
2. Inspect `index.js` for the deterministic workload, coverage, stale review, and arbitration backup checks.
3. Inspect `sample-data.js` for synthetic risky and clean challenge packets.
4. Run `npm test` to verify hold, ready, warning, and digest behavior.
5. Run `npm run demo` and inspect `reports/workload-review-report.md` plus `reports/summary.svg`.
6. Run `npm run demo:video` to regenerate the short demo video at `reports/demo.avi`.

## Sponsor Outcome

The bounty poster gets a reviewable operations-control slice that prevents a scientific bounty from entering scoring or award release with unavailable reviewers, overloaded reviewers, stale reviews, uncovered rubric expertise, or missing arbitration backup. Clean challenge packets proceed, due-soon windows produce warnings, and unsafe packets produce explicit blockers plus escalation actions.

## Local Validation

- `npm run check`
- `npm test`
- `npm run demo`
- `npm run demo:video`
- `git diff --check`

## Data Handling

The module uses synthetic data only. It includes no private reviewer records, no solver identities, no credentials, no payment details, no external service calls, and no live challenge mutations.
