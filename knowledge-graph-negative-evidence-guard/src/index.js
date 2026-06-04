import crypto from "node:crypto";

const DEFAULT_POLICY = {
  contradictionHoldConfidence: 0.62,
  failedReplicationHoldConfidence: 0.58,
  staleReviewDays: 45,
  requirePublicEvidenceForPublicRecommendations: true,
  retractionsBlockAllRecommendations: true,
  requireCuratorForConflicts: true
};

const NEGATIVE_POLARITIES = new Set([
  "contradicts",
  "retracts",
  "fails_to_replicate",
  "limits",
  "withdraws"
]);

const POSITIVE_POLARITIES = new Set(["supports", "extends", "replicates", "uses"]);

export function evaluateNegativeEvidenceGraph(packet, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(packet.policy ?? {}), ...(options.policy ?? {}) };
  const normalized = normalizePacket(packet);
  const now = new Date(options.now ?? normalized.generatedAt ?? Date.now());
  const blockers = [];
  const warnings = [];
  const actions = [];
  const claimActions = new Map();
  const recommendationActions = new Map();

  for (const recommendation of normalized.recommendations) {
    recommendationActions.set(recommendation.id, {
      recommendationId: recommendation.id,
      decision: "publish",
      reasons: [],
      requiredActions: []
    });
  }

  const claimsById = new Map(normalized.claims.map((claim) => [claim.id, claim]));
  const claimsByTriple = groupBy(normalized.claims, (claim) => claim.tripleKey);

  for (const claim of normalized.claims) {
    const ageDays = daysBetween(new Date(claim.reviewedAt ?? claim.source.issuedAt ?? now), now);
    const isNegative = NEGATIVE_POLARITIES.has(claim.polarity);
    const isRetracted = claim.polarity === "retracts" || claim.source.status === "retracted";
    const usesPrivateEvidence = claim.visibility !== "public";
    const linkedRecommendations = normalized.recommendations.filter((rec) =>
      rec.derivedFrom.includes(claim.id) || rec.from === claim.subject || rec.to === claim.object
    );

    if (isNegative && !claim.source.doi) {
      warnings.push({
        code: "missing_negative_evidence_doi",
        claimId: claim.id,
        message: "Negative evidence should keep a DOI or stable public source identifier before curator review."
      });
    }

    if (isNegative && !claim.curatorDecision && ageDays > policy.staleReviewDays) {
      blockers.push({
        code: "stale_negative_evidence_review",
        claimId: claim.id,
        ageDays,
        message: "Negative evidence has been unresolved past the stale-review window."
      });
      actions.push({
        type: "request_curator_decision",
        claimId: claim.id,
        reason: "Negative evidence is stale and still affects graph recommendations."
      });
    }

    if (isRetracted && policy.retractionsBlockAllRecommendations) {
      claimActions.set(claim.id, {
        claimId: claim.id,
        decision: "block",
        reason: "Retracted or withdrawn evidence cannot support public graph recommendations."
      });
      for (const rec of linkedRecommendations) {
        holdRecommendation(recommendationActions.get(rec.id), "retracted_evidence", [
          "Remove the retracted claim from recommendation evidence.",
          "Add a public curator note explaining the withdrawal."
        ]);
      }
      blockers.push({
        code: "retracted_evidence_in_graph_path",
        claimId: claim.id,
        recommendationIds: linkedRecommendations.map((rec) => rec.id),
        message: "A graph path or recommendation still depends on retracted evidence."
      });
      continue;
    }

    if (
      policy.requirePublicEvidenceForPublicRecommendations &&
      usesPrivateEvidence &&
      linkedRecommendations.some((rec) => rec.visibility === "public")
    ) {
      for (const rec of linkedRecommendations) {
        if (rec.visibility === "public") {
          holdRecommendation(recommendationActions.get(rec.id), "private_evidence_for_public_recommendation", [
            "Replace private evidence with a public citation or keep the recommendation internal.",
            "Redact any embargoed evidence from the public graph packet."
          ]);
        }
      }
      blockers.push({
        code: "private_evidence_used_publicly",
        claimId: claim.id,
        recommendationIds: linkedRecommendations.filter((rec) => rec.visibility === "public").map((rec) => rec.id),
        message: "A public recommendation uses private or embargoed negative-evidence context."
      });
    }
  }

  for (const [tripleKey, sameTripleClaims] of claimsByTriple) {
    const positiveClaims = sameTripleClaims.filter((claim) => POSITIVE_POLARITIES.has(claim.polarity));
    const negativeClaims = sameTripleClaims.filter((claim) => NEGATIVE_POLARITIES.has(claim.polarity));
    if (!positiveClaims.length || !negativeClaims.length) {
      continue;
    }

    const conflictScore = scoreEvidenceConflict(positiveClaims, negativeClaims);
    const affectedRecommendations = normalized.recommendations.filter((rec) =>
      rec.derivedFrom.some((claimId) => sameTripleClaims.some((claim) => claim.id === claimId))
    );
    const hasCuratorDecision = sameTripleClaims.some((claim) => claim.curatorDecision === "resolved");

    if (policy.requireCuratorForConflicts && conflictScore >= policy.contradictionHoldConfidence && !hasCuratorDecision) {
      blockers.push({
        code: "unresolved_contradictory_claims",
        tripleKey,
        conflictScore,
        positiveClaimIds: positiveClaims.map((claim) => claim.id),
        negativeClaimIds: negativeClaims.map((claim) => claim.id),
        recommendationIds: affectedRecommendations.map((rec) => rec.id),
        message: "Conflicting positive and negative evidence requires curator review before recommendations publish."
      });
      actions.push({
        type: "open_conflict_review",
        tripleKey,
        claimIds: sameTripleClaims.map((claim) => claim.id),
        reason: "Positive and negative evidence both exceed the publication hold threshold."
      });
      for (const rec of affectedRecommendations) {
        holdRecommendation(recommendationActions.get(rec.id), "unresolved_conflict", [
          "Attach a curator decision that accepts, qualifies, or suppresses the conflict.",
          "Show contradiction context on the entity page before publication."
        ]);
      }
    }
  }

  for (const claim of normalized.claims) {
    if (claim.polarity !== "fails_to_replicate") {
      continue;
    }
    const linkedRecommendations = normalized.recommendations.filter((rec) =>
      rec.derivedFrom.includes(claim.id) || rec.from === claim.subject || rec.to === claim.object
    );
    if (claim.confidence >= policy.failedReplicationHoldConfidence && !claim.curatorDecision) {
      blockers.push({
        code: "failed_replication_without_curator_outcome",
        claimId: claim.id,
        recommendationIds: linkedRecommendations.map((rec) => rec.id),
        message: "High-confidence failed replication evidence needs a curator outcome before graph boosts continue."
      });
      for (const rec of linkedRecommendations) {
        holdRecommendation(recommendationActions.get(rec.id), "failed_replication", [
          "Downgrade recommendation confidence until the failed replication is resolved.",
          "Expose failed-replication context beside the graph edge."
        ]);
      }
    }
  }

  for (const rec of normalized.recommendations) {
    const recAction = recommendationActions.get(rec.id);
    const derivedClaims = rec.derivedFrom.map((claimId) => claimsById.get(claimId)).filter(Boolean);
    const publicEvidenceCount = derivedClaims.filter((claim) => claim.visibility === "public").length;
    const negativeEvidenceCount = derivedClaims.filter((claim) => NEGATIVE_POLARITIES.has(claim.polarity)).length;
    if (!derivedClaims.length) {
      warnings.push({
        code: "recommendation_without_evidence",
        recommendationId: rec.id,
        message: "Recommendation has no explicit evidence chain."
      });
      recAction.decision = "needs_evidence";
      recAction.reasons.push("missing_evidence_chain");
    }
    if (negativeEvidenceCount > 0 && publicEvidenceCount === 0) {
      holdRecommendation(recAction, "negative_context_not_public", [
        "Add a public explanation for the negative-evidence context before recommendation publication."
      ]);
    }
  }

  const recommendationSummary = [...recommendationActions.values()];
  const status = blockers.length ? "block_publication" : warnings.length ? "needs_review" : "publish_ready";
  return {
    status,
    generatedAt: now.toISOString(),
    graphId: normalized.graphId,
    digest: digest({
      graphId: normalized.graphId,
      blockers,
      warnings,
      recommendationSummary
    }),
    counts: {
      claims: normalized.claims.length,
      recommendations: normalized.recommendations.length,
      blockers: blockers.length,
      warnings: warnings.length,
      heldRecommendations: recommendationSummary.filter((rec) => rec.decision === "hold").length
    },
    blockers,
    warnings,
    actions,
    claimActions: [...claimActions.values()],
    recommendationActions: recommendationSummary,
    policy
  };
}

