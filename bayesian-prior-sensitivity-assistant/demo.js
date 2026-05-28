"use strict";

const fs = require("fs");
const path = require("path");
const { assessBayesianPriorSensitivity } = require("./index");
const { mixedBayesianReviewPacket, readyBayesianReviewPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = {
  mixed: assessBayesianPriorSensitivity(mixedBayesianReviewPacket),
  ready: assessBayesianPriorSensitivity(readyBayesianReviewPacket)
};

fs.writeFileSync(path.join(reportsDir, "bayesian-prior-sensitivity-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "bayesian-prior-sensitivity-report.md"), renderMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(packet));

console.log(`Wrote ${path.relative(process.cwd(), reportsDir)}`);
console.log(`Mixed packet status: ${packet.mixed.status}`);
console.log(`Audit digest: ${packet.mixed.auditDigest}`);

function renderMarkdown(packet) {
  const lines = [
    "# Bayesian Prior Sensitivity Assistant Report",
    "",
    "Synthetic auto peer-review packet for SCIBASE issue #16.",
    "",
    "## Summary",
    "",
    "| Packet | Status | Major | Minor | Ready | Digest |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    `| mixed | ${packet.mixed.status} | ${packet.mixed.summary.major} | ${packet.mixed.summary.minor} | ${packet.mixed.summary.ready} | ${packet.mixed.auditDigest.slice(0, 12)} |`,
    `| ready | ${packet.ready.status} | ${packet.ready.summary.major} | ${packet.ready.summary.minor} | ${packet.ready.summary.ready} | ${packet.ready.auditDigest.slice(0, 12)} |`,
    "",
    "## Analysis Decisions",
    ""
  ];

  for (const analysis of packet.mixed.analyses) {
    lines.push(`### ${analysis.analysisId}: ${analysis.decision}`);
    for (const blocker of analysis.blockers) {
      lines.push(`- blocker ${blocker.code}: ${blocker.message}`);
    }
    for (const warning of analysis.warnings) {
      lines.push(`- warning ${warning.code}: ${warning.message}`);
    }
    lines.push("");
  }

  lines.push("## Non-Overlap Notes", "");
  lines.push(
    "This module focuses specifically on Bayesian prior sensitivity, convergence diagnostics, prior predictive checks, and posterior claim calibration. It does not implement a broad assistant suite, multiple-comparison correction, generic statistical consistency checks, study power feasibility, uncertainty tone review, prompt safety, literature freshness, image integrity, external validity, or protocol trace workflows."
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const mixed = packet.mixed.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" role="img" aria-label="Bayesian prior sensitivity summary">
  <rect width="760" height="340" fill="#f7f7fb"/>
  <rect x="32" y="32" width="696" height="276" rx="8" fill="#ffffff" stroke="#d7dce5"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#172033">Bayesian prior sensitivity assistant</text>
  <text x="56" y="106" font-family="Arial, sans-serif" font-size="14" fill="#526173">Auto peer-review red flags for posterior robustness</text>
  ${bar(56, 154, "Major revision", mixed.major, "#b91c1c")}
  ${bar(56, 214, "Minor revision", mixed.minor, "#b7791f")}
  ${bar(56, 274, "Ready", mixed.ready, "#15803d")}
  <text x="548" y="294" font-family="Arial, sans-serif" font-size="12" fill="#526173">Digest ${packet.mixed.auditDigest.slice(0, 16)}</text>
</svg>
`;
}

function bar(x, y, label, count, color) {
  const width = Math.max(24, count * 120);
  return [
    `  <text x="${x}" y="${y - 14}" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#172033">${label}</text>`,
    `  <rect x="${x}" y="${y}" width="360" height="24" rx="4" fill="#e8edf4"/>`,
    `  <rect x="${x}" y="${y}" width="${width}" height="24" rx="4" fill="${color}"/>`,
    `  <text x="${x + 382}" y="${y + 17}" font-family="Arial, sans-serif" font-size="13" fill="#172033">${count} analysis item(s)</text>`
  ].join("\n");
}
