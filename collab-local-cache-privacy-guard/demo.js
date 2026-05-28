"use strict";

const fs = require("fs");
const path = require("path");
const { assessLocalCachePrivacy } = require("./index");
const { mixedCachePacket, readyCachePacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = {
  mixed: assessLocalCachePrivacy(mixedCachePacket),
  ready: assessLocalCachePrivacy(readyCachePacket)
};

fs.writeFileSync(path.join(reportsDir, "local-cache-privacy-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "local-cache-privacy-report.md"), renderMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(packet));

console.log(`Wrote ${path.relative(process.cwd(), reportsDir)}`);
console.log(`Mixed packet status: ${packet.mixed.status}`);
console.log(`Audit digest: ${packet.mixed.auditDigest}`);

function renderMarkdown(packet) {
  const lines = [
    "# Collaborative Local Cache Privacy Guard Report",
    "",
    "Synthetic reviewer packet for SCIBASE issue #12.",
    "",
    "## Summary",
    "",
    "| Packet | Status | Purged | Warned | Allowed | Digest |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    `| mixed | ${packet.mixed.status} | ${packet.mixed.summary.purged} | ${packet.mixed.summary.warned} | ${packet.mixed.summary.allowed} | ${packet.mixed.auditDigest.slice(0, 12)} |`,
    `| ready | ${packet.ready.status} | ${packet.ready.summary.purged} | ${packet.ready.summary.warned} | ${packet.ready.summary.allowed} | ${packet.ready.auditDigest.slice(0, 12)} |`,
    "",
    "## Snapshot Decisions",
    ""
  ];

  for (const snapshot of packet.mixed.snapshots) {
    lines.push(`### ${snapshot.snapshotId}: ${snapshot.decision}`);
    for (const blocker of snapshot.blockers) {
      lines.push(`- blocker ${blocker.code}: ${blocker.message}`);
    }
    for (const warning of snapshot.warnings) {
      lines.push(`- warning ${warning.code}: ${warning.message}`);
    }
    lines.push("");
  }

  lines.push("## Non-Overlap Notes", "");
  lines.push(
    "This module checks privacy and retention of browser/local autosave payloads. It does not implement autosave restore planning, operation replay, offline conflict rebasing, presence broadcast privacy, notification fanout, reference merging, or section lock recovery."
  );

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const mixed = packet.mixed.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" role="img" aria-label="Collaborative local cache privacy summary">
  <rect width="760" height="340" fill="#f8fafc"/>
  <rect x="32" y="32" width="696" height="276" rx="8" fill="#ffffff" stroke="#d7dee8"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#172033">Local cache privacy guard</text>
  <text x="56" y="106" font-family="Arial, sans-serif" font-size="14" fill="#526173">Synthetic autosave persistence and restore safety review</text>
  ${bar(56, 154, "Purge/redact", mixed.purged, "#b91c1c")}
  ${bar(56, 214, "Warn", mixed.warned, "#b7791f")}
  ${bar(56, 274, "Allow", mixed.allowed, "#15803d")}
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
    `  <text x="${x + 382}" y="${y + 17}" font-family="Arial, sans-serif" font-size="13" fill="#172033">${count} snapshot(s)</text>`
  ].join("\n");
}
