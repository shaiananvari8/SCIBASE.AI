# Grant Compute Budget Guard Report

Issue: SCIBASE.AI#20
Claim marker: `/claim #20`
Status: `hold_billing`
Digest: `a0876258828149a3de20dd81473f46891355c1b423bb7d3f71b81377dacf2d7a`

## Reviewer Checklist
- Grant-backed usage has an award id and active grant window.
- Institutional invoice accounts include purchase orders.
- Pending AI compute charges stay within approved budget limits.
- Billing holds stop invoices before revenue recognition.
- Compute usage preserves the configured gross margin floor.

## Blockers
- missing_award_id: Grant-backed account is missing an award id.
- expired_grant: Grant has expired before pending usage billing.
- grant_billing_hold: Grant is under a billing hold.
- missing_purchase_order: Institutional invoice account is missing a purchase order.
- budget_overage: Projected compute spend exceeds the configured budget limit.
- low_compute_margin: Pending usage falls below the minimum gross margin threshold.

## Account Decisions
- acct-lab-stable: bill
- acct-lab-hold: hold (missing_award_id, expired_grant, grant_billing_hold, missing_purchase_order, budget_overage, low_compute_margin)
