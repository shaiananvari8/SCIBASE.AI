"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = {
  maxRhat: 1.01,
  severeRhat: 1.05,
  minEffectiveSampleSize: 400,
  severeEffectiveSampleSize: 150,
  maxPosteriorShift: 0.2,
  minPriorPredictiveCoverage: 0.7,
  strongClaimProbability: 0.95
};

function assessBayesianPriorSensitivity(packet, policy = {}) {
  const settings = { ...DEFAULT_POLICY, ...policy };
  const generatedAt = new Date(packet.generatedAt || "2026-05-28T00:00:00Z");
  const analyses = (packet.analyses || []).map((analysis) => evaluateAnalysis(analysis, settings));
  const summary = summarize(analyses);
  const payload = {
    generatedAt: generatedAt.toISOString(),
    manuscriptId: packet.manuscriptId || "synthetic-bayesian-manuscript",
    status: summary.status,
    summary,
    analyses
  };

  return {
    ...payload,
    auditDigest: digest(payload)
  };
}

function evaluateAnalysis(analysis, settings) {
  const blockers = [];
  const warnings = [];
  const actions = [];

  checkPriorDisclosure(analysis, blockers, warnings, actions);
  checkPriorSensitivity(analysis, settings, blockers, warnings, actions);
  checkDiagnostics(analysis, settings, blockers, warnings, actions);
  checkPriorPredictive(analysis, settings, blockers, warnings, actions);
  checkClaims(analysis, settings, blockers, warnings, actions);

  const decision = blockers.length > 0
    ? "major_revision_prior_robustness"
    : warnings.length > 0
      ? "minor_revision_prior_robustness"
      : "ready_for_peer_review";

  return {
    analysisId: analysis.id,
    domain: analysis.domain,
    decision,
    blockers,
    warnings,
    actions: [...new Set(actions)]
  };
}

function checkPriorDisclosure(analysis, blockers, warnings, actions) {
  const undisclosed = analysis.priors.filter((prior) => !prior.reported);
  const unjustifiedInformative = analysis.priors.filter((prior) => prior.reported && prior.strength === "informative" && !prior.justification);

  if (undisclosed.length > 0) {
    blockers.push({
      code: "prior_not_reported",
      message: `${undisclosed.length} model prior(s) are used without manuscript disclosure.`
    });
    actions.push("Disclose all model priors with parameter values and rationale.");
  }

  if (unjustifiedInformative.length > 0) {
    warnings.push({
      code: "informative_prior_not_justified",
      message: `${unjustifiedInformative.length} informative prior(s) lack domain justification.`
    });
    actions.push("Add domain rationale or sensitivity analysis for informative priors.");
  }
}

function checkPriorSensitivity(analysis, settings, blockers, warnings, actions) {
  for (const run of analysis.sensitivityRuns) {
    const baseline = run.baselineEstimate;
    const alternate = run.alternateEstimate;
    const shift = Math.abs(alternate - baseline);
    const directionFlips = Math.sign(baseline) !== 0 && Math.sign(alternate) !== 0 && Math.sign(baseline) !== Math.sign(alternate);

    if (directionFlips) {
      blockers.push({
        code: "posterior_direction_flips_under_prior",
        message: `${run.name} changes effect direction from ${round(baseline)} to ${round(alternate)}.`
      });
      actions.push("Mark the manuscript claim as prior-sensitive and add a robustness table.");
    } else if (shift > settings.maxPosteriorShift) {
      warnings.push({
        code: "large_posterior_shift_under_prior",
        message: `${run.name} shifts posterior estimate by ${round(shift)}.`
      });
      actions.push("Report alternate-prior posterior estimates beside the primary model.");
    }
  }
}

