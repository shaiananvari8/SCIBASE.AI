# Citation Venue Integrity Assistant Report

Synthetic reviewer packet for SCIBASE issue #13.

## Summary

| Packet | Status | Blocked | Warned | Allowed | Digest |
| --- | --- | ---: | ---: | ---: | --- |
| mixed | hold_citation_insertions | 1 | 1 | 1 | 5caac8406750 |
| ready | ready | 0 | 0 | 1 | 7ab969f5a134 |

## Candidate Decisions

### candidate-blocked: block_insertion
Venue: International Journal of Advanced Universal Science
Risk score: 100
- missing_peer_review_evidence: Venue does not provide clear peer-review evidence.
- implausible_acceptance_timeline: Acceptance timeline is 3 days.
- opaque_review_policy: Peer-review policy is not transparent enough for one-click insertion.
- disputed_indexing_claim: Venue claims indexing that the synthetic evidence marks as unverified.
- weak_indexing_evidence: Indexing confidence is 0.22.
- fake_impact_factor_signal: Venue evidence includes a fake impact-factor style signal.
- weak_editorial_board_evidence: 3 of 18 editorial board members are verified.
- board_membership_complaints: 2 editorial board membership complaint signals are present.
- paper_mill_template_signal: Venue or article metadata matches synthetic paper-mill template signals.
- special_issue_spike: Special issue volume spike needs human review before citation insertion.
- citation_ring_signal: Citation pattern suggests a narrow venue-level citation ring.
- hijacked_journal_identity_risk: Venue identity appears inconsistent with the canonical journal record.
- issn_identity_mismatch: ISSN evidence does not match the venue identity.
- poor_venue_scope_fit: Venue scope fit is 0.41.
- opaque_fee_disclosure: Article processing charge is not disclosed before submission.

### candidate-warning: warn_before_insertion
Venue: Applied Open Methods Forum
Risk score: 36
- weak_indexing_evidence: Indexing confidence is 0.64.
- weak_editorial_board_evidence: 7 of 12 editorial board members are verified.
- special_issue_spike: Special issue volume spike needs human review before citation insertion.

### candidate-ready: allow_insertion
Venue: Journal of Reproducible Research Software
Risk score: 0

## Non-Overlap Notes

This module checks venue-level trust for citation recommendations. It does not resolve duplicate reference metadata, decide whether a citation supports a claim, normalize citation style, scan live publisher databases, or mutate a manuscript.
