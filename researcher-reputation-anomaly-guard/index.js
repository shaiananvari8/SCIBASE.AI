"use strict";

const crypto = require("crypto");

const DEFAULTS = {
  burstWindowDays: 7,
  baselineWindowDays: 30,
  downloadBurstMultiplier: 3,
  maxSameNetworkRatio: 0.55,
  minInstitutionDiversity: 3,
  maxMetricAgeDays: 45,
  maxSelfControlledForkRatio: 0.35,
  maxReciprocalEndorsementRatio: 0.4,
  maxLabControlledRunRatio: 0.35
};

function assessResearcherReputation(snapshot, options = {}) {
  const settings = { ...DEFAULTS, ...options };
  const now = new Date(snapshot.generatedAt || "2026-05-27T00:00:00Z");
  const researchers = (snapshot.researchers || []).map((researcher) =>
    assessResearcher(researcher, now, settings)
  );
  const summary = summarize(researchers);
  const payload = {
    generatedAt: snapshot.generatedAt || now.toISOString(),
    status: summary.status,
    summary,
    researchers
  };

  return {
    ...payload,
    auditDigest: digestFor(payload)
  };
}

function assessResearcher(researcher, now, settings) {
  const blockers = [];
  const warnings = [];
  const actions = [];

  checkDownloadAnomalies(researcher, now, settings, blockers, warnings, actions);
  checkForkAnomalies(researcher, settings, blockers, warnings, actions);
  checkEndorsementAnomalies(researcher, settings, blockers, warnings, actions);
  checkReproducibilityInflation(researcher, settings, blockers, warnings, actions);
  checkPrivacyExposure(researcher, blockers, warnings, actions);
  checkMetricFreshness(researcher, now, settings, blockers, warnings, actions);

  const reputationScore = Math.max(0, 100 - blockers.length * 18 - warnings.length * 7);
  const status = blockers.length > 0 ? "hold_reputation_badges" : warnings.length > 0 ? "manual_review" : "ready";

  return {
    researcherId: researcher.id,
    displayName: researcher.displayName,
    status,
    reputationScore,
    blockers,
    warnings,
    actions: uniqueActions(actions)
  };
}

function checkDownloadAnomalies(researcher, now, settings, blockers, warnings, actions) {
  const events = researcher.metrics?.downloads || [];
  const recentCutoff = daysAgo(now, settings.burstWindowDays);
  const baselineCutoff = daysAgo(now, settings.burstWindowDays + settings.baselineWindowDays);
  const recent = events.filter((event) => new Date(event.date) >= recentCutoff);
  const baseline = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= baselineCutoff && eventDate < recentCutoff;
  });
  const recentTotal = sum(recent, "count");
  const baselineDaily = Math.max(1, sum(baseline, "count") / Math.max(1, settings.baselineWindowDays));
  const recentDaily = recentTotal / Math.max(1, settings.burstWindowDays);
  const maxSameNetworkRatio = Math.max(0, ...recent.map((event) => event.sameNetworkRatio || 0));
  const recentInstitutions = new Set(recent.flatMap((event) => event.institutions || [])).size;

  if (recent.length > 0 && recentDaily >= baselineDaily * settings.downloadBurstMultiplier) {
    blockers.push({
      code: "download_burst",
      message: `Recent downloads are ${round(recentDaily / baselineDaily)}x above baseline.`
    });
    actions.push("Hold download-derived badges until traffic provenance is reviewed.");
  }

  if (recentTotal >= 50 && maxSameNetworkRatio > settings.maxSameNetworkRatio) {
    blockers.push({
      code: "concentrated_download_source",
      message: `${Math.round(maxSameNetworkRatio * 100)}% of recent downloads came from one network cluster.`
    });
    actions.push("Require bot and same-network traffic review before publishing metrics.");
  }

  if (recentTotal >= 50 && recentInstitutions < settings.minInstitutionDiversity) {
    warnings.push({
      code: "low_download_diversity",
      message: `Only ${recentInstitutions} institutions appear in the recent download window.`
    });
    actions.push("Show metric as provisional until institution diversity improves.");
  }
}

function checkForkAnomalies(researcher, settings, blockers, warnings, actions) {
  const forks = researcher.metrics?.forks || [];
  if (forks.length === 0) return;

  const selfControlled = forks.filter((fork) => fork.selfControlled || fork.samePaymentAdmin || fork.identityConfidence < 0.6);
  const noDownstreamWork = forks.filter((fork) => !fork.hasDownstreamCommit);
  const selfRatio = selfControlled.length / forks.length;

  if (selfRatio > settings.maxSelfControlledForkRatio) {
    blockers.push({
      code: "fork_ring_suspected",
      message: `${selfControlled.length} of ${forks.length} forks look self-controlled or weakly verified.`
    });
    actions.push("Exclude suspect forks from reputation scoring and queue identity review.");
  }

  if (noDownstreamWork.length / forks.length > 0.6) {
    warnings.push({
      code: "thin_fork_activity",
      message: `${noDownstreamWork.length} forks have no downstream commit evidence.`
    });
    actions.push("Down-rank fork-count badges until reuse evidence is available.");
  }
}

