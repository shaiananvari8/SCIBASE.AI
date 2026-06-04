import { mkdir, writeFile } from "node:fs/promises";
import { createSampleManifest, evaluateRepositoryManifest } from "../src/index.js";

const reportDir = new URL("../reports/", import.meta.url);

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMarkdown(result) {
  const lines = [
    "# Data and Code Hosting Manifest Guard",
    "",
    `Status: ${result.status}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Artifacts: ${result.summary.artifactCount}`,
    `- Dataset artifacts: ${result.summary.datasetCount}`,
    `- Code artifacts: ${result.summary.codeCount}`,
    `- Blockers: ${result.summary.blockerCount}`,
    `- Warnings: ${result.summary.warningCount}`,
    "",
    "## Blockers",
    ""
  ];

  lines.push(...(result.blockers.length ? result.blockers.map((finding) => `- ${finding.code}: ${finding.message}`) : ["- None"]));
  lines.push("", "## Warnings", "");
  lines.push(...(result.warnings.length ? result.warnings.map((finding) => `- ${finding.code}: ${finding.message}`) : ["- None"]));
  lines.push("");
  return lines.join("\n");
}

function renderSvg(result) {
  const statusColor = result.status === "ready_for_repository_release" ? "#15803d" : result.status === "needs_metadata_review" ? "#a16207" : "#b91c1c";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="300" viewBox="0 0 760 300" role="img" aria-label="Data code hosting manifest guard summary">
  <rect width="760" height="300" fill="#f8fafc"/>
  <rect x="28" y="28" width="704" height="244" rx="12" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="56" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">Data and Code Hosting Manifest Guard</text>
  <text x="56" y="110" font-family="Arial, sans-serif" font-size="16" fill="#334155">Status</text>
  <rect x="56" y="124" width="320" height="42" rx="6" fill="${statusColor}"/>
  <text x="72" y="151" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#ffffff">${escapeXml(result.status)}</text>
  <text x="56" y="202" font-family="Arial, sans-serif" font-size="16" fill="#334155">Artifacts ${result.summary.artifactCount} | Datasets ${result.summary.datasetCount} | Code ${result.summary.codeCount}</text>
  <text x="56" y="232" font-family="Arial, sans-serif" font-size="16" fill="#334155">Blockers ${result.summary.blockerCount} | Warnings ${result.summary.warningCount}</text>
  <text x="56" y="258" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Audit ${escapeXml(result.auditDigest.slice(0, 24))}...</text>
</svg>
`;
}

await mkdir(reportDir, { recursive: true });

const readyResult = evaluateRepositoryManifest(createSampleManifest());
const blockedResult = evaluateRepositoryManifest({
  metadata: { title: "Private lab dump" },
  artifacts: [
    {
      id: "unhashed-export",
      type: "dataset",
      format: "xlsx",
      sha256: "missing",
      version: "draft",
      license: "custom-lab-license"
    }
  ],
  access: { visibility: "embargoed" },
  environment: { kind: "docker", definition: "" },
  reproducibility: { commands: [] },
  versioning: { strategy: "", currentTag: "" }
});

const packet = {
  generatedAt: new Date("2026-06-04T00:00:00.000Z").toISOString(),
  readyResult,
  blockedResult
};

await writeFile(new URL("manifest-guard-packet.json", reportDir), `${JSON.stringify(packet, null, 2)}\n`);
await writeFile(new URL("manifest-guard-report.md", reportDir), renderMarkdown(blockedResult));
await writeFile(new URL("summary.svg", reportDir), renderSvg(blockedResult));

console.log(JSON.stringify({
  status: blockedResult.status,
  blockers: blockedResult.summary.blockerCount,
  warnings: blockedResult.summary.warningCount,
  auditDigest: blockedResult.auditDigest
}, null, 2));
