import crypto from "node:crypto";

const DEFAULT_POLICY = {
  maxTokenAgeDays: 90,
  maxAuditExportAgeDays: 7,
  maxSsoGroupDrift: 3,
  allowedScopes: ["project:read", "project:write", "review:read", "webhook:publish", "audit:read"]
};

export function evaluateEnterpriseIntegrations(packet, options = {}) {
  const normalized = normalizePacket(packet);
  const policy = { ...DEFAULT_POLICY, ...normalized.policy, ...(options.policy ?? {}) };
  const now = new Date(options.now ?? normalized.generatedAt);
  const activeOwners = new Set(normalized.owners.filter((owner) => owner.active).map((owner) => owner.id));
  const blockers = [];
  const warnings = [];
  const decisions = [];

  for (const integration of normalized.integrations) {
    const decision = {
      integrationId: integration.id,
      tenant: integration.tenant,
      decision: "keep_active",
      reasons: [],
      requiredActions: []
    };
    const tokenAgeDays = daysBetween(new Date(integration.tokenIssuedAt), now);
    const auditAgeDays = daysBetween(new Date(integration.lastAuditExportAt), now);
    const overbroadScopes = integration.scopes.filter((scope) => !policy.allowedScopes.includes(scope));

    if (!activeOwners.has(integration.ownerId)) {
      hold(decision, "orphan_owner", "Assign an active institutional owner before keeping the integration active.");
      blockers.push(finding("orphan_owner", integration.id, "Integration owner is missing or inactive."));
    }

    if (tokenAgeDays > policy.maxTokenAgeDays) {
      hold(decision, "stale_token", "Rotate the integration token and record the rotation timestamp.");
      blockers.push({ ...finding("stale_token", integration.id, "Integration token exceeds the rotation window."), tokenAgeDays });
    }

    if (overbroadScopes.length) {
      hold(decision, "overbroad_scopes", "Remove scopes outside the enterprise allowlist.");
      blockers.push({ ...finding("overbroad_scopes", integration.id, "Integration has scopes outside the allowlist."), overbroadScopes });
    }

    if (auditAgeDays > policy.maxAuditExportAgeDays) {
      hold(decision, "stale_audit_export", "Generate a fresh audit export before the next sync.");
      blockers.push({ ...finding("stale_audit_export", integration.id, "Audit export is outside the recency window."), auditAgeDays });
    }

    if (integration.ssoGroupDrift > policy.maxSsoGroupDrift) {
      hold(decision, "sso_group_drift", "Reconcile SSO group membership before syncing permissions.");
      blockers.push({ ...finding("sso_group_drift", integration.id, "SSO group drift exceeds policy."), ssoGroupDrift: integration.ssoGroupDrift });
    }

    if (integration.restrictedData && !integration.dpaApproved) {
      hold(decision, "missing_dpa_approval", "Attach DPA approval before syncing restricted enterprise data.");
      blockers.push(finding("missing_dpa_approval", integration.id, "Restricted-data integration lacks DPA approval."));
    }

    if (integration.webhookFailures >= 3) {
      warnings.push({ ...finding("webhook_failure_streak", integration.id, "Webhook delivery has repeated failures."), webhookFailures: integration.webhookFailures });
    }

    decisions.push(decision);
  }

  const status = blockers.length ? "hold_integration" : warnings.length ? "needs_admin_review" : "integration_ready";
  return {
    status,
    generatedAt: now.toISOString(),
    packetId: normalized.packetId,
    digest: digest({ packetId: normalized.packetId, blockers, warnings, decisions }),
    counts: {
      integrations: normalized.integrations.length,
      owners: normalized.owners.length,
      blockers: blockers.length,
      warnings: warnings.length,
      heldIntegrations: decisions.filter((item) => item.decision === "hold").length
    },
    blockers,
    warnings,
    decisions,
    policy
  };
}

export function buildReviewerPacket(packet, options = {}) {
  return {
    title: "SCIBASE Enterprise Token Rotation Guard",
    issue: "SCIBASE.AI#19",
    claim: "/claim #19",
    evaluation: evaluateEnterpriseIntegrations(packet, options),
    reviewerChecklist: [
      "Integration tokens are inside the rotation window.",
      "Scopes are limited to the enterprise allowlist.",
      "Every integration has an active institutional owner.",
      "Audit exports are fresh before enterprise syncs.",
      "Restricted data integrations have DPA approval."
    ]
  };
}

