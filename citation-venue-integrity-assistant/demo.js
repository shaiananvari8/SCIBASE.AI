"use strict";

const fs = require("fs");
const path = require("path");
const { assessCitationVenueIntegrity } = require("./index");
const { mixedVenuePacket, readyOnlyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = {
  mixed: assessCitationVenueIntegrity(mixedVenuePacket),
  ready: assessCitationVenueIntegrity(readyOnlyPacket)
};

fs.writeFileSync(path.join(reportsDir, "citation-venue-integrity-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "citation-venue-integrity-report.md"), renderMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(packet));

console.log(`Wrote ${path.relative(process.cwd(), reportsDir)}`);
console.log(`Mixed packet status: ${packet.mixed.status}`);
console.log(`Audit digest: ${packet.mixed.auditDigest}`);

function renderMarkdown(packet) {
  const lines = [
    "# Citation Venue Integrity Assistant Report",
    "",
    "Synthetic reviewer packet for SCIBASE issue #13.",
    "",
    "## Summary",
    "",
    "| Packet | Status | Blocked | Warned | Allowed | Digest |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    `| mixed | ${packet.mixed.status} | ${packet.mixed.summary.blocked} | ${packet.mixed.summary.warned} | ${packet.mixed.summary.allowed} | ${packet.mixed.auditDigest.slice(0, 12)} |`,
    `| ready | ${packet.ready.status} | ${packet.ready.summary.blocked} | ${packet.ready.summary.warned} | ${packet.ready.summary.allowed} | ${packet.ready.auditDigest.slice(0, 12)} |`,
    "",
    "## Candidate Decisions",
    ""
  ];

  for (const candidate of packet.mixed.candidates) {
    lines.push(`### ${candidate.candidateId}: ${candidate.action}`);
    lines.push(`Venue: ${candidate.venue}`);
    lines.push(`Risk score: ${candidate.riskScore}`);
    for (const check of candidate.checks) {
      lines.push(`- ${check.code}: ${check.message}`);
    }
    lines.push("");
  }

  lines.push("## Non-Overlap Notes", "");
  lines.push(
    "This module checks venue-level trust for citation recommendations. It does not resolve duplicate reference metadata, decide whether a citation supports a claim, normalize citation style, scan live publisher databases, or mutate a manuscript."
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const mixed = packet.mixed.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" role="img" aria-label="Citation venue integrity summary">
  <rect width="760" height="340" fill="#f8fafc"/>
  <rect x="32" y="32" width="696" height="276" rx="8" fill="#ffffff" stroke="#d7dee8"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#172033">Citation venue integrity</text>
  <text x="56" y="106" font-family="Arial, sans-serif" font-size="14" fill="#526173">Synthetic pre-insertion venue trust review</text>
  ${bar(56, 154, "Blocked", mixed.blocked, "#b91c1c")}
  ${bar(56, 214, "Warned", mixed.warned, "#b7791f")}
  ${bar(56, 274, "Allowed", mixed.allowed, "#15803d")}
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
    `  <text x="${x + 382}" y="${y + 17}" font-family="Arial, sans-serif" font-size="13" fill="#172033">${count} candidate(s)</text>`
  ].join("\n");
}
