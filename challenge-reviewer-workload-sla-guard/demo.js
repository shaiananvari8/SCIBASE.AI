const fs = require("node:fs");
const path = require("node:path");
const { evaluateChallengeReviewerWorkload, renderMarkdown, renderSvg } = require("./index");
const { riskyChallenge, cleanChallenge } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const riskyResult = evaluateChallengeReviewerWorkload(riskyChallenge);
const cleanResult = evaluateChallengeReviewerWorkload(cleanChallenge);

fs.writeFileSync(
  path.join(reportsDir, "workload-review-packet.json"),
  `${JSON.stringify({ riskyResult, cleanResult }, null, 2)}\n`
);
fs.writeFileSync(path.join(reportsDir, "workload-review-report.md"), renderMarkdown(riskyResult));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(riskyResult));

console.log(
  [
    `status=${riskyResult.summary.status}`,
    `blockers=${riskyResult.summary.blockers}`,
    `warnings=${riskyResult.summary.warnings}`,
    `capacityGaps=${riskyResult.summary.criteriaWithCapacityGaps}`,
    `digest=${riskyResult.auditDigest.slice(0, 16)}`
  ].join(" ")
);