export function normalizePacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new TypeError("A graph packet object is required.");
  }
  const graphId = nonEmpty(packet.graphId, "graphId");
  const entities = Array.isArray(packet.entities) ? packet.entities.map(normalizeEntity) : [];
  const entityIds = new Set(entities.map((entity) => entity.id));
  const claims = ensureArray(packet.claims, "claims").map((claim) => normalizeClaim(claim, entityIds));
  const recommendations = ensureArray(packet.recommendations, "recommendations").map((rec) =>
    normalizeRecommendation(rec, entityIds)
  );
  return {
    graphId,
    generatedAt: packet.generatedAt ?? new Date().toISOString(),
    entities,
    claims,
    recommendations,
    policy: packet.policy ?? {}
  };
}

export function scoreEvidenceConflict(positiveClaims, negativeClaims) {
  const positiveStrength = positiveClaims.reduce((sum, claim) => sum + claim.confidence * evidenceWeight(claim), 0);
  const negativeStrength = negativeClaims.reduce((sum, claim) => sum + claim.confidence * evidenceWeight(claim), 0);
  const total = positiveStrength + negativeStrength;
  if (!total) {
    return 0;
  }
  const balance = Math.min(positiveStrength, negativeStrength) / Math.max(positiveStrength, negativeStrength);
  const negativePresence = negativeStrength / total;
  return round((negativePresence * 0.7 + balance * 0.3), 3);
}

