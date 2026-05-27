# Researcher Reputation Anomaly Guard Report

Synthetic reviewer packet for SCIBASE issue #11.

## Scenario Summary

| Scenario | Status | Held Researchers | Blockers | Warnings | Digest |
| --- | --- | ---: | ---: | ---: | --- |
| risky | hold_reputation_badges | 1 | 7 | 5 | 9e0a152011f4 |
| clean | ready | 0 | 0 | 0 | 72e09f87a8cf |
| stale | manual_review | 0 | 0 | 1 | db3aaba107f9 |

## Risky Profile Actions

- Hold download-derived badges until traffic provenance is reviewed.
- Require bot and same-network traffic review before publishing metrics.
- Show metric as provisional until institution diversity improves.
- Exclude suspect forks from reputation scoring and queue identity review.
- Down-rank fork-count badges until reuse evidence is available.
- Hold endorsement badges and require independent reviewer validation.
- Mark endorsement signal as provisional.
- Require independent reproducibility evidence before showing the score badge.
- Remove weak runs from score calculation.
- Hide reputation badges until profile visibility is reconciled.
- Aggregate endorsement counts before showing them on anonymous-review profiles.

## Non-Overlap Notes

This module evaluates metric abuse and public reputation badge safety. It does not sync ORCID/publication state, implement broad RBAC, issue automation credentials, manage anonymous review escrow, provision projects, or change live identity-provider state.
