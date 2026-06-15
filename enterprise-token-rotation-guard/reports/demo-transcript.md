# Enterprise Token Rotation Guard Demo Transcript

Date verified: 2026-06-15

Commands run from `enterprise-token-rotation-guard`:

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
  "status": "hold_integration",
  "digest": "e8c0d01bc2dfd3d313262b963fc9babcd8ab9588f6ccba24526047ed6453fb6b",
  "blockers": 6,
  "heldIntegrations": 1,
  "reportsDir": "enterprise-token-rotation-guard/reports"
}
```

Generated reviewer artifacts:

- `reports/enterprise-token-report.md`
- `reports/enterprise-token-packet.json`
- `reports/summary.svg`
