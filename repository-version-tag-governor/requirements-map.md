# Requirements Map

| Issue #10 requirement | Coverage |
| --- | --- |
| Semantic versioning | Validates `vX.Y.Z` and `preprint-vX.Y` formats plus monotonic version progression. |
| Hash-based integrity | Requires manuscript, data, code, metadata, and result hash evidence where relevant. |
| DOI assignment per tagged version | Blocks DOI and metadata DOI mismatch before publication. |
| Auto-generated citations | Flags stale citation versions that do not match the proposed tag. |
| Forking with attribution | Blocks derived releases that omit parent repository lineage. |
| Version history, rollback, tagging | Detects tag reuse and collision against prior tag history. |

## Non-Overlap

This is not a repository foundation module, broad integrity ledger, release readiness gate, DOI tombstone gate, restore rehearsal guard, access review, environment drift check, merge queue governance workflow, retention legal hold, sensitive artifact guard, license compatibility checker, branch hypothesis lineage gate, component-owner approval guard, or API export contract. It focuses narrowly on semantic tag governance and citation-version integrity.
