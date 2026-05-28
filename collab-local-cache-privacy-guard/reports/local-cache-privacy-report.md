# Collaborative Local Cache Privacy Guard Report

Synthetic reviewer packet for SCIBASE issue #12.

## Summary

| Packet | Status | Purged | Warned | Allowed | Digest |
| --- | --- | ---: | ---: | ---: | --- |
| mixed | hold_local_cache | 1 | 1 | 1 | 1a716f6c9790 |
| ready | ready | 0 | 0 | 1 | e7974b371216 |

## Snapshot Decisions

### cache-risky: purge_or_redact_cache
- blocker unencrypted_restricted_cache: Restricted content is present in an unencrypted local cache snapshot.
- blocker restricted_localstorage_cache: Restricted scientific content is cached in long-lived localStorage.
- blocker restricted_text_cached: Restricted dataset or manuscript excerpts are present in local autosave text.
- blocker anonymous_review_identity_cached: 1 anonymous review marker(s) cache reviewer identity details.
- blocker restricted_notebook_output_cached: 1 cached notebook output(s) include restricted data.
- blocker private_collaborator_note_cached: 1 private collaborator note(s) are cached locally.
- blocker shared_device_cache_retention: Shared-device cache is retained for 10 hours.
- warning embargoed_title_cached: Embargoed section titles are cached locally.
- warning stale_notebook_output_cached: 1 cached notebook output(s) are stale.
- warning weak_device_lock_for_cache: Restricted cache exists on a device without screen-lock evidence.

### cache-warning: persist_with_warning
- warning stale_cache_snapshot: Cache snapshot is 54 hours old.
- warning embargoed_title_cached: Embargoed section titles are cached locally.
- warning stale_notebook_output_cached: 1 cached notebook output(s) are stale.

### cache-ready: allow_cache

## Non-Overlap Notes

This module checks privacy and retention of browser/local autosave payloads. It does not implement autosave restore planning, operation replay, offline conflict rebasing, presence broadcast privacy, notification fanout, reference merging, or section lock recovery.
