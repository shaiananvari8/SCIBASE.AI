# Acceptance Notes

Reviewer acceptance checklist:

- The risky shared-device snapshot is held for purge or redaction.
- The borderline snapshot is allowed only with warnings.
- The ready snapshot is allowed.
- Audit digests are deterministic across repeated runs.
- Demo artifacts are generated locally from synthetic data only.

Validation commands:

```bash
npm run check
npm test
npm run demo
npm run demo:video
```