export function buildReviewerPacket(packet, options = {}) {
  const evaluation = evaluateNegativeEvidenceGraph(packet, options);
  return {
    title: "SCIBASE Scientific Knowledge Graph Negative-Evidence Guard",
    issue: "SCIBASE.AI#17",
    claim: "/claim #17",
    purpose:
      "Prevent public knowledge graph recommendations from hiding contradictions, retractions, failed replications, or private negative evidence.",
    evaluation,
    reviewerChecklist: [
      "Every public recommendation has an explicit evidence chain.",
      "Retracted evidence blocks dependent graph paths.",
      "Contradictory evidence opens a curator review before publication.",
      "Failed replication evidence downgrades recommendations until resolved.",
      "Private or embargoed evidence is not leaked into public recommendation paths."
    ]
  };
}

export function renderMarkdownReport(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  const lines = [
    "# Negative-Evidence Graph Guard Report",
    "",
    `Issue: ${review.issue}`,
    `Claim marker: \`${review.claim}\``,
    `Status: \`${evaluation.status}\``,
    `Digest: \`${evaluation.digest}\``,
    "",
    "## Reviewer Checklist",
    ...review.reviewerChecklist.map((item) => `- ${item}`),
    "",
    "## Counts",
    `- Claims inspected: ${evaluation.counts.claims}`,
    `- Recommendations inspected: ${evaluation.counts.recommendations}`,
    `- Blockers: ${evaluation.counts.blockers}`,
    `- Warnings: ${evaluation.counts.warnings}`,
    `- Held recommendations: ${evaluation.counts.heldRecommendations}`,
    "",
    "## Blockers",
    ...formatFindings(evaluation.blockers),
    "",
    "## Warnings",
    ...formatFindings(evaluation.warnings),
    "",
    "## Recommendation Actions",
    ...evaluation.recommendationActions.map(
      (action) =>
        `- ${action.recommendationId}: ${action.decision} (${action.reasons.length ? action.reasons.join(", ") : "no holds"})`
    ),
    "",
    "## Required Actions",
    ...(
      evaluation.actions.length
        ? evaluation.actions.map((action) => `- ${action.type}: ${action.reason}`)
        : ["- No curator actions required."]
    )
  ];
  return `${lines.join("\n")}\n`;
}

