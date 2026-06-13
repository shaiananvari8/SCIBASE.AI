import crypto from "node:crypto";

const DEFAULT_POLICY = {
  maxAppealAgeDays: 45,
  slaHours: 168,
  minIndependentReviewers: 2,
  minEvidenceItems: 2,
  maxProbationDays: 90,
  requireActorSeparation: true
};

export function evaluateReputationAppeals(packet, options = {}) {
  const normalized = normalizePacket(packet);
  const policy = { ...DEFAULT_POLICY, ...normalized.policy, ...(options.policy ?? {}) };
  const now = new Date(options.now ?? normalized.generatedAt);
  const userById = new Map(normalized.users.map((user) => [user.id, user]));
  const sanctionById = new Map(normalized.sanctions.map((sanction) => [sanction.id, sanction]));
  const blockers = [];
  const warnings = [];
  const decisions = [];

  for (const appeal of normalized.appeals) {
    const user = userById.get(appeal.userId);
    const sanction = sanctionById.get(appeal.sanctionId);
    const decision = {
      appealId: appeal.id,
      userId: appeal.userId,
      sanctionId: appeal.sanctionId,
      decision: "release",
      reasons: [],
      requiredActions: []
    };

    if (!user) {
      hold(decision, "unknown_user", "Link the appeal to an existing reputation profile.");
      blockers.push(finding("unknown_user", appeal.id, "Appeal references a missing user profile."));
    }

    if (!sanction) {
      hold(decision, "unknown_sanction", "Link the appeal to the sanction or reputation event being challenged.");
      blockers.push(finding("unknown_sanction", appeal.id, "Appeal references a missing sanction."));
    } else {
      if (sanction.userId !== appeal.userId) {
        hold(decision, "sanction_user_mismatch", "Resolve the appealed sanction against the correct user profile.");
        blockers.push(finding("sanction_user_mismatch", appeal.id, "Appeal user does not match the sanction user."));
      }

      if (sanction.status === "rescinded" && appeal.requestedOutcome !== "record_correction") {
        warnings.push(finding("already_rescinded", appeal.id, "Sanction is already rescinded; only record-correction appeals should continue."));
      }
    }

    if (!appeal.requestedOutcome) {
      hold(decision, "missing_requested_outcome", "Choose revoke, reduce, reinstate, or record_correction before review.");
      blockers.push(finding("missing_requested_outcome", appeal.id, "Appeal lacks a requested outcome."));
    }

    if (appeal.evidence.length < policy.minEvidenceItems) {
      hold(decision, "insufficient_evidence", `Attach at least ${policy.minEvidenceItems} evidence items.`);
      blockers.push({
        ...finding("insufficient_evidence", appeal.id, "Appeal does not include enough evidence for peer validation."),
        evidenceItems: appeal.evidence.length,
        requiredEvidenceItems: policy.minEvidenceItems
      });
    }

    const independentReviewers = appeal.reviewers.filter((reviewer) => reviewer.independent && reviewer.conflictDisclosure === "none");
    if (independentReviewers.length < policy.minIndependentReviewers) {
      hold(decision, "insufficient_independent_review", `Add ${policy.minIndependentReviewers} independent reviewer decisions with no conflicts.`);
      blockers.push({
        ...finding("insufficient_independent_review", appeal.id, "Appeal does not have enough independent conflict-free reviewers."),
        independentReviewers: independentReviewers.length,
        requiredIndependentReviewers: policy.minIndependentReviewers
      });
    }

    if (policy.requireActorSeparation && appeal.originalDecisionActor === appeal.appealDecisionActor) {
      hold(decision, "same_actor_reappeal", "Assign a separate appeal decision actor.");
      blockers.push(finding("same_actor_reappeal", appeal.id, "Original decision actor cannot also decide the appeal."));
    }

    const appealAgeDays = daysBetween(new Date(appeal.submittedAt), now);
    if (appealAgeDays > policy.maxAppealAgeDays) {
      hold(decision, "appeal_window_expired", "Escalate expired appeals to a governance exception review.");
      blockers.push({
        ...finding("appeal_window_expired", appeal.id, "Appeal was submitted outside the configured appeal window."),
        appealAgeDays,
        maxAppealAgeDays: policy.maxAppealAgeDays
      });
    }

    const slaHours = hoursBetween(new Date(appeal.submittedAt), new Date(appeal.decisionDueAt));
    if (slaHours > policy.slaHours) {
      warnings.push({
        ...finding("appeal_sla_too_long", appeal.id, "Decision due date exceeds the configured appeal SLA."),
        slaHours,
        maxSlaHours: policy.slaHours
      });
    }

    if (appeal.requestedOutcome === "reinstate" && appeal.probationDays > policy.maxProbationDays) {
      hold(decision, "probation_too_long", "Reduce reinstatement probation to the policy maximum.");
      blockers.push({
        ...finding("probation_too_long", appeal.id, "Reinstatement probation exceeds the configured maximum."),
        probationDays: appeal.probationDays,
        maxProbationDays: policy.maxProbationDays
      });
    }

    decisions.push(decision);
  }

  const status = blockers.length ? "hold_reputation_change" : warnings.length ? "needs_governance_review" : "ready_for_reputation_update";
  return {
    status,
    generatedAt: now.toISOString(),
    packetId: normalized.packetId,
    digest: digest({ packetId: normalized.packetId, blockers, warnings, decisions }),
    counts: {
      users: normalized.users.length,
      sanctions: normalized.sanctions.length,
      appeals: normalized.appeals.length,
      blockers: blockers.length,
      warnings: warnings.length,
      heldAppeals: decisions.filter((item) => item.decision === "hold").length
    },
    blockers,
    warnings,
    decisions,
    policy
  };
}

