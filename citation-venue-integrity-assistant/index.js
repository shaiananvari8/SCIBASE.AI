"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = {
  rapidAcceptanceDays: 10,
  minimumBoardVerificationRatio: 0.65,
  minimumScopeFit: 0.55,
  minimumIndexConfidence: 0.7,
  blockRiskScore: 70,
  warnRiskScore: 35
};

function assessCitationVenueIntegrity(packet, policy = {}) {
  const settings = { ...DEFAULT_POLICY, ...policy };
  const candidates = (packet.candidates || []).map((candidate) => evaluateCandidate(candidate, settings));
  const summary = summarize(candidates);
  const payload = {
    generatedAt: packet.generatedAt || "2026-05-28T00:00:00Z",
    manuscriptId: packet.manuscriptId || "synthetic-manuscript",
    status: summary.status,
    summary,
    candidates
  };

  return {
    ...payload,
    auditDigest: digest(payload)
  };
}

function evaluateCandidate(candidate, settings) {
  const checks = [];

  addPeerReviewChecks(candidate, checks, settings);
  addIndexingChecks(candidate, checks, settings);
  addEditorialChecks(candidate, checks, settings);
  addPaperMillChecks(candidate, checks);
  addIdentityAndScopeChecks(candidate, checks, settings);
  addFeeTransparencyChecks(candidate, checks);

  const riskScore = Math.min(100, checks.reduce((total, check) => total + check.weight, 0));
  const action =
    riskScore >= settings.blockRiskScore
      ? "block_insertion"
      : riskScore >= settings.warnRiskScore
        ? "warn_before_insertion"
        : "allow_insertion";

  return {
    candidateId: candidate.id,
    title: candidate.title,
    venue: candidate.venue.name,
    action,
    riskScore,
    checks,
    insertionGuidance: guidanceFor(action, checks)
  };
}

function addPeerReviewChecks(candidate, checks, settings) {
  const review = candidate.venue.peerReview || {};
  if (review.status !== "peer_reviewed") {
    checks.push({
      code: "missing_peer_review_evidence",
      severity: "blocker",
      weight: 35,
      message: "Venue does not provide clear peer-review evidence."
    });
  }

  if (Number.isFinite(review.acceptanceDays) && review.acceptanceDays < settings.rapidAcceptanceDays) {
    checks.push({
      code: "implausible_acceptance_timeline",
      severity: "blocker",
      weight: 25,
      message: `Acceptance timeline is ${review.acceptanceDays} days.`
    });
  }

  if (review.policyTransparent === false) {
    checks.push({
      code: "opaque_review_policy",
      severity: "warning",
      weight: 12,
      message: "Peer-review policy is not transparent enough for one-click insertion."
    });
  }
}

function addIndexingChecks(candidate, checks, settings) {
  const indexing = candidate.venue.indexing || {};
  if (indexing.claimed && indexing.verified === false) {
    checks.push({
      code: "disputed_indexing_claim",
      severity: "blocker",
      weight: 30,
      message: "Venue claims indexing that the synthetic evidence marks as unverified."
    });
  }

  if ((indexing.confidence || 0) < settings.minimumIndexConfidence) {
    checks.push({
      code: "weak_indexing_evidence",
      severity: "warning",
      weight: 10,
      message: `Indexing confidence is ${round(indexing.confidence || 0)}.`
    });
  }

  if (indexing.fakeImpactFactor) {
    checks.push({
      code: "fake_impact_factor_signal",
      severity: "blocker",
      weight: 30,
      message: "Venue evidence includes a fake impact-factor style signal."
    });
  }
}

function addEditorialChecks(candidate, checks, settings) {
  const board = candidate.venue.editorialBoard || {};
  const ratio = board.verifiedMembers / Math.max(1, board.totalMembers || 0);
  if (ratio < settings.minimumBoardVerificationRatio) {
    checks.push({
      code: "weak_editorial_board_evidence",
      severity: "warning",
      weight: 14,
      message: `${board.verifiedMembers || 0} of ${board.totalMembers || 0} editorial board members are verified.`
    });
  }

  if (board.memberComplaints > 0) {
    checks.push({
      code: "board_membership_complaints",
      severity: "blocker",
      weight: 20,
      message: `${board.memberComplaints} editorial board membership complaint signals are present.`
    });
  }
}

function addPaperMillChecks(candidate, checks) {
  const signals = candidate.venue.integritySignals || {};
  if (signals.paperMillTemplatePhrases) {
    checks.push({
      code: "paper_mill_template_signal",
      severity: "blocker",
      weight: 25,
      message: "Venue or article metadata matches synthetic paper-mill template signals."
    });
  }

  if (signals.specialIssueSpike) {
    checks.push({
      code: "special_issue_spike",
      severity: "warning",
      weight: 12,
      message: "Special issue volume spike needs human review before citation insertion."
    });
  }

  if (signals.citationRing) {
    checks.push({
      code: "citation_ring_signal",
      severity: "warning",
      weight: 14,
      message: "Citation pattern suggests a narrow venue-level citation ring."
    });
  }
}

function addIdentityAndScopeChecks(candidate, checks, settings) {
  const identity = candidate.venue.identity || {};
  if (identity.hijackedJournalRisk) {
    checks.push({
      code: "hijacked_journal_identity_risk",
      severity: "blocker",
      weight: 35,
      message: "Venue identity appears inconsistent with the canonical journal record."
    });
  }

  if (identity.issnConsistent === false) {
    checks.push({
      code: "issn_identity_mismatch",
      severity: "blocker",
      weight: 24,
      message: "ISSN evidence does not match the venue identity."
    });
  }

  if ((candidate.scopeFit || 0) < settings.minimumScopeFit) {
    checks.push({
      code: "poor_venue_scope_fit",
      severity: "warning",
      weight: 10,
      message: `Venue scope fit is ${round(candidate.scopeFit || 0)}.`
    });
  }
}

function addFeeTransparencyChecks(candidate, checks) {
  const fees = candidate.venue.fees || {};
  if (fees.articleProcessingCharge && fees.disclosedBeforeSubmission === false) {
    checks.push({
      code: "opaque_fee_disclosure",
      severity: "warning",
      weight: 10,
      message: "Article processing charge is not disclosed before submission."
    });
  }
}

function guidanceFor(action, checks) {
  if (action === "block_insertion") {
    return [
      "Do not insert this citation automatically.",
      "Show the candidate in a venue-integrity review queue.",
      "Ask the user to choose a safer venue or provide independent verification."
    ];
  }

  if (action === "warn_before_insertion") {
    return [
      "Show an inline venue-integrity warning.",
      "Require an explicit user confirmation before insertion.",
      "Attach the warning to the citation audit packet."
    ];
  }

  if (checks.length === 0) {
    return ["Insert normally and retain the venue-integrity audit digest."];
  }

  return ["Insert with low-risk notes retained in the audit packet."];
}

function summarize(candidates) {
  const blocked = candidates.filter((candidate) => candidate.action === "block_insertion").length;
  const warned = candidates.filter((candidate) => candidate.action === "warn_before_insertion").length;
  const allowed = candidates.filter((candidate) => candidate.action === "allow_insertion").length;
  const status = blocked > 0 ? "hold_citation_insertions" : warned > 0 ? "warn_before_insertion" : "ready";

  return {
    status,
    candidateCount: candidates.length,
    blocked,
    warned,
    allowed,
    highestRiskScore: Math.max(0, ...candidates.map((candidate) => candidate.riskScore))
  };
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  assessCitationVenueIntegrity,
  DEFAULT_POLICY
};
