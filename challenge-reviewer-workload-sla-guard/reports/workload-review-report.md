# Challenge Reviewer Workload SLA Report

Challenge: Private climate-model challenge final review (sci-bounty-review-2026-05)
Status: hold_review_window
Audit digest: 4eeac8cabcce4c5cb4bb5f428e6a7da88c6fd46586d57f163c096207e5c1237f

## Decision Summary

| Metric | Value |
| --- | ---: |
| Blockers | 9 |
| Warnings | 3 |
| Open review assignments | 5 |
| Criteria with capacity gaps | 3 |
| Active arbitrators | 1 |

## Reviewer Load

| Reviewer | Open | Utilization | State |
| --- | ---: | ---: | --- |
| Ada River | 2 | 130% | overloaded |
| Ben Cross | 1 | 75% | unavailable |
| Cora Field | 1 | 56% | available |
| Drew Lane | 1 | 63% | unavailable |
| Eli Stone | 0 | 100% | overloaded |

## Rubric Coverage

| Criterion | Eligible Reviewers | Required | Decision |
| --- | ---: | ---: | --- |
| Forecast skill and uncertainty | 1 | 2 | gap |
| Machine-learning validation | 1 | 2 | gap |
| Reproducibility package | 0 | 2 | gap |

## Blockers

- assigned_reviewer_overloaded: Ada River is above reviewer capacity policy.
- assigned_reviewer_unavailable: Ben Cross cannot complete an assigned challenge review.
- critical_stale_review: Ben Cross has a 32-hour stale challenge review.
- assigned_reviewer_unavailable: Drew Lane cannot complete an assigned challenge review.
- critical_stale_review: Drew Lane has a 49-hour stale challenge review.
- criterion_capacity_gap: Forecast skill and uncertainty has 1 eligible reviewers, below the required 2.
- criterion_capacity_gap: Machine-learning validation has 1 eligible reviewers, below the required 2.
- criterion_capacity_gap: Reproducibility package has 0 eligible reviewers, below the required 2.
- arbitration_backup_gap: Challenge lacks two active, under-capacity arbitration reviewers.

## Escalation Plan

- critical: Reassign blocked reviews to eligible backups before sponsor scoring opens. Owner: challenge-ops-lead.
- critical: Hold award release and request same-day replacement review or arbitration signoff. Owner: challenge-ops-lead.
- critical: Reassign blocked reviews to eligible backups before sponsor scoring opens. Owner: challenge-ops-lead.
- critical: Hold award release and request same-day replacement review or arbitration signoff. Owner: challenge-ops-lead.
- high: Recruit additional eligible reviewers for uncovered rubric criteria. Owner: challenge-ops-lead.
- high: Recruit additional eligible reviewers for uncovered rubric criteria. Owner: challenge-ops-lead.
- high: Recruit additional eligible reviewers for uncovered rubric criteria. Owner: challenge-ops-lead.
- high: Name a conflict-free backup arbitrator before any contested decision is released. Owner: challenge-ops-lead.
- medium: Keep a standby reviewer warm for near-capacity assignments. Owner: challenge-ops-lead.
- medium: Send due-soon reminders with a replacement deadline. Owner: challenge-ops-lead.

Synthetic data only. No private reviewer records, payment rails, identity systems, or external services are used.
