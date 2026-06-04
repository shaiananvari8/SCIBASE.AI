import crypto from "node:crypto";

const DEFAULT_POLICY = {
  maxRoundingDriftCents: 2,
  requireEvidenceForRecognition: true,
  blockFutureServiceRecognition: true,
  blockUnconsumedUsageCredits: true,
  requireContractWindow: true,
  requireAllocationMatchesInvoice: true
};

export function evaluateRevenueRecognitionPacket(packet, options = {}) {
  const normalized = normalizePacket(packet);
  const policy = { ...DEFAULT_POLICY, ...normalized.policy, ...(options.policy ?? {}) };
  const asOf = new Date(options.asOf ?? normalized.asOf);
  const blockers = [];
  const warnings = [];
  const actions = [];
  const obligationActions = [];

  for (const contract of normalized.contracts) {
    const allocationSum = contract.obligations.reduce((sum, obligation) => sum + obligation.allocatedCents, 0);
    const allocationDrift = Math.abs(allocationSum - contract.invoiceCents);
    if (policy.requireAllocationMatchesInvoice && allocationDrift > policy.maxRoundingDriftCents) {
      blockers.push({
        code: "allocation_does_not_match_invoice",
        contractId: contract.id,
        invoiceCents: contract.invoiceCents,
        allocatedCents: allocationSum,
        driftCents: allocationDrift,
        message: "Performance obligation allocations do not reconcile with the invoice amount."
      });
      actions.push({
        type: "reconcile_allocation",
        contractId: contract.id,
        reason: "Revenue cannot be recognized until invoice and obligation allocation agree."
      });
    }

    for (const obligation of contract.obligations) {
      const recognition = recognizeObligation(contract, obligation, normalized.usageEvents, asOf);
      const recognizedTooEarly = recognition.recognizedCents > recognition.allowedRecognizedCents + policy.maxRoundingDriftCents;
      const missingEvidence =
        policy.requireEvidenceForRecognition && recognition.recognizedCents > 0 && recognition.evidenceState !== "complete";
      const futureService =
        policy.blockFutureServiceRecognition && obligation.kind === "subscription" && recognition.serviceProgressRatio < 1;
      const unconsumedCredits =
        policy.blockUnconsumedUsageCredits &&
        obligation.kind === "usage_credit" &&
        recognition.allowedRecognizedCents + policy.maxRoundingDriftCents < recognition.recognizedCents;

      const action = {
        contractId: contract.id,
        obligationId: obligation.id,
        kind: obligation.kind,
        decision: "accept",
        allocatedCents: obligation.allocatedCents,
        recognizedCents: recognition.recognizedCents,
        allowedRecognizedCents: recognition.allowedRecognizedCents,
        deferredCents: Math.max(0, obligation.allocatedCents - recognition.allowedRecognizedCents),
        reasons: [],
        requiredActions: []
      };

      if (policy.requireContractWindow && !obligation.startDate && obligation.kind !== "usage_credit") {
        action.decision = "hold";
        action.reasons.push("missing_service_window");
        action.requiredActions.push("Add a service start and end date before recognition.");
        blockers.push({
          code: "missing_service_window",
          contractId: contract.id,
          obligationId: obligation.id,
          message: "Non-usage obligations need an explicit service period."
        });
      }

      if (recognizedTooEarly || futureService) {
        action.decision = "hold";
        action.reasons.push("premature_recognition");
        action.requiredActions.push("Move unearned revenue into deferred revenue until service is delivered.");
        blockers.push({
          code: "premature_revenue_recognition",
          contractId: contract.id,
          obligationId: obligation.id,
          recognizedCents: recognition.recognizedCents,
          allowedRecognizedCents: recognition.allowedRecognizedCents,
          message: "Revenue is recognized before the obligation is sufficiently delivered."
        });
      }

      if (unconsumedCredits) {
        action.decision = "hold";
        action.reasons.push("unconsumed_usage_credits");
        action.requiredActions.push("Recognize compute-credit revenue only as credits are consumed or expire.");
        blockers.push({
          code: "usage_credits_recognized_before_consumption",
          contractId: contract.id,
          obligationId: obligation.id,
          consumedCents: recognition.consumedCents,
          recognizedCents: recognition.recognizedCents,
          message: "Usage credit revenue exceeds consumed or expired value."
        });
      }

      if (missingEvidence) {
        action.decision = "hold";
        action.reasons.push("missing_recognition_evidence");
        action.requiredActions.push("Attach delivery, consumption, or export evidence for the recognized amount.");
        blockers.push({
          code: "missing_recognition_evidence",
          contractId: contract.id,
          obligationId: obligation.id,
          message: "Recognized revenue lacks required delivery evidence."
        });
      }

      if (recognition.roundingDriftCents > policy.maxRoundingDriftCents) {
        warnings.push({
          code: "recognition_rounding_drift",
          contractId: contract.id,
          obligationId: obligation.id,
          driftCents: recognition.roundingDriftCents,
          message: "Recognition schedule has rounding drift outside policy tolerance."
        });
      }

      obligationActions.push(action);
    }
  }

  const acceptedRecognizedCents = obligationActions
    .filter((action) => action.decision === "accept")
    .reduce((sum, action) => sum + action.recognizedCents, 0);
  const allowedRecognizedCents = obligationActions.reduce((sum, action) => sum + action.allowedRecognizedCents, 0);
  const deferredCents = obligationActions.reduce((sum, action) => sum + action.deferredCents, 0);
  const status = blockers.length ? "block_close" : warnings.length ? "needs_finance_review" : "close_ready";

  return {
    status,
    asOf: asOf.toISOString(),
    packetId: normalized.packetId,
    digest: digest({ packetId: normalized.packetId, blockers, warnings, obligationActions }),
    totals: {
      contracts: normalized.contracts.length,
      obligations: obligationActions.length,
      acceptedRecognizedCents,
      allowedRecognizedCents,
      deferredCents,
      blockers: blockers.length,
      warnings: warnings.length,
      heldObligations: obligationActions.filter((action) => action.decision === "hold").length
    },
    blockers,
    warnings,
    actions,
    obligationActions,
    policy
  };
}

