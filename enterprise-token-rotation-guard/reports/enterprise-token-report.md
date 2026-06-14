# Enterprise Token Rotation Guard Report

Issue: SCIBASE.AI#19
Claim marker: `/claim #19`
Status: `hold_integration`
Digest: `e8c0d01bc2dfd3d313262b963fc9babcd8ab9588f6ccba24526047ed6453fb6b`

## Reviewer Checklist
- Integration tokens are inside the rotation window.
- Scopes are limited to the enterprise allowlist.
- Every integration has an active institutional owner.
- Audit exports are fresh before enterprise syncs.
- Restricted data integrations have DPA approval.

## Blockers
- orphan_owner: Integration owner is missing or inactive.
- stale_token: Integration token exceeds the rotation window.
- overbroad_scopes: Integration has scopes outside the allowlist.
- stale_audit_export: Audit export is outside the recency window.
- sso_group_drift: SSO group drift exceeds policy.
- missing_dpa_approval: Restricted-data integration lacks DPA approval.

## Integration Decisions
- int-dspace-sync: keep_active
- int-hris-sync: hold (orphan_owner, stale_token, overbroad_scopes, stale_audit_export, sso_group_drift, missing_dpa_approval)
