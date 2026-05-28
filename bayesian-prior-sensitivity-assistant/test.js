"use strict";

const assert = require("assert");
const { assessBayesianPriorSensitivity } = require("./index");
const { mixedBayesianReviewPacket, readyBayesianReviewPacket } = require("./sample-data");

function testHighRiskBayesianAnalysisIsHeld() {
  const result = assessBayesianPriorSensitivity(mixedBayesianReviewPacket);
  const clinical = result.analyses.find((analysis) => analysis.analysisId === "clinical-survival-model");
  const codes = clinical.blockers.map((blocker) => blocker.code);

  assert.strictEqual(result.status, "hold_peer_review_claims");
  assert.strictEqual(clinical.decision, "major_revision_prior_robustness");
  assert(codes.includes("prior_not_reported"));
  assert(codes.includes("posterior_direction_flips_under_prior"));
  assert(codes.includes("divergent_transitions_present"));
  assert(codes.includes("severe_rhat_convergence_failure"));
  assert(codes.includes("severe_effective_sample_size_shortfall"));
  assert(codes.includes("prior_predictive_check_missing"));
  assert(codes.includes("strong_claim_not_prior_robust"));
}

function testModerateBayesianAnalysisNeedsMinorRevision() {
  const result = assessBayesianPriorSensitivity(mixedBayesianReviewPacket);
  const materials = result.analyses.find((analysis) => analysis.analysisId === "materials-yield-model");
  const codes = materials.warnings.map((warning) => warning.code);

  assert.strictEqual(materials.decision, "minor_revision_prior_robustness");
  assert(codes.includes("informative_prior_not_justified"));
  assert(codes.includes("rhat_above_review_threshold"));
  assert(codes.includes("low_effective_sample_size"));
  assert(codes.includes("weak_prior_predictive_coverage"));
}

function testReadyBayesianAnalysisPasses() {
  const result = assessBayesianPriorSensitivity(readyBayesianReviewPacket);
  const ready = result.analyses[0];

  assert.strictEqual(result.status, "ready");
  assert.strictEqual(ready.decision, "ready_for_peer_review");
  assert.strictEqual(ready.blockers.length, 0);
  assert.strictEqual(ready.warnings.length, 0);
}

function testDigestIsDeterministic() {
  const first = assessBayesianPriorSensitivity(mixedBayesianReviewPacket);
  const second = assessBayesianPriorSensitivity(mixedBayesianReviewPacket);

  assert.match(first.auditDigest, /^[a-f0-9]{64}$/);
  assert.strictEqual(first.auditDigest, second.auditDigest);
}

function run() {
  testHighRiskBayesianAnalysisIsHeld();
  testModerateBayesianAnalysisNeedsMinorRevision();
  testReadyBayesianAnalysisPasses();
  testDigestIsDeterministic();
  console.log("4 tests passed");
}

run();
