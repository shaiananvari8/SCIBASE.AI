"use strict";

const assert = require("assert");
const { assessRepositoryVersionTags, parseTag } = require("./index");
const { mixedRepositoryTagPacket, readyRepositoryTagPacket } = require("./sample-data");

function testRiskyTagIsBlocked() {
  const result = assessRepositoryVersionTags(mixedRepositoryTagPacket);
  const risky = result.proposals.find((proposal) => proposal.proposalId === "reused-preprint-tag");
  const codes = risky.blockers.map((blocker) => blocker.code);

  assert.strictEqual(result.status, "hold_tag_publication");
  assert.strictEqual(risky.decision, "block_release_tag");
  assert(codes.includes("version_tag_collision"));
  assert(codes.includes("metadata_version_drift"));
  assert(codes.includes("doi_metadata_mismatch"));
  assert(codes.includes("artifact_hashes_missing"));
  assert(codes.includes("fork_attribution_missing"));
}

function testManualReviewTagWarnsOnly() {
  const result = assessRepositoryVersionTags(mixedRepositoryTagPacket);
  const review = result.proposals.find((proposal) => proposal.proposalId === "minor-release-needs-review");
  const codes = review.warnings.map((warning) => warning.code);

  assert.strictEqual(review.decision, "manual_review_tag");
  assert.strictEqual(review.blockers.length, 0);
  assert(codes.includes("citation_version_stale"));
  assert(codes.includes("results_hash_missing"));
  assert(codes.includes("changelog_entry_missing"));
}

function testReadyTagIsApproved() {
  const result = assessRepositoryVersionTags(readyRepositoryTagPacket);
  const ready = result.proposals[0];

  assert.strictEqual(result.status, "ready");
  assert.strictEqual(ready.decision, "approve_tag");
  assert.strictEqual(ready.blockers.length, 0);
  assert.strictEqual(ready.warnings.length, 0);
}

function testTagParsingAndDigestAreDeterministic() {
  const first = assessRepositoryVersionTags(mixedRepositoryTagPacket);
  const second = assessRepositoryVersionTags(mixedRepositoryTagPacket);

  assert.deepStrictEqual(parseTag("v1.2.3").parts, [1, 2, 3]);
  assert.deepStrictEqual(parseTag("preprint-v2.1").parts, [2, 1, 0]);
  assert.match(first.auditDigest, /^[a-f0-9]{64}$/);
  assert.strictEqual(first.auditDigest, second.auditDigest);
}

function run() {
  testRiskyTagIsBlocked();
  testManualReviewTagWarnsOnly();
  testReadyTagIsApproved();
  testTagParsingAndDigestAreDeterministic();
  console.log("4 tests passed");
}

run();
