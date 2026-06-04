# Revenue Recognition Deferral Guard Report

Issue: SCIBASE.AI#20
Claim marker: `/claim #20`
Status: `block_close`
Digest: `8b6865927e5e430b33924f2853f0d9c0e7c005bb6002eabd6250d82d57c0ebe2`

## Reviewer Checklist
- Invoice amount reconciles to performance obligation allocations.
- Subscription revenue is deferred until the service period is earned.
- Compute-credit revenue is recognized only on consumption or expiry.
- Licensing/export revenue has delivery evidence before close.
- Held obligations include deterministic remediation actions.

## Totals
- Contracts inspected: 2
- Obligations inspected: 3
- Allowed recognized revenue: $9088.00
- Deferred revenue: $23912.00
- Held obligations: 3
- Blockers: 6
- Warnings: 0

## Blockers
- premature_revenue_recognition: Revenue is recognized before the obligation is sufficiently delivered.
- premature_revenue_recognition: Revenue is recognized before the obligation is sufficiently delivered.
- usage_credits_recognized_before_consumption: Usage credit revenue exceeds consumed or expired value.
- missing_recognition_evidence: Recognized revenue lacks required delivery evidence.
- premature_revenue_recognition: Revenue is recognized before the obligation is sufficiently delivered.
- missing_recognition_evidence: Recognized revenue lacks required delivery evidence.

## Required Actions
- No finance actions required.

## Obligation Decisions
- contract:lab-annual-pro/obl:annual-subscription: hold; recognized $18000.00, allowed $7594.52, deferred $10405.48
- contract:lab-annual-pro/obl:compute-credits: hold; recognized $4500.00, allowed $1200.00, deferred $4800.00
- contract:consortium-license/obl:analytics-license-export: hold; recognized $9000.00, allowed $293.48, deferred $8706.52
