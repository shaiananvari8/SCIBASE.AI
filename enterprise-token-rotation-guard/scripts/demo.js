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
const packet = demoPacket();
const reviewerPacket = buildReviewerPacket(packet, { now: packet.generatedAt });

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "enterprise-token-packet.json"), `${JSON.stringify(reviewerPacket, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "enterprise-token-report.md"), renderMarkdownReport(packet, { now: packet.generatedAt }));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvgSummary(packet, { now: packet.generatedAt }));

console.log(JSON.stringify({
  status: reviewerPacket.evaluation.status,
  digest: reviewerPacket.evaluation.digest,
  blockers: reviewerPacket.evaluation.counts.blockers,
  heldIntegrations: reviewerPacket.evaluation.counts.heldIntegrations,
  reportsDir
}, null, 2));