function checkDiagnostics(analysis, settings, blockers, warnings, actions) {
  const diagnostics = analysis.diagnostics;

  if (diagnostics.divergentTransitions > 0) {
    blockers.push({
      code: "divergent_transitions_present",
      message: `${diagnostics.divergentTransitions} divergent transition(s) were reported.`
    });
    actions.push("Resolve sampler divergences before accepting posterior claims.");
  }

  if (diagnostics.maxRhat > settings.severeRhat) {
    blockers.push({
      code: "severe_rhat_convergence_failure",
      message: `Maximum R-hat is ${round(diagnostics.maxRhat)}.`
    });
    actions.push("Rerun or reparameterize the model until convergence diagnostics pass.");
  } else if (diagnostics.maxRhat > settings.maxRhat) {
    warnings.push({
      code: "rhat_above_review_threshold",
      message: `Maximum R-hat is ${round(diagnostics.maxRhat)}.`
    });
    actions.push("Include convergence diagnostics and rerun chains if needed.");
  }

  if (diagnostics.minEffectiveSampleSize < settings.severeEffectiveSampleSize) {
    blockers.push({
      code: "severe_effective_sample_size_shortfall",
      message: `Minimum effective sample size is ${diagnostics.minEffectiveSampleSize}.`
    });
    actions.push("Increase sampling effort or simplify the model before review.");
  } else if (diagnostics.minEffectiveSampleSize < settings.minEffectiveSampleSize) {
    warnings.push({
      code: "low_effective_sample_size",
      message: `Minimum effective sample size is ${diagnostics.minEffectiveSampleSize}.`
    });
    actions.push("Report effective sample sizes and rerun where posterior tails are unstable.");
  }
}

function checkPriorPredictive(analysis, settings, blockers, warnings, actions) {
  const check = analysis.priorPredictiveCheck;

  if (!check.reported) {
    blockers.push({
      code: "prior_predictive_check_missing",
      message: "No prior predictive check is reported for the Bayesian model."
    });
    actions.push("Add a prior predictive check before claims are promoted to peer-review text.");
    return;
  }

  if (check.coverage < settings.minPriorPredictiveCoverage) {
    warnings.push({
      code: "weak_prior_predictive_coverage",
      message: `Prior predictive coverage is ${Math.round(check.coverage * 100)}%.`
    });
    actions.push("Revise priors or explain why prior predictive coverage is low.");
  }
}

function checkClaims(analysis, settings, blockers, warnings, actions) {
  for (const claim of analysis.claims) {
    const strongLanguage = ["proves", "conclusive", "definitive"].includes(claim.strength);

    if (strongLanguage && !claim.robustAcrossPriors) {
      blockers.push({
        code: "strong_claim_not_prior_robust",
        message: `${claim.id} uses strong language without prior-robust support.`
      });
      actions.push("Downgrade claim language or add prior-robust evidence.");
    } else if (strongLanguage && claim.posteriorProbability < settings.strongClaimProbability) {
      warnings.push({
        code: "claim_probability_below_strong_language",
        message: `${claim.id} has posterior probability ${round(claim.posteriorProbability)} with strong wording.`
      });
      actions.push("Calibrate the manuscript claim to the posterior probability.");
    }
  }
}

function summarize(analyses) {
  const major = analyses.filter((analysis) => analysis.decision === "major_revision_prior_robustness").length;
  const minor = analyses.filter((analysis) => analysis.decision === "minor_revision_prior_robustness").length;
  const ready = analyses.filter((analysis) => analysis.decision === "ready_for_peer_review").length;
  const blockerCount = analyses.reduce((sum, analysis) => sum + analysis.blockers.length, 0);
  const warningCount = analyses.reduce((sum, analysis) => sum + analysis.warnings.length, 0);
  const status = major > 0 ? "hold_peer_review_claims" : minor > 0 ? "revise_before_review" : "ready";

  return {
    status,
    analysisCount: analyses.length,
    major,
    minor,
    ready,
    blockerCount,
    warningCount
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
  assessBayesianPriorSensitivity,
  DEFAULT_POLICY
};
