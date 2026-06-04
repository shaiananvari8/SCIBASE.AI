import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildReviewerPacket,
  demoPacket,
  renderMarkdownReport,
  renderSvgSummary
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(__dirname, "..");
const reportsDir = path.join(moduleRoot, "reports");
const now = "2026-06-04T00:00:00.000Z";
const packet = demoPacket();
const reviewerPacket = buildReviewerPacket(packet, { now });

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "negative-evidence-packet.json"), `${JSON.stringify(reviewerPacket, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "negative-evidence-report.md"), renderMarkdownReport(packet, { now }));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvgSummary(packet, { now }));

console.log(JSON.stringify({
  status: reviewerPacket.evaluation.status,
  digest: reviewerPacket.evaluation.digest,
  blockers: reviewerPacket.evaluation.counts.blockers,
  warnings: reviewerPacket.evaluation.counts.warnings,
  reportsDir
}, null, 2));
