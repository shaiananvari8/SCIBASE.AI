# Negative-Evidence Graph Guard Report

Issue: SCIBASE.AI#17
Claim marker: `/claim #17`
Status: `block_publication`
Digest: `b245bc907bb0911addeb552f2bd24ed4c51e6f895cceca6840a3985df1af39ac`

## Reviewer Checklist
- Every public recommendation has an explicit evidence chain.
- Retracted evidence blocks dependent graph paths.
- Contradictory evidence opens a curator review before publication.
- Failed replication evidence downgrades recommendations until resolved.
- Private or embargoed evidence is not leaked into public recommendation paths.

## Counts
- Claims inspected: 4
- Recommendations inspected: 2
- Blockers: 5
- Warnings: 1
- Held recommendations: 2

## Blockers
- retracted_evidence_in_graph_path: A graph path or recommendation still depends on retracted evidence.
- stale_negative_evidence_review: Negative evidence has been unresolved past the stale-review window.
- private_evidence_used_publicly: A public recommendation uses private or embargoed negative-evidence context.
- unresolved_contradictory_claims: Conflicting positive and negative evidence requires curator review before recommendations publish.
- failed_replication_without_curator_outcome: High-confidence failed replication evidence needs a curator outcome before graph boosts continue.

## Warnings
- missing_negative_evidence_doi: Negative evidence should keep a DOI or stable public source identifier before curator review.

## Recommendation Actions
- rec:recommend-gene-x-dataset: hold (private_evidence_for_public_recommendation, unresolved_conflict, failed_replication)
- rec:recommend-protocol-v2: hold (retracted_evidence)

## Required Actions
- request_curator_decision: Negative evidence is stale and still affects graph recommendations.
- open_conflict_review: Positive and negative evidence both exceed the publication hold threshold.
