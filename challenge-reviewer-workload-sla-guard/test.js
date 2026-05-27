const assert = require("node:assert/strict");
const { evaluateChallengeReviewerWorkload, digest } = require("./index");
const { riskyChallenge, cleanChallenge } = require("./sample-data");

function codes(items) {
  return new Set(items.map((item) => item.code));
}

function testRiskyChallengeHoldsReviewWindow() {
  const result = evaluateChallengeReviewerWorkload(riskyChallenge);
  const blockerCodes = codes(result.blockers);

  assert.equal(result.summary.status, "hold_review_window");
  assert.ok(blockerCodes.has("assigned_reviewer_unavailable"));
  assert.ok(blockerCodes.has("assigned_reviewer_overloaded"));
  assert.ok(blockerCodes.has("critical_stale_review"));
  assert.ok(blockerCodes.has("criterion_capacity_gap"));
  assert.ok(blockerCodes.has("arbitration_backup_gap"));
  assert.ok(result.escalationPlan.length >= 4);
}

function testCleanChallengeIsReady() {
  const result = evaluateChallengeReviewerWorkload(cleanChallenge);

  assert.equal(result.summary.status, "ready_for_review");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.summary.criteriaWithCapacityGaps, 0);
  assert.ok(result.summary.activeArbitrators >= 2);
}

function testDueSoonWarningIsConditional() {
  const challenge = structuredClone(cleanChallenge);
  challenge.reviewers[0].assignments[0].dueAt = "2026-05-28T02:00:00.000Z";

  const result = evaluateChallengeReviewerWorkload(challenge);

  assert.equal(result.summary.status, "conditional_review_ready");
  assert.ok(codes(result.warnings).has("assignment_due_soon"));
  assert.equal(result.blockers.length, 0);
}

function testDigestIsStableAndSensitive() {
  const first = evaluateChallengeReviewerWorkload(cleanChallenge);
  const second = evaluateChallengeReviewerWorkload(cleanChallenge);
  const changed = structuredClone(cleanChallenge);
  changed.reviewers[0].availability.committedHours = 8;
  const third = evaluateChallengeReviewerWorkload(changed);

  assert.equal(first.auditDigest, second.auditDigest);
  assert.notEqual(first.auditDigest, third.auditDigest);
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
}

function run() {
  testRiskyChallengeHoldsReviewWindow();
  testCleanChallengeIsReady();
  testDueSoonWarningIsConditional();
  testDigestIsStableAndSensitive();
  console.log("challenge-reviewer-workload-sla-guard tests passed (4)");
}

run();