export function recognizeObligation(contract, obligation, usageEvents, asOf) {
  const recognizedCents = obligation.recognizedCents;
  const evidenceState = obligation.evidence?.state ?? "missing";
  let allowedRecognizedCents = 0;
  let consumedCents = 0;
  let serviceProgressRatio = 0;

  if (obligation.kind === "subscription" || obligation.kind === "license_export") {
    serviceProgressRatio = progressBetween(obligation.startDate, obligation.endDate, asOf);
    allowedRecognizedCents = Math.round(obligation.allocatedCents * serviceProgressRatio);
  } else if (obligation.kind === "usage_credit") {
    consumedCents = usageEvents
      .filter((event) => event.contractId === contract.id && event.obligationId === obligation.id)
      .filter((event) => new Date(event.occurredAt) <= asOf)
      .reduce((sum, event) => sum + event.consumedCents, 0);
    const expired = obligation.expiresAt && new Date(obligation.expiresAt) <= asOf;
    allowedRecognizedCents = expired ? obligation.allocatedCents : Math.min(obligation.allocatedCents, consumedCents);
    serviceProgressRatio = obligation.allocatedCents ? allowedRecognizedCents / obligation.allocatedCents : 0;
  } else {
    throw new Error(`Unsupported obligation kind: ${obligation.kind}`);
  }

  return {
    recognizedCents,
    allowedRecognizedCents,
    consumedCents,
    serviceProgressRatio,
    evidenceState,
    roundingDriftCents: Math.abs(Math.round(allowedRecognizedCents) - allowedRecognizedCents)
  };
}

export function buildReviewerPacket(packet, options = {}) {
  const evaluation = evaluateRevenueRecognitionPacket(packet, options);
  return {
    title: "SCIBASE Revenue Recognition Deferral Guard",
    issue: "SCIBASE.AI#20",
    claim: "/claim #20",
    purpose:
      "Prevent revenue close packets from recognizing subscription, compute-credit, or licensing revenue before delivery evidence exists.",
    evaluation,
    reviewerChecklist: [
      "Invoice amount reconciles to performance obligation allocations.",
      "Subscription revenue is deferred until the service period is earned.",
      "Compute-credit revenue is recognized only on consumption or expiry.",
      "Licensing/export revenue has delivery evidence before close.",
      "Held obligations include deterministic remediation actions."
    ]
  };
}

