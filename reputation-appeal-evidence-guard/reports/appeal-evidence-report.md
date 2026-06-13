# Reputation Appeal Evidence Guard Report

Issue: SCIBASE.AI#15
Claim marker: `/claim #15`
Status: `hold_reputation_change`
Digest: `63127cd902d761c84395f0c2c5bf2491a6b6011195e74a7259d94411fb0ceb2c`

## Reviewer Checklist
- Appeals reference an existing reputation profile and sanction.
- Each appeal has the configured evidence threshold.
- Independent reviewers disclose no conflicts.
- Original penalty actors do not decide their own appeals.
- Reinstatement probation stays bounded by policy.

## Blockers
- insufficient_evidence: Appeal does not include enough evidence for peer validation.
- insufficient_independent_review: Appeal does not have enough independent conflict-free reviewers.
- same_actor_reappeal: Original decision actor cannot also decide the appeal.
- appeal_window_expired: Appeal was submitted outside the configured appeal window.
- probation_too_long: Reinstatement probation exceeds the configured maximum.

## Appeal Decisions
- app-duplicate-credit: release
- app-review-abuse: hold (insufficient_evidence, insufficient_independent_review, same_actor_reappeal, appeal_window_expired, probation_too_long)
