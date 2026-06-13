import crypto from "node:crypto";

const DEFAULT_POLICY = {
  maxOveragePercent: 5,
  minGrossMarginPercent: 30,
  requirePurchaseOrderForInvoice: true,
  requireGrantAwardId: true,
  blockExpiredGrants: true
};

export function evaluateComputeBudgets(packet, options = {}) {
  const normalized = normalizePacket(packet);
  const policy = { ...DEFAULT_POLICY, ...normalized.policy, ...(options.policy ?? {}) };
  const now = new Date(options.now ?? normalized.generatedAt);
  const grants = new Map(normalized.grants.map((grant) => [grant.id, grant]));
  const blockers = [];
  const warnings = [];
  const decisions = [];

  for (const account of normalized.accounts) {
    const grant = grants.get(account.grantId);
    const decision = {
      accountId: account.id,
      institution: account.institution,
      decision: "bill",
      reasons: [],
      requiredActions: []
    };
    const projectedSpend = account.currentSpend + account.pendingUsageCost;
    const overagePercent = account.budgetLimit ? ((projectedSpend - account.budgetLimit) / account.budgetLimit) * 100 : 0;
    const grossMarginPercent = account.pendingUsageCost ? ((account.pendingUsageCost - account.cloudCost) / account.pendingUsageCost) * 100 : 100;

    if (!grant) {
      hold(decision, "missing_grant_record", "Attach a grant or institutional billing record before billing compute usage.");
      blockers.push(finding("missing_grant_record", account.id, "Compute account references a missing grant record."));
    } else {
      if (policy.requireGrantAwardId && !grant.awardId) {
        hold(decision, "missing_award_id", "Add the grant award id before recognizing sponsored compute revenue.");
        blockers.push(finding("missing_award_id", account.id, "Grant-backed account is missing an award id."));
      }

      if (policy.blockExpiredGrants && new Date(grant.endsAt) < now) {
        hold(decision, "expired_grant", "Move usage to a renewed grant or institutional invoice before billing.");
        blockers.push(finding("expired_grant", account.id, "Grant has expired before pending usage billing."));
      }

      if (grant.billingHold) {
        hold(decision, "grant_billing_hold", "Resolve the sponsor billing hold before creating an invoice.");
        blockers.push(finding("grant_billing_hold", account.id, "Grant is under a billing hold."));
      }
    }

    if (policy.requirePurchaseOrderForInvoice && account.billingMode === "invoice" && !account.purchaseOrder) {
      hold(decision, "missing_purchase_order", "Attach a purchase order for institutional invoicing.");
      blockers.push(finding("missing_purchase_order", account.id, "Institutional invoice account is missing a purchase order."));
    }

    if (projectedSpend > account.budgetLimit) {
      if (overagePercent > policy.maxOveragePercent) {
        hold(decision, "budget_overage", "Require budget-owner approval before converting usage to billable spend.");
        blockers.push({
          ...finding("budget_overage", account.id, "Projected compute spend exceeds the configured budget limit."),
          projectedSpend,
          budgetLimit: account.budgetLimit,
          overagePercent: round(overagePercent)
        });
      } else {
        warnings.push({
          ...finding("minor_budget_overage", account.id, "Projected spend is slightly above the budget limit."),
          projectedSpend,
          budgetLimit: account.budgetLimit,
          overagePercent: round(overagePercent)
        });
      }
    }

    if (grossMarginPercent < policy.minGrossMarginPercent) {
      hold(decision, "low_compute_margin", "Reprice the compute job or route it to a cheaper execution tier.");
      blockers.push({
        ...finding("low_compute_margin", account.id, "Pending usage falls below the minimum gross margin threshold."),
        grossMarginPercent: round(grossMarginPercent),
        minGrossMarginPercent: policy.minGrossMarginPercent
      });
    }

    decisions.push(decision);
  }

  const status = blockers.length ? "hold_billing" : warnings.length ? "needs_finance_review" : "ready_to_bill";
  return {
    status,
    generatedAt: now.toISOString(),
    packetId: normalized.packetId,
    digest: digest({ packetId: normalized.packetId, blockers, warnings, decisions }),
    counts: {
      accounts: normalized.accounts.length,
      grants: normalized.grants.length,
      blockers: blockers.length,
      warnings: warnings.length,
      heldAccounts: decisions.filter((item) => item.decision === "hold").length
    },
    blockers,
    warnings,
    decisions,
    policy
  };
}

