"use strict";

const assert = require("assert");
const { assessResearcherReputation } = require("./index");
const { riskySnapshot, cleanSnapshot, staleSnapshot } = require("./sample-data");

function testRiskySnapshotHoldsBadges() {
  const result = assessResearcherReputation(riskySnapshot);
  const researcher = result.researchers[0];
  const blockerCodes = researcher.blockers.map((blocker) => blocker.code);

  assert.strictEqual(result.status, "hold_reputation_badges");
  assert.strictEqual(researcher.status, "hold_reputation_badges");
  assert(blockerCodes.includes("download_burst"));
  assert(blockerCodes.includes("concentrated_download_source"));
  assert(blockerCodes.includes("fork_ring_suspected"));
  assert(blockerCodes.includes("reciprocal_endorsement_cluster"));
  assert(blockerCodes.includes("reproducibility_score_inflation"));
  assert(blockerCodes.includes("weak_reproducibility_evidence"));
  assert(blockerCodes.includes("private_profile_metric_exposure"));
}

function testCleanSnapshotIsReady() {
  const result = assessResearcherReputation(cleanSnapshot);
  const researcher = result.researchers[0];

  assert.strictEqual(result.status, "ready");
  assert.strictEqual(researcher.status, "ready");
  assert.strictEqual(researcher.blockers.length, 0);
  assert.strictEqual(researcher.warnings.length, 0);
  assert(researcher.reputationScore >= 95);
}

function testStaleSnapshotNeedsReviewOnly() {
  const result = assessResearcherReputation(staleSnapshot);
  const researcher = result.researchers[0];

  assert.strictEqual(result.status, "manual_review");
  assert.strictEqual(researcher.status, "manual_review");
  assert.strictEqual(researcher.blockers.length, 0);
  assert.strictEqual(researcher.warnings[0].code, "stale_metric_window");
}

function testDigestIsDeterministic() {
  const first = assessResearcherReputation(riskySnapshot);
  const second = assessResearcherReputation(riskySnapshot);

  assert.match(first.auditDigest, /^[a-f0-9]{64}$/);
  assert.strictEqual(first.auditDigest, second.auditDigest);
}

function run() {
  testRiskySnapshotHoldsBadges();
  testCleanSnapshotIsReady();
  testStaleSnapshotNeedsReviewOnly();
  testDigestIsDeterministic();
  console.log("4 tests passed");
}

run();