function checkEndorsementAnomalies(researcher, settings, blockers, warnings, actions) {
  const endorsements = researcher.metrics?.endorsements || [];
  if (endorsements.length === 0) return;

  const reciprocal = endorsements.filter((endorsement) => endorsement.reciprocal);
  const newSharedAffiliation = endorsements.filter(
    (endorsement) => endorsement.sharedAffiliation && endorsement.endorserAccountAgeDays < 30
  );
  const unverified = endorsements.filter((endorsement) => !endorsement.verifiedIdentity);

  if (reciprocal.length / endorsements.length > settings.maxReciprocalEndorsementRatio) {
    blockers.push({
      code: "reciprocal_endorsement_cluster",
      message: `${reciprocal.length} of ${endorsements.length} endorsements are reciprocal.`
    });
    actions.push("Hold endorsement badges and require independent reviewer validation.");
  }

  if (newSharedAffiliation.length >= 2) {
    warnings.push({
      code: "new_affiliation_endorsements",
      message: `${newSharedAffiliation.length} endorsements came from new accounts at the same affiliation.`
    });
    actions.push("Mark endorsement signal as provisional.");
  }

  if (unverified.length > 0) {
    warnings.push({
      code: "unverified_endorsers",
      message: `${unverified.length} endorsers lack verified identity evidence.`
    });
  }
}

function checkReproducibilityInflation(researcher, settings, blockers, warnings, actions) {
  const runs = researcher.metrics?.reproducibilityRuns || [];
  if (runs.length === 0) return;

  const highScoreRuns = runs.filter((run) => run.score >= 0.95);
  const labControlledRuns = highScoreRuns.filter((run) => run.runnerRelation === "self" || run.runnerRelation === "same_lab");
  const weakEvidenceRuns = highScoreRuns.filter(
    (run) => !run.environmentPinned || !run.datasetHashMatch || !run.notebookOutputFresh || run.rerunStatus !== "passed"
  );

  if (highScoreRuns.length > 0 && labControlledRuns.length / highScoreRuns.length > settings.maxLabControlledRunRatio) {
    blockers.push({
      code: "reproducibility_score_inflation",
      message: `${labControlledRuns.length} high-score reproducibility runs are self or lab controlled.`
    });
    actions.push("Require independent reproducibility evidence before showing the score badge.");
  }

  if (weakEvidenceRuns.length > 0) {
    blockers.push({
      code: "weak_reproducibility_evidence",
      message: `${weakEvidenceRuns.length} high-score runs have missing environment, data, or output freshness evidence.`
    });
    actions.push("Remove weak runs from score calculation.");
  }
}

function checkPrivacyExposure(researcher, blockers, warnings, actions) {
  const profileMode = researcher.profileMode || "public";
  const publicBadges = researcher.publicBadges || [];
  const exposesMetricBadge = publicBadges.some((badge) =>
    ["downloads", "forks", "endorsements", "reproducibility"].includes(badge)
  );

  if (profileMode !== "public" && exposesMetricBadge) {
    blockers.push({
      code: "private_profile_metric_exposure",
      message: `Profile mode is ${profileMode}, but public metric badges are enabled.`
    });
    actions.push("Hide reputation badges until profile visibility is reconciled.");
  }

  if (researcher.anonymousReviewParticipant && publicBadges.includes("endorsements")) {
    warnings.push({
      code: "anonymous_review_linkage_risk",
      message: "Endorsement badges could reveal anonymous-review participation patterns."
    });
    actions.push("Aggregate endorsement counts before showing them on anonymous-review profiles.");
  }
}

function checkMetricFreshness(researcher, now, settings, blockers, warnings, actions) {
  const checkedAt = researcher.metrics?.checkedAt;
  if (!checkedAt) {
    warnings.push({
      code: "missing_metric_check_time",
      message: "Metric snapshot does not include a checkedAt timestamp."
    });
    actions.push("Refresh metric evidence before publication.");
    return;
  }

  const ageDays = (now - new Date(checkedAt)) / (1000 * 60 * 60 * 24);
  if (ageDays > settings.maxMetricAgeDays) {
    warnings.push({
      code: "stale_metric_window",
      message: `Metric evidence is ${Math.round(ageDays)} days old.`
    });
    actions.push("Refresh metric windows before rendering public badges.");
  }
}

function summarize(researchers) {
  const blockerCount = sum(researchers, "blockers.length");
  const warningCount = sum(researchers, "warnings.length");
  const heldResearchers = researchers.filter((researcher) => researcher.status === "hold_reputation_badges").length;
  const reviewResearchers = researchers.filter((researcher) => researcher.status === "manual_review").length;
  const status = heldResearchers > 0 ? "hold_reputation_badges" : reviewResearchers > 0 ? "manual_review" : "ready";

  return {
    status,
    researcherCount: researchers.length,
    heldResearchers,
    reviewResearchers,
    blockerCount,
    warningCount
  };
}

function digestFor(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
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

function sum(items, path) {
  return items.reduce((total, item) => total + Number(getPath(item, path) || 0), 0);
}

function getPath(item, path) {
  return path.split(".").reduce((current, part) => (current == null ? undefined : current[part]), item);
}

function daysAgo(now, days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function uniqueActions(actions) {
  return [...new Set(actions)];
}

function round(value) {
  return Math.round(value * 10) / 10;
}

module.exports = {
  assessResearcherReputation,
  DEFAULTS
};
