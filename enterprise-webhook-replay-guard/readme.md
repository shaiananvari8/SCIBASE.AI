# Enterprise Webhook Replay Guard

This module is a focused SCIBASE.AI issue #19 submission for Enterprise Tooling.

It validates synthetic enterprise integration delivery packets before webhook, API, or export events are replayed to institutional systems. The guard catches duplicate event ids, reused idempotency keys, repeated signature digests, stale retries, non-monotonic destination streams, and out-of-order export completion acknowledgements.

## What It Covers

- Idempotency keys for enterprise webhook retries.
- Replay detection across event ids, delivery ids, and signature digests.
- Monotonic event sequencing by destination and stream.
- Retry age windows for institutional sync safety.
- Export-completed events requiring ordered manifests and destination acknowledgement.

## What It Does Not Do

- No live webhook delivery, network calls, credentials, private payloads, or external systems.
- No event schema redaction or PII minimization module is reimplemented.
- No dashboard accessibility, policy training, repository sync, journal style, or vendor-contract guard is reimplemented.

## Reviewer Path

```bash
npm run check
npm test
npm run demo
```

Generated reviewer artifacts:

- `reports/webhook-replay-packet.json`
- `reports/webhook-replay-report.md`
- `reports/summary.svg`

## Claim

Use `/claim #19` in the pull request body.
