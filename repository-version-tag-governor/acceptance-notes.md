# Acceptance Notes

Reviewer acceptance checklist:

- A reused preprint tag that points to a different commit or DOI is blocked.
- Metadata version and DOI drift block publication.
- Missing required artifact hashes block release.
- Stale citation text, missing result hashes, and missing changelog entries require manual review.
- A fully aligned major release is approved.
- Audit digests are deterministic across repeated runs.
- Demo artifacts are generated locally from synthetic data only.

Validation commands:

```bash
npm run check
npm test
npm run demo
npm run demo:video
```