export function renderMarkdownReport(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  const lines = [
    "# Revenue Recognition Deferral Guard Report",
    "",
    `Issue: ${review.issue}`,
    `Claim marker: \`${review.claim}\``,
    `Status: \`${evaluation.status}\``,
    `Digest: \`${evaluation.digest}\``,
    "",
    "## Reviewer Checklist",
    ...review.reviewerChecklist.map((item) => `- ${item}`),
    "",
    "## Totals",
    `- Contracts inspected: ${evaluation.totals.contracts}`,
    `- Obligations inspected: ${evaluation.totals.obligations}`,
    `- Allowed recognized revenue: ${formatCents(evaluation.totals.allowedRecognizedCents)}`,
    `- Deferred revenue: ${formatCents(evaluation.totals.deferredCents)}`,
    `- Held obligations: ${evaluation.totals.heldObligations}`,
    `- Blockers: ${evaluation.totals.blockers}`,
    `- Warnings: ${evaluation.totals.warnings}`,
    "",
    "## Blockers",
    ...formatFindings(evaluation.blockers),
    "",
    "## Required Actions",
    ...(evaluation.actions.length
      ? evaluation.actions.map((action) => `- ${action.type}: ${action.reason}`)
      : ["- No finance actions required."]),
    "",
    "## Obligation Decisions",
    ...evaluation.obligationActions.map(
      (action) =>
        `- ${action.contractId}/${action.obligationId}: ${action.decision}; recognized ${formatCents(action.recognizedCents)}, allowed ${formatCents(action.allowedRecognizedCents)}, deferred ${formatCents(action.deferredCents)}`
    )
  ];
  return `${lines.join("\n")}\n`;
}

