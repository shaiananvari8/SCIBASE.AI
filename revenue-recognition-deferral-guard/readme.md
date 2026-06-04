# Revenue Recognition Deferral Guard

This module is a focused SCIBASE.AI issue #20 submission for Revenue Infrastructure.

It validates synthetic finance-close packets before revenue is accepted as recognized. The guard checks annual subscription service periods, AI compute credit consumption, licensing/export delivery evidence, and allocation reconciliation so unearned amounts stay in deferred revenue until delivery is supported.

## What It Covers

- Performance obligation allocation reconciliation against invoice totals.
- Subscription revenue recognition based on elapsed service period.
- AI compute-credit revenue recognition only after consumption or expiry.
- Licensing/export revenue requiring delivery evidence before close.
- Deterministic finance remediation actions for held obligations.

## What It Does Not Do

- No processor, financial-account, tax-filing, invoice-send, refund-send, or external service calls.
- No personal billing data, cards, account numbers, payout details, or real customer records.
- No live SCIBASE revenue is read or mutated.
- No refund-liability, cancellation, priority-support, quote approval, or named-seat roster module is reimplemented.

## Reviewer Path

```bash
npm run check
npm test
npm run demo
```

Generated reviewer artifacts:

- `reports/revenue-recognition-packet.json`
- `reports/revenue-recognition-report.md`
- `reports/summary.svg`

## Claim

Use `/claim #20` in the pull request body.
