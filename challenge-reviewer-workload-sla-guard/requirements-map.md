# Requirements Map

| Issue #18 capability | Coverage in this slice |
| --- | --- |
| Platform-mediated arbitration system | Confirms the challenge has active, under-capacity arbitration backup before contested decisions can be released. |
| Optional third-party reviewers or peer validators | Validates reviewer availability, expertise, blackout windows, stale activity, assignment load, and review capacity. |
| Evaluation criteria and scoring rubric | Checks each rubric criterion has enough eligible scientific reviewers before live scoring opens. |
| Milestone deadlines | Flags due-soon, past-due, and critically stale review assignments against challenge review windows. |
| Feedback loop between submitters and sponsors | Produces deterministic escalation actions so challenge operations can reassign reviews before sponsor scoring or award communication. |
| Create trust on both sides | Holds award release when stale or overloaded review coverage could undermine solver and sponsor trust. |

## Non-Overlap Boundary

This submission focuses on reviewer workload, assignment capacity, stale review windows, and arbitration backup readiness for scientific bounty challenges. It does not implement a full marketplace, scoring engine, payout router, appeal ledger, data-room access guard, anti-collusion system, benchmark leakage detector, cancellation workflow, or evaluator calibration bench.
