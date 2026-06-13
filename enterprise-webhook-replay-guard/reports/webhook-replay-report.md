# Enterprise Webhook Replay Guard Report

Issue: SCIBASE.AI#19
Claim marker: `/claim #19`
Status: `block_delivery`
Digest: `26823509ad3c7d6dfc5ceecaf9c26be92fba665bfd348d8aa1e0bfac3f20c7d1`

## Reviewer Checklist
- Each enterprise event has a stable idempotency key.
- Duplicate event ids and repeated signature digests are held.
- Destination streams remain monotonic by destination and stream.
- Retry attempts outside the replay window are escalated.
- Export-completed events wait for ordered manifests and destination acknowledgement.

## Blockers
- duplicate_event_id: The same event id appears in multiple delivery records.
- reused_idempotency_key: The same idempotency key appears on multiple delivery records.
- signature_replay: The same signature digest appears on multiple events.
- stale_retry_window: Retry delivery is outside the allowed replay window.
- non_monotonic_sequence: Destination stream sequence is not monotonic.
- out_of_order_export_batch: Export batch sequence is not newer than the destination acknowledgement.
- missing_destination_acknowledgement: Export-completed event has no destination acknowledgement.
- missing_idempotency_key: Enterprise delivery requires an idempotency key.

## Event Decisions
- evt-project-created-001: deliver
- evt-project-created-001: hold (duplicate_event_id, reused_idempotency_key, signature_replay, stale_retry_window, non_monotonic_sequence)
- evt-export-043: hold (out_of_order_export_batch, missing_destination_acknowledgement)
- evt-lms-sync-009: hold (missing_idempotency_key)
