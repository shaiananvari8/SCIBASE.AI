# Grant Compute Budget Guard Demo Transcript

Date verified: 2026-06-15

Commands run from `grant-compute-budget-guard`:

```bash
npm test
npm run demo
```

Test result:

```text
5 tests passed
0 tests failed
```

Demo output:

```json
{
  "status": "hold_billing",
  "digest": "a0876258828149a3de20dd81473f46891355c1b423bb7d3f71b81377dacf2d7a",
  "blockers": 6,
  "heldAccounts": 1,
  "reportsDir": "grant-compute-budget-guard/reports"
}
```

Generated reviewer artifacts:

- `reports/compute-budget-report.md`
- `reports/compute-budget-packet.json`
- `reports/summary.svg`