export function buildReviewerPacket(packet, options = {}) {
  return {
    title: "SCIBASE Reputation Appeal Evidence Guard",
    issue: "SCIBASE.AI#15",
    claim: "/claim #15",
    evaluation: evaluateReputationAppeals(packet, options),
    reviewerChecklist: [
      "Appeals reference an existing reputation profile and sanction.",
      "Each appeal has the configured evidence threshold.",
      "Independent reviewers disclose no conflicts.",
      "Original penalty actors do not decide their own appeals.",
      "Reinstatement probation stays bounded by policy."
    ]
  };
}

export function renderMarkdownReport(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return [
    "# Reputation Appeal Evidence Guard Report",
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
    "## Appeal Decisions",
    ...evaluation.decisions.map((item) => `- ${item.appealId}: ${item.decision}${item.reasons.length ? ` (${item.reasons.join(", ")})` : ""}`)
  ].join("\n") + "\n";
}

export function renderSvgSummary(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="320" viewBox="0 0 720 320" role="img"><rect width="720" height="320" fill="#f8fafc"/><rect x="32" y="28" width="656" height="264" rx="8" fill="#fff" stroke="#cbd5e1"/><text x="56" y="72" font-family="Arial" font-size="24" font-weight="700" fill="#0f172a">Reputation Appeal Evidence Guard</text><text x="56" y="106" font-family="Arial" font-size="15" fill="#334155">Status: ${escapeXml(evaluation.status)} | Blockers: ${evaluation.counts.blockers}</text><text x="56" y="148" font-family="Arial" font-size="14" fill="#334155">Appeals inspected: ${evaluation.counts.appeals}</text><text x="56" y="184" font-family="Arial" font-size="14" fill="#334155">Held appeals: ${evaluation.counts.heldAppeals}</text><text x="56" y="220" font-family="Arial" font-size="14" fill="#334155">Digest: ${escapeXml(evaluation.digest.slice(0, 24))}</text><text x="56" y="264" font-family="Arial" font-size="14" fill="#475569">Synthetic reputation records only. No private identities, credentials, or external services.</text></svg>\n`;
}

export function demoPacket() {
  return {
    packetId: "scibase-reputation-appeal-demo",
    generatedAt: "2026-06-13T18:00:00.000Z",
    users: [
      { id: "usr-reviewer-ada", displayName: "Ada R.", reputationScore: 82 },
      { id: "usr-dataset-curator", displayName: "Dataset Curator", reputationScore: 41 },
      { id: "usr-protocol-author", displayName: "Protocol Author", reputationScore: 64 }
    ],
    sanctions: [
      { id: "san-duplicate-credit", userId: "usr-dataset-curator", reason: "duplicate_credit_claim", status: "active", createdAt: "2026-06-01T10:00:00.000Z", createdBy: "mod-reputation-1" },
      { id: "san-review-abuse", userId: "usr-protocol-author", reason: "coercive_review_request", status: "active", createdAt: "2026-06-02T12:00:00.000Z", createdBy: "mod-reputation-2" }
    ],
    appeals: [
      {
        id: "app-duplicate-credit",
        userId: "usr-dataset-curator",
        sanctionId: "san-duplicate-credit",
        submittedAt: "2026-06-06T10:00:00.000Z",
        decisionDueAt: "2026-06-11T10:00:00.000Z",
        requestedOutcome: "reduce",
        evidence: [
          { id: "ev-lab-note", type: "lab_note", digest: "sha256:lab-note" },
          { id: "ev-commit-link", type: "repository_commit", digest: "sha256:commit" }
        ],
        reviewers: [
          { id: "rev-1", independent: true, conflictDisclosure: "none" },
          { id: "rev-2", independent: true, conflictDisclosure: "none" }
        ],
        originalDecisionActor: "mod-reputation-1",
        appealDecisionActor: "appeal-panel-a",
        probationDays: 30
      },
      {
        id: "app-review-abuse",
        userId: "usr-protocol-author",
        sanctionId: "san-review-abuse",
        submittedAt: "2026-03-01T08:00:00.000Z",
        decisionDueAt: "2026-06-20T08:00:00.000Z",
        requestedOutcome: "reinstate",
        evidence: [
          { id: "ev-email", type: "correspondence_digest", digest: "sha256:email" }
        ],
        reviewers: [
          { id: "rev-3", independent: true, conflictDisclosure: "none" },
          { id: "rev-4", independent: false, conflictDisclosure: "collaborator" }
        ],
        originalDecisionActor: "mod-reputation-2",
        appealDecisionActor: "mod-reputation-2",
        probationDays: 180
      }
    ]
  };
}

export function normalizePacket(packet) {
  if (!packet || typeof packet !== "object") throw new TypeError("A reputation appeal packet object is required.");
  return {
    packetId: text(packet.packetId, "packetId"),
    generatedAt: text(packet.generatedAt, "generatedAt"),
    policy: packet.policy ?? {},
    users: asArray(packet.users, "users").map((user) => ({
      id: text(user.id, "user.id"),
      displayName: text(user.displayName, "user.displayName"),
      reputationScore: number(user.reputationScore, "user.reputationScore")
    })),
    sanctions: asArray(packet.sanctions, "sanctions").map((sanction) => ({
      id: text(sanction.id, "sanction.id"),
      userId: text(sanction.userId, "sanction.userId"),
      reason: text(sanction.reason, "sanction.reason"),
      status: text(sanction.status, "sanction.status"),
      createdAt: text(sanction.createdAt, "sanction.createdAt"),
      createdBy: text(sanction.createdBy, "sanction.createdBy")
    })),
    appeals: asArray(packet.appeals, "appeals").map(normalizeAppeal)
  };
}

function normalizeAppeal(appeal) {
  return {
    id: text(appeal.id, "appeal.id"),
    userId: text(appeal.userId, "appeal.userId"),
    sanctionId: text(appeal.sanctionId, "appeal.sanctionId"),
    submittedAt: text(appeal.submittedAt, "appeal.submittedAt"),
    decisionDueAt: text(appeal.decisionDueAt, "appeal.decisionDueAt"),
    requestedOutcome: String(appeal.requestedOutcome ?? "").trim(),
    evidence: asArray(appeal.evidence, "appeal.evidence").map((evidence) => ({
      id: text(evidence.id, "evidence.id"),
      type: text(evidence.type, "evidence.type"),
      digest: text(evidence.digest, "evidence.digest")
    })),
    reviewers: asArray(appeal.reviewers, "appeal.reviewers").map((reviewer) => ({
      id: text(reviewer.id, "reviewer.id"),
      independent: Boolean(reviewer.independent),
      conflictDisclosure: text(reviewer.conflictDisclosure, "reviewer.conflictDisclosure")
    })),
    originalDecisionActor: text(appeal.originalDecisionActor, "appeal.originalDecisionActor"),
    appealDecisionActor: text(appeal.appealDecisionActor, "appeal.appealDecisionActor"),
    probationDays: number(appeal.probationDays ?? 0, "appeal.probationDays")
  };
}

function hold(decision, reason, requiredAction) {
  decision.decision = "hold";
  decision.reasons.push(reason);
  decision.requiredActions.push(requiredAction);
}

function finding(code, appealId, message) {
  return { code, appealId, message };
}

function daysBetween(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

function hoursBetween(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 3600000));
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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