export function renderMarkdownReport(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return [
    "# Enterprise Token Rotation Guard Report",
    "",
    `Issue: ${review.issue}`,
    `Claim marker: \`${review.claim}\``,
    `Status: \`${evaluation.status}\``,
    `Digest: \`${evaluation.digest}\``,
    "",
    "## Reviewer Checklist",
    ...review.reviewerChecklist.map((item) => `- ${item}`),
    "",
    "## Blockers",
    ...(evaluation.blockers.length ? evaluation.blockers.map((item) => `- ${item.code}: ${item.message}`) : ["- None."]),
    "",
    "## Integration Decisions",
    ...evaluation.decisions.map((item) => `- ${item.integrationId}: ${item.decision}${item.reasons.length ? ` (${item.reasons.join(", ")})` : ""}`)
  ].join("\n") + "\n";
}

export function renderSvgSummary(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="320" viewBox="0 0 720 320" role="img"><rect width="720" height="320" fill="#f8fafc"/><rect x="32" y="28" width="656" height="264" rx="8" fill="#fff" stroke="#cbd5e1"/><text x="56" y="72" font-family="Arial" font-size="24" font-weight="700" fill="#0f172a">Enterprise Token Rotation Guard</text><text x="56" y="106" font-family="Arial" font-size="15" fill="#334155">Status: ${escapeXml(evaluation.status)} | Blockers: ${evaluation.counts.blockers}</text><text x="56" y="148" font-family="Arial" font-size="14" fill="#334155">Integrations inspected: ${evaluation.counts.integrations}</text><text x="56" y="184" font-family="Arial" font-size="14" fill="#334155">Held integrations: ${evaluation.counts.heldIntegrations}</text><text x="56" y="220" font-family="Arial" font-size="14" fill="#334155">Digest: ${escapeXml(evaluation.digest.slice(0, 24))}</text><text x="56" y="264" font-family="Arial" font-size="14" fill="#475569">Synthetic enterprise integration records only. No external API calls.</text></svg>\n`;
}

export function demoPacket() {
  return {
    packetId: "scibase-enterprise-token-demo",
    generatedAt: "2026-06-13T19:00:00.000Z",
    owners: [
      { id: "owner-active", name: "Research IT Admin", active: true },
      { id: "owner-left", name: "Former Lab Admin", active: false }
    ],
    integrations: [
      { id: "int-dspace-sync", tenant: "North Campus", ownerId: "owner-active", tokenIssuedAt: "2026-05-15T00:00:00.000Z", scopes: ["project:read", "webhook:publish", "audit:read"], lastAuditExportAt: "2026-06-10T00:00:00.000Z", ssoGroupDrift: 1, restrictedData: false, dpaApproved: false, webhookFailures: 0 },
      { id: "int-hris-sync", tenant: "Medical Research Institute", ownerId: "owner-left", tokenIssuedAt: "2026-01-01T00:00:00.000Z", scopes: ["project:read", "admin:root"], lastAuditExportAt: "2026-05-20T00:00:00.000Z", ssoGroupDrift: 6, restrictedData: true, dpaApproved: false, webhookFailures: 4 }
    ]
  };
}

export function normalizePacket(packet) {
  if (!packet || typeof packet !== "object") throw new TypeError("An enterprise integration packet object is required.");
  return {
    packetId: text(packet.packetId, "packetId"),
    generatedAt: text(packet.generatedAt, "generatedAt"),
    policy: packet.policy ?? {},
    owners: asArray(packet.owners, "owners").map((owner) => ({
      id: text(owner.id, "owner.id"),
      name: text(owner.name, "owner.name"),
      active: Boolean(owner.active)
    })),
    integrations: asArray(packet.integrations, "integrations").map((integration) => ({
      id: text(integration.id, "integration.id"),
      tenant: text(integration.tenant, "integration.tenant"),
      ownerId: text(integration.ownerId, "integration.ownerId"),
      tokenIssuedAt: text(integration.tokenIssuedAt, "integration.tokenIssuedAt"),
      scopes: asArray(integration.scopes, "integration.scopes").map((scope) => text(scope, "integration.scope")),
      lastAuditExportAt: text(integration.lastAuditExportAt, "integration.lastAuditExportAt"),
      ssoGroupDrift: number(integration.ssoGroupDrift, "integration.ssoGroupDrift"),
      restrictedData: Boolean(integration.restrictedData),
      dpaApproved: Boolean(integration.dpaApproved),
      webhookFailures: number(integration.webhookFailures ?? 0, "integration.webhookFailures")
    }))
  };
}

function hold(decision, reason, requiredAction) { decision.decision = "hold"; decision.reasons.push(reason); decision.requiredActions.push(requiredAction); }
function finding(code, integrationId, message) { return { code, integrationId, message }; }
function daysBetween(start, end) { return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000)); }
function text(value, name) { if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must be a non-empty string.`); return value.trim(); }
function number(value, name) { const parsed = Number(value); if (!Number.isFinite(parsed)) throw new TypeError(`${name} must be finite.`); return parsed; }
function asArray(value, name) { if (!Array.isArray(value)) throw new TypeError(`${name} must be an array.`); return value; }
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function escapeXml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;"); }