export function renderSvgSummary(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  const max = Math.max(
    evaluation.totals.allowedRecognizedCents,
    evaluation.totals.deferredCents,
    evaluation.totals.heldObligations * 100_000,
    1
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="740" height="360" viewBox="0 0 740 360" role="img" aria-labelledby="title desc">
  <title id="title">Revenue Recognition Deferral Guard Summary</title>
  <desc id="desc">SCIBASE issue 20 synthetic finance close guard summary.</desc>
  <rect width="740" height="360" fill="#f8fafc"/>
  <rect x="32" y="28" width="676" height="304" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="56" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">Revenue Recognition Deferral Guard</text>
  <text x="56" y="104" font-family="Arial, sans-serif" font-size="15" fill="#334155">Status: ${escapeXml(evaluation.status)} | Digest: ${escapeXml(evaluation.digest.slice(0, 16))}</text>
  ${svgMetric("Allowed recognized", formatCents(evaluation.totals.allowedRecognizedCents), evaluation.totals.allowedRecognizedCents, max, 56, 150, "#16a34a")}
  ${svgMetric("Deferred revenue", formatCents(evaluation.totals.deferredCents), evaluation.totals.deferredCents, max, 56, 205, "#2563eb")}
  ${svgMetric("Held obligations", String(evaluation.totals.heldObligations), evaluation.totals.heldObligations * 100_000, max, 56, 260, "#dc2626")}
  <text x="56" y="316" font-family="Arial, sans-serif" font-size="14" fill="#475569">Synthetic contracts only. No processors, financial-account actions, tax filing, or external APIs.</text>
</svg>
`;
}

export function demoPacket() {
  return {
    packetId: "scibase-revenue-recognition-close-2026-06",
    asOf: "2026-06-04T00:00:00.000Z",
    policy: {
      maxRoundingDriftCents: 2
    },
    contracts: [
      {
        id: "contract:lab-annual-pro",
        customerType: "lab",
        invoiceCents: 2400000,
        currency: "USD",
        obligations: [
          {
            id: "obl:annual-subscription",
            kind: "subscription",
            allocatedCents: 1800000,
            recognizedCents: 1800000,
            startDate: "2026-01-01T00:00:00.000Z",
            endDate: "2026-12-31T23:59:59.000Z",
            evidence: { state: "complete", reference: "synthetic-service-ledger" }
          },
          {
            id: "obl:compute-credits",
            kind: "usage_credit",
            allocatedCents: 600000,
            recognizedCents: 450000,
            expiresAt: "2026-12-31T23:59:59.000Z",
            evidence: { state: "partial", reference: "synthetic-meter-events" }
          }
        ]
      },
      {
        id: "contract:consortium-license",
        customerType: "institution",
        invoiceCents: 900000,
        currency: "USD",
        obligations: [
          {
            id: "obl:analytics-license-export",
            kind: "license_export",
            allocatedCents: 900000,
            recognizedCents: 900000,
            startDate: "2026-06-01T00:00:00.000Z",
            endDate: "2026-08-31T23:59:59.000Z",
            evidence: { state: "missing", reference: null }
          }
        ]
      }
    ],
    usageEvents: [
      {
        contractId: "contract:lab-annual-pro",
        obligationId: "obl:compute-credits",
        occurredAt: "2026-05-20T00:00:00.000Z",
        consumedCents: 120000,
        source: "synthetic-ai-meter"
      }
    ]
  };
}

export function normalizePacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new TypeError("A revenue recognition packet object is required.");
  }
  return {
    packetId: nonEmpty(packet.packetId, "packetId"),
    asOf: nonEmpty(packet.asOf, "asOf"),
    policy: packet.policy ?? {},
    contracts: ensureArray(packet.contracts, "contracts").map(normalizeContract),
    usageEvents: ensureArray(packet.usageEvents ?? [], "usageEvents").map(normalizeUsageEvent)
  };
}

function normalizeContract(contract) {
  const invoiceCents = cents(contract.invoiceCents, "contract.invoiceCents");
  if (invoiceCents <= 0) {
    throw new Error("contract.invoiceCents must be positive.");
  }
  return {
    id: nonEmpty(contract.id, "contract.id"),
    customerType: contract.customerType ?? "unknown",
    invoiceCents,
    currency: contract.currency ?? "USD",
    obligations: ensureArray(contract.obligations, "contract.obligations").map(normalizeObligation)
  };
}

function normalizeObligation(obligation) {
  return {
    id: nonEmpty(obligation.id, "obligation.id"),
    kind: nonEmpty(obligation.kind, "obligation.kind"),
    allocatedCents: cents(obligation.allocatedCents, "obligation.allocatedCents"),
    recognizedCents: cents(obligation.recognizedCents ?? 0, "obligation.recognizedCents"),
    startDate: obligation.startDate,
    endDate: obligation.endDate,
    expiresAt: obligation.expiresAt,
    evidence: obligation.evidence ?? { state: "missing" }
  };
}

function normalizeUsageEvent(event) {
  return {
    contractId: nonEmpty(event.contractId, "usageEvent.contractId"),
    obligationId: nonEmpty(event.obligationId, "usageEvent.obligationId"),
    occurredAt: nonEmpty(event.occurredAt, "usageEvent.occurredAt"),
    consumedCents: cents(event.consumedCents, "usageEvent.consumedCents"),
    source: event.source ?? "synthetic"
  };
}

function progressBetween(startDate, endDate, asOf) {
  if (!startDate || !endDate) {
    return 0;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }
  if (asOf <= start) {
    return 0;
  }
  if (asOf >= end) {
    return 1;
  }
  return (asOf.getTime() - start.getTime()) / (end.getTime() - start.getTime());
}

function cents(value, name) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new TypeError(`${name} must be a non-negative integer cent amount.`);
  }
  return amount;
}

function ensureArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array.`);
  }
  return value;
}

function nonEmpty(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function formatFindings(findings) {
  if (!findings.length) {
    return ["- None."];
  }
  return findings.map((finding) => `- ${finding.code}: ${finding.message}`);
}

function formatCents(centsValue) {
  return `$${(centsValue / 100).toFixed(2)}`;
}

function svgMetric(label, displayValue, value, max, x, y, color) {
  const width = Math.max(10, Math.round((value / max) * 340));
  return `<text x="${x}" y="${y - 10}" font-family="Arial, sans-serif" font-size="14" fill="#334155">${escapeXml(label)}: ${escapeXml(displayValue)}</text>
  <rect x="${x}" y="${y}" width="380" height="22" rx="4" fill="#e2e8f0"/>
  <rect x="${x}" y="${y}" width="${width}" height="22" rx="4" fill="${color}"/>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
