"use strict";

const fs = require("fs");
const path = require("path");
const { assessRepositoryVersionTags } = require("./index");
const { mixedRepositoryTagPacket, readyRepositoryTagPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = {
  mixed: assessRepositoryVersionTags(mixedRepositoryTagPacket),
  ready: assessRepositoryVersionTags(readyRepositoryTagPacket)
};

fs.writeFileSync(path.join(reportsDir, "repository-version-tag-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "repository-version-tag-report.md"), renderMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(packet));

console.log(`Wrote ${path.relative(process.cwd(), reportsDir)}`);
console.log(`Mixed packet status: ${packet.mixed.status}`);
console.log(`Audit digest: ${packet.mixed.auditDigest}`);

function renderMarkdown(packet) {
  const lines = [
    "# Repository Version Tag Governor Report",
    "",
    "Synthetic semantic tag governance packet for SCIBASE issue #10.",
    "",
    "## Summary",
    "",
    "| Packet | Status | Blocked | Manual Review | Approved | Digest |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    `| mixed | ${packet.mixed.status} | ${packet.mixed.summary.blocked} | ${packet.mixed.summary.manualReview} | ${packet.mixed.summary.approved} | ${packet.mixed.auditDigest.slice(0, 12)} |`,
    `| ready | ${packet.ready.status} | ${packet.ready.summary.blocked} | ${packet.ready.summary.manualReview} | ${packet.ready.summary.approved} | ${packet.ready.auditDigest.slice(0, 12)} |`,
    "",
    "## Proposal Decisions",
    ""
  ];

  for (const proposal of packet.mixed.proposals) {
    lines.push(`### ${proposal.proposalId}: ${proposal.decision}`);
    for (const blocker of proposal.blockers) {
      lines.push(`- blocker ${blocker.code}: ${blocker.message}`);
    }
    for (const warning of proposal.warnings) {
      lines.push(`- warning ${warning.code}: ${warning.message}`);
    }
    lines.push("");
  }

  lines.push("## Non-Overlap Notes", "");
  lines.push(
    "This module focuses on semantic version tag governance and citation-version integrity before publication. It does not implement repository foundations, a broad integrity ledger, release readiness, DOI tombstones, restore rehearsal, access review, environment drift, merge queue governance, retention legal holds, sensitive artifact scanning, license compatibility, branch lineage, component-owner approval, or export contracts."
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const mixed = packet.mixed.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" role="img" aria-label="Repository version tag governance summary">
  <rect width="760" height="340" fill="#f8fafc"/>
  <rect x="32" y="32" width="696" height="276" rx="8" fill="#ffffff" stroke="#d7dee8"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#172033">Repository version tag governor</text>
  <text x="56" y="106" font-family="Arial, sans-serif" font-size="14" fill="#526173">Semantic release and citation-version integrity review</text>
  ${bar(56, 154, "Blocked", mixed.blocked, "#b91c1c")}
  ${bar(56, 214, "Manual review", mixed.manualReview, "#b7791f")}
  ${bar(56, 274, "Approved", mixed.approved, "#15803d")}
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
    `  <text x="${x + 382}" y="${y + 17}" font-family="Arial, sans-serif" font-size="13" fill="#172033">${count} proposal(s)</text>`
  ].join("\n");
}
