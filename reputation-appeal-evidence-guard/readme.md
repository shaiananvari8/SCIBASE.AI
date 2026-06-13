# Reputation Appeal Evidence Guard

This module contributes to SCIBASE issue #15, the Community & User Reputation System.

It evaluates appeals against reputation penalties or reinstatement requests before they can alter public trust signals. The guard checks that each appeal has enough evidence, independent reviewers, an on-time decision path, a clear requested outcome, and bounded probation when reputation is restored.

## What It Produces

- A deterministic appeal evaluation packet.
- Hold/release decisions for each appeal.
- Reviewer checklist text for the pull request.
- Demo report artifacts under `reports/`.

## Local Verification

```bash
npm test
npm run demo
```

The demo data is synthetic and does not include private user records, institutional credentials, or external services.
