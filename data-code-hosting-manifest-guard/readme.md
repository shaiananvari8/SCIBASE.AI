# Data and Code Hosting Manifest Guard

This module is a focused implementation slice for SCIBASE issue #14, Scientific/Engineering Data & Code Hosting.

It evaluates a scientific project repository manifest before a data/code release is published. The guard checks:

- FAIR-style metadata presence, including DOI, license, authors, keywords, and schema version.
- Dataset and executable artifact registration.
- SHA-256 artifact hash locks.
- Dataset metadata schemas and code runtime declarations.
- Visibility, embargo release dates, and access policy shape.
- Executable environment definitions.
- Reproducibility commands and output digests.
- Versioning strategy, release tag, and diffable review paths.

The implementation is dependency-free and uses synthetic manifests only. It does not call external services, read private projects, mutate repositories, issue DOIs, upload files, or contact storage providers.

## Commands

```bash
npm run check
npm test
npm run demo
```

`npm run demo` writes a JSON packet, Markdown report, and SVG summary under `reports/`.
