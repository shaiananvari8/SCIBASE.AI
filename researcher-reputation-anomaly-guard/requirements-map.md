# Requirements Map

| Issue #11 requirement | Coverage |
| --- | --- |
| Researcher profile citation and reputation metrics | Evaluates whether downloads, forks, endorsements, and reproducibility metrics can safely contribute to public profile scores. |
| Public vs private profile modes | Blocks public badges when profile visibility or anonymous-review participation would expose private activity. |
| Activity feed and recent project signals | Detects bursty or self-controlled activity before it appears as public reputation. |
| Role and object-level access context | Includes protected profile modes and anonymous-review contexts in badge decisions. |
| Project-level audit log | Emits deterministic reviewer actions and an audit digest for profile-metric review packets. |

## Non-Overlap

This is not a broad RBAC ledger, project provisioning module, profile sync/freshness module, anonymous-review escrow, data-room consent ledger, automation credential guard, visibility transition guard, or permission inheritance drift guard. It focuses narrowly on reputation metric abuse and badge-publication safety.