export function renderSvgSummary(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  const safeStatus = escapeXml(evaluation.status);
  const held = evaluation.counts.heldRecommendations;
  const blockers = evaluation.counts.blockers;
  const warnings = evaluation.counts.warnings;
  const barWidth = (value, max) => Math.max(10, Math.round((value / Math.max(max, 1)) * 320));
  const max = Math.max(blockers, warnings, held, 1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360" role="img" aria-labelledby="title desc">
  <title id="title">Negative-Evidence Graph Guard Summary</title>
  <desc id="desc">Reviewer summary for SCIBASE knowledge graph negative evidence publication guard.</desc>
  <rect width="720" height="360" fill="#f8fafc"/>
  <rect x="32" y="28" width="656" height="304" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="56" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">Negative-Evidence Graph Guard</text>
  <text x="56" y="104" font-family="Arial, sans-serif" font-size="15" fill="#334155">Status: ${safeStatus} | Digest: ${escapeXml(evaluation.digest.slice(0, 16))}</text>
  ${svgMetric("Blockers", blockers, 56, 148, barWidth(blockers, max), "#dc2626")}
  ${svgMetric("Warnings", warnings, 56, 198, barWidth(warnings, max), "#d97706")}
  ${svgMetric("Held recommendations", held, 56, 248, barWidth(held, max), "#2563eb")}
  <text x="56" y="306" font-family="Arial, sans-serif" font-size="14" fill="#475569">Synthetic data only. No external APIs, credentials, private projects, or live research records.</text>
</svg>
`;
}

export function demoPacket() {
  return {
    graphId: "scibase-kg-negative-evidence-demo",
    generatedAt: "2026-06-04T00:00:00.000Z",
    policy: {
      contradictionHoldConfidence: 0.58,
      failedReplicationHoldConfidence: 0.55,
      staleReviewDays: 30
    },
    entities: [
      { id: "paper:crispr-neuro-2024", type: "paper", label: "CRISPR clustering in neural organoids" },
      { id: "dataset:organoid-response", type: "dataset", label: "Organoid response matrix" },
      { id: "method:cluster-protocol-v2", type: "protocol", label: "Cluster protocol v2" },
      { id: "finding:gene-x-effect", type: "finding", label: "Gene X effect on differentiation" }
    ],
    claims: [
      {
        id: "claim:supports-gene-x",
        subject: "paper:crispr-neuro-2024",
        predicate: "supports",
        object: "finding:gene-x-effect",
        polarity: "supports",
        confidence: 0.79,
        visibility: "public",
        reviewedAt: "2026-05-24T00:00:00.000Z",
        source: {
          doi: "10.5555/scibase.synthetic.1001",
          title: "Synthetic positive evidence for Gene X",
          status: "published",
          issuedAt: "2026-05-20T00:00:00.000Z"
        }
      },
      {
        id: "claim:failed-replication-gene-x",
        subject: "paper:crispr-neuro-2024",
        predicate: "supports",
        object: "finding:gene-x-effect",
        polarity: "fails_to_replicate",
        confidence: 0.83,
        visibility: "public",
        reviewedAt: "2026-05-25T00:00:00.000Z",
        source: {
          doi: "10.5555/scibase.synthetic.2002",
          title: "Synthetic replication failure for Gene X",
          status: "published",
          issuedAt: "2026-05-24T00:00:00.000Z"
        }
      },
      {
        id: "claim:retracted-dataset-link",
        subject: "dataset:organoid-response",
        predicate: "derived_from",
        object: "method:cluster-protocol-v2",
        polarity: "retracts",
        confidence: 0.91,
        visibility: "public",
        reviewedAt: "2026-05-23T00:00:00.000Z",
        source: {
          doi: "10.5555/scibase.synthetic.3003",
          title: "Synthetic dataset withdrawal notice",
          status: "retracted",
          issuedAt: "2026-05-23T00:00:00.000Z"
        }
      },
      {
        id: "claim:embargoed-contradiction",
        subject: "paper:crispr-neuro-2024",
        predicate: "uses",
        object: "dataset:organoid-response",
        polarity: "contradicts",
        confidence: 0.68,
        visibility: "embargoed",
        reviewedAt: "2026-04-01T00:00:00.000Z",
        source: {
          title: "Synthetic embargoed contradiction memo",
          status: "preprint",
          issuedAt: "2026-03-31T00:00:00.000Z"
        }
      }
    ],
    recommendations: [
      {
        id: "rec:recommend-gene-x-dataset",
        from: "paper:crispr-neuro-2024",
        to: "dataset:organoid-response",
        visibility: "public",
        reason: "Entity co-occurrence and shared method path",
        derivedFrom: ["claim:supports-gene-x", "claim:failed-replication-gene-x", "claim:embargoed-contradiction"]
      },
      {
        id: "rec:recommend-protocol-v2",
        from: "dataset:organoid-response",
        to: "method:cluster-protocol-v2",
        visibility: "public",
        reason: "Dataset method lineage",
        derivedFrom: ["claim:retracted-dataset-link"]
      }
    ]
  };
}

function normalizeEntity(entity) {
  return {
    id: nonEmpty(entity.id, "entity.id"),
    type: nonEmpty(entity.type, "entity.type"),
    label: nonEmpty(entity.label, "entity.label")
  };
}

function normalizeClaim(claim, entityIds) {
  const subject = nonEmpty(claim.subject, "claim.subject");
  const predicate = nonEmpty(claim.predicate, "claim.predicate");
  const object = nonEmpty(claim.object, "claim.object");
  if (!entityIds.has(subject) || !entityIds.has(object)) {
    throw new Error(`Claim ${claim.id ?? "(missing id)"} references an unknown entity.`);
  }
  const polarity = nonEmpty(claim.polarity, "claim.polarity");
  if (!NEGATIVE_POLARITIES.has(polarity) && !POSITIVE_POLARITIES.has(polarity)) {
    throw new Error(`Unsupported evidence polarity: ${polarity}`);
  }
  const confidence = Number(claim.confidence ?? 0);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`Claim ${claim.id ?? "(missing id)"} confidence must be between 0 and 1.`);
  }
  return {
    id: nonEmpty(claim.id, "claim.id"),
    subject,
    predicate,
    object,
    tripleKey: `${subject}|${predicate}|${object}`,
    polarity,
    confidence,
    visibility: claim.visibility ?? "public",
    reviewedAt: claim.reviewedAt,
    curatorDecision: claim.curatorDecision,
    source: {
      doi: claim.source?.doi,
      title: claim.source?.title ?? "Untitled evidence source",
      status: claim.source?.status ?? "published",
      issuedAt: claim.source?.issuedAt
    }
  };
}

function normalizeRecommendation(rec, entityIds) {
  const from = nonEmpty(rec.from, "recommendation.from");
  const to = nonEmpty(rec.to, "recommendation.to");
  if (!entityIds.has(from) || !entityIds.has(to)) {
    throw new Error(`Recommendation ${rec.id ?? "(missing id)"} references an unknown entity.`);
  }
  return {
    id: nonEmpty(rec.id, "recommendation.id"),
    from,
    to,
    visibility: rec.visibility ?? "public",
    reason: rec.reason ?? "No reason provided.",
    derivedFrom: Array.isArray(rec.derivedFrom) ? rec.derivedFrom : []
  };
}

function holdRecommendation(action, reason, requiredActions) {
  if (!action) {
    return;
  }
  action.decision = "hold";
  if (!action.reasons.includes(reason)) {
    action.reasons.push(reason);
  }
  for (const item of requiredActions) {
    if (!action.requiredActions.includes(item)) {
      action.requiredActions.push(item);
    }
  }
}

function evidenceWeight(claim) {
  if (claim.source.status === "retracted") {
    return 1.2;
  }
  if (claim.visibility !== "public") {
    return 0.75;
  }
  if (claim.source.doi) {
    return 1;
  }
  return 0.85;
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }
  return groups;
}

function daysBetween(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
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

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatFindings(findings) {
  if (!findings.length) {
    return ["- None."];
  }
  return findings.map((finding) => `- ${finding.code}: ${finding.message}`);
}

function svgMetric(label, value, x, y, width, color) {
  return `<text x="${x}" y="${y - 10}" font-family="Arial, sans-serif" font-size="14" fill="#334155">${escapeXml(label)}: ${value}</text>
  <rect x="${x}" y="${y}" width="360" height="20" rx="4" fill="#e2e8f0"/>
  <rect x="${x}" y="${y}" width="${width}" height="20" rx="4" fill="${color}"/>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