export function buildReviewerPacket(packet, options = {}) {
  return {
    title: "SCIBASE Grant Compute Budget Guard",
    issue: "SCIBASE.AI#20",
    claim: "/claim #20",
    evaluation: evaluateComputeBudgets(packet, options),
    reviewerChecklist: [
      "Grant-backed usage has an award id and active grant window.",
      "Institutional invoice accounts include purchase orders.",
      "Pending AI compute charges stay within approved budget limits.",
      "Billing holds stop invoices before revenue recognition.",
      "Compute usage preserves the configured gross margin floor."
    ]
  };
}

export function renderMarkdownReport(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return [
    "# Grant Compute Budget Guard Report",
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
    "## Account Decisions",
    ...evaluation.decisions.map((item) => `- ${item.accountId}: ${item.decision}${item.reasons.length ? ` (${item.reasons.join(", ")})` : ""}`)
  ].join("\n") + "\n";
}

export function renderSvgSummary(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="320" viewBox="0 0 720 320" role="img"><rect width="720" height="320" fill="#f8fafc"/><rect x="32" y="28" width="656" height="264" rx="8" fill="#fff" stroke="#cbd5e1"/><text x="56" y="72" font-family="Arial" font-size="24" font-weight="700" fill="#0f172a">Grant Compute Budget Guard</text><text x="56" y="106" font-family="Arial" font-size="15" fill="#334155">Status: ${escapeXml(evaluation.status)} | Blockers: ${evaluation.counts.blockers}</text><text x="56" y="148" font-family="Arial" font-size="14" fill="#334155">Accounts inspected: ${evaluation.counts.accounts}</text><text x="56" y="184" font-family="Arial" font-size="14" fill="#334155">Held accounts: ${evaluation.counts.heldAccounts}</text><text x="56" y="220" font-family="Arial" font-size="14" fill="#334155">Digest: ${escapeXml(evaluation.digest.slice(0, 24))}</text><text x="56" y="264" font-family="Arial" font-size="14" fill="#475569">Synthetic billing records only. No processor, cloud, or grant-system calls.</text></svg>\n`;
}

export function demoPacket() {
  return {
    packetId: "scibase-grant-compute-budget-demo",
    generatedAt: "2026-06-13T18:30:00.000Z",
    grants: [
      { id: "grant-active-nsf", awardId: "NSF-2042-OPEN", sponsor: "NSF", endsAt: "2026-12-31T00:00:00.000Z", billingHold: false },
      { id: "grant-expired-doe", awardId: "", sponsor: "DOE", endsAt: "2026-04-30T00:00:00.000Z", billingHold: true }
    ],
    accounts: [
      { id: "acct-lab-stable", institution: "North Campus Lab", grantId: "grant-active-nsf", billingMode: "card", purchaseOrder: "", budgetLimit: 10000, currentSpend: 7200, pendingUsageCost: 1100, cloudCost: 520 },
      { id: "acct-lab-hold", institution: "Materials Institute", grantId: "grant-expired-doe", billingMode: "invoice", purchaseOrder: "", budgetLimit: 5000, currentSpend: 4800, pendingUsageCost: 950, cloudCost: 760 }
    ]
  };
}

export function normalizePacket(packet) {
  if (!packet || typeof packet !== "object") throw new TypeError("A compute budget packet object is required.");
  return {
    packetId: text(packet.packetId, "packetId"),
    generatedAt: text(packet.generatedAt, "generatedAt"),
    policy: packet.policy ?? {},
    grants: asArray(packet.grants, "grants").map((grant) => ({
      id: text(grant.id, "grant.id"),
      awardId: String(grant.awardId ?? "").trim(),
      sponsor: text(grant.sponsor, "grant.sponsor"),
      endsAt: text(grant.endsAt, "grant.endsAt"),
      billingHold: Boolean(grant.billingHold)
    })),
    accounts: asArray(packet.accounts, "accounts").map((account) => ({
      id: text(account.id, "account.id"),
      institution: text(account.institution, "account.institution"),
      grantId: text(account.grantId, "account.grantId"),
      billingMode: text(account.billingMode, "account.billingMode"),
      purchaseOrder: String(account.purchaseOrder ?? "").trim(),
      budgetLimit: number(account.budgetLimit, "account.budgetLimit"),
      currentSpend: number(account.currentSpend, "account.currentSpend"),
      pendingUsageCost: number(account.pendingUsageCost, "account.pendingUsageCost"),
      cloudCost: number(account.cloudCost, "account.cloudCost")
    }))
  };
}

function hold(decision, reason, requiredAction) {
  decision.decision = "hold";
  decision.reasons.push(reason);
  decision.requiredActions.push(requiredAction);
}

function finding(code, accountId, message) {
  return { code, accountId, message };
}

function text(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
  return value.trim();
}

function number(value, name) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${name} must be finite.`);
  return parsed;
}

function asArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array.`);
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
