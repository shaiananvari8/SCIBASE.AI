# Repository Version Tag Governor Report

Synthetic semantic tag governance packet for SCIBASE issue #10.

## Summary

| Packet | Status | Blocked | Manual Review | Approved | Digest |
| --- | --- | ---: | ---: | ---: | --- |
| mixed | hold_tag_publication | 1 | 1 | 1 | 9dc7b2c8ec29 |
| ready | ready | 0 | 0 | 1 | 1c36ac737eb4 |

## Proposal Decisions

### reused-preprint-tag: block_release_tag
- blocker version_tag_collision: preprint-v2.0 already points to a different commit or DOI.
- blocker non_monotonic_version_tag: preprint-v2.0 does not advance beyond the latest preprint version.
- blocker metadata_version_drift: metadata.json version preprint-v1.9 does not match tag preprint-v2.0.
- blocker doi_metadata_mismatch: Repository DOI and metadata DOI differ for the proposed version.
- blocker artifact_hashes_missing: Missing hash locks for data.
- blocker fork_attribution_missing: Derived repository release lacks parent project attribution.
- warning citation_version_stale: Citation text references preprint-v1.9 instead of preprint-v2.0.
- warning results_hash_missing: Results output hash is absent for a reproducibility-bearing tag.
- warning changelog_entry_missing: No changelog entry is attached to the proposed tag.

### minor-release-needs-review: manual_review_tag
- warning citation_version_stale: Citation text references v1.2.0 instead of v1.3.0.
- warning results_hash_missing: Results output hash is absent for a reproducibility-bearing tag.
- warning changelog_entry_missing: No changelog entry is attached to the proposed tag.

### major-release-ready: approve_tag

## Non-Overlap Notes

This module focuses on semantic version tag governance and citation-version integrity before publication. It does not implement repository foundations, a broad integrity ledger, release readiness, DOI tombstones, restore rehearsal, access review, environment drift, merge queue governance, retention legal holds, sensitive artifact scanning, license compatibility, branch lineage, component-owner approval, or export contracts.
