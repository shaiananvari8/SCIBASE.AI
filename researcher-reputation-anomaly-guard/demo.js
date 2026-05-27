"use strict";

const fs = require("fs");
const path = require("path");
const { assessResearcherReputation } = require("./index");
const { riskySnapshot, cleanSnapshot, staleSnapshot } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = {
  risky: assessResearcherReputation(riskySnapshot),
  clean: assessResearcherReputation(cleanSnapshot),
  stale: assessResearcherReputation(staleSnapshot)
};

fs.writeFileSync(
  path.join(reportsDir, "reputation-anomaly-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`
);
fs.writeFileSync(path.join(reportsDir, "reputation-anomaly-report.md"), renderMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(packet));

console.log(`Wrote ${path.relative(process.cwd(), reportsDir)}`);
console.log(`Risky status: ${packet.risky.status}`);
console.log(`Audit digest: ${packet.risky.auditDigest}`);

function renderMarkdown(packet) {
  const lines = [
    "# Researcher Reputation Anomaly Guard Report",
    "",
    "Synthetic reviewer packet for SCIBASE issue #11.",
    "",
    "## Scenario Summary",
    "",
    "| Scenario | Status | Held Researchers | Blockers | Warnings | Digest |",
    "| --- | --- | ---: | ---: | ---: | --- |"
  ];

  for (const [name, result] of Object.entries(packet)) {
    lines.push(
      `| ${name} | ${result.status} | ${result.summary.heldResearchers} | ${result.summary.blockerCount} | ${result.summary.warningCount} | ${result.auditDigest.slice(0, 12)} |`
    );
  }

  lines.push("", "## Risky Profile Actions", "");
  for (const action of packet.risky.researchers[0].actions) {
    lines.push(`- ${action}`);
  }

  lines.push("", "## Non-Overlap Notes", "");
  lines.push(
    "This module evaluates metric abuse and public reputation badge safety. It does not sync ORCID/publication state, implement broad RBAC, issue automation credentials, manage anonymous review escrow, provision projects, or change live identity-provider state."
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const risky = packet.risky.summary;
  const clean = packet.clean.summary;
  const stale = packet.stale.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="360" viewBox="0 0 760 360" role="img" aria-label="Researcher reputation anomaly guard summary">
  <rect width="760" height="360" fill="#f8fafc"/>
  <rect x="32" y="32" width="696" height="296" rx="8" fill="#ffffff" stroke="#d7dee8"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#172033">Reputation anomaly guard</text>
  <text x="56" y="106" font-family="Arial, sans-serif" font-size="14" fill="#526173">Synthetic badge-safety review for SCIBASE user profiles</text>
  ${bar(56, 148, "Risky profile", risky.blockerCount, risky.warningCount, "#c2410c")}
  ${bar(56, 218, "Clean profile", clean.blockerCount, clean.warningCount, "#15803d")}
  ${bar(56, 288, "Stale profile", stale.blockerCount, stale.warningCount, "#b7791f")}
  <text x="548" y="312" font-family="Arial, sans-serif" font-size="12" fill="#526173">Digest ${packet.risky.auditDigest.slice(0, 16)}</text>
</svg>
`;
}

function bar(x, y, label, blockers, warnings, color) {
  const blockerWidth = blockers * 42;
  const warningWidth = warnings * 42;
  return [
    `  <text x="${x}" y="${y - 16}" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#172033">${label}</text>`,
    `  <rect x="${x}" y="${y}" width="420" height="26" rx="4" fill="#e8edf4"/>`,
    `  <rect x="${x}" y="${y}" width="${blockerWidth}" height="26" rx="4" fill="${color}"/>`,
    `  <rect x="${x + blockerWidth}" y="${y}" width="${warningWidth}" height="26" fill="#f6c453"/>`,
    `  <text x="${x + 440}" y="${y + 18}" font-family="Arial, sans-serif" font-size="13" fill="#172033">${blockers} blockers, ${warnings} warnings</text>`
  ].join("\n");
}
