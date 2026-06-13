# Grant Compute Budget Guard

This module contributes to SCIBASE issue #20, Revenue Infrastructure.

It evaluates AI compute usage before the platform converts usage into billable spend. The guard checks grant award validity, billing holds, usage budgets, institutional invoice requirements, and high-margin overage rules so research teams do not accidentally create unrecoverable compute charges.

## Local Verification

```bash
npm test
npm run demo
```

The demo data is synthetic and does not call payment processors, cloud providers, or grant systems.
