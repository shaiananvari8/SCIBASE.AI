# Enterprise Token Rotation Guard

This module contributes to SCIBASE issue #19, Enterprise Tooling.

It evaluates institutional API integrations before admins keep them active. The guard checks token rotation age, least-privilege scopes, active owner assignment, audit export recency, SSO group drift, and restricted-data approvals.

## Local Verification

```bash
npm test
npm run demo
```

The demo data is synthetic and does not contact SSO providers, institutional repositories, or production APIs.
