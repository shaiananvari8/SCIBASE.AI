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
const reviewerPacket = buildReviewerPacket(packet, { asOf: packet.asOf });

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "revenue-recognition-packet.json"), `${JSON.stringify(reviewerPacket, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "revenue-recognition-report.md"), renderMarkdownReport(packet, { asOf: packet.asOf }));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvgSummary(packet, { asOf: packet.asOf }));

console.log(JSON.stringify({
  status: reviewerPacket.evaluation.status,
  digest: reviewerPacket.evaluation.digest,
  blockers: reviewerPacket.evaluation.totals.blockers,
  deferredCents: reviewerPacket.evaluation.totals.deferredCents,
  reportsDir
}, null, 2));
