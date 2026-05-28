"use strict";

const assert = require("assert");
const { assessLocalCachePrivacy } = require("./index");
const { mixedCachePacket, readyCachePacket } = require("./sample-data");

function testRiskyCacheIsPurged() {
  const result = assessLocalCachePrivacy(mixedCachePacket);
  const risky = result.snapshots.find((snapshot) => snapshot.snapshotId === "cache-risky");
  const codes = risky.blockers.map((blocker) => blocker.code);

  assert.strictEqual(result.status, "hold_local_cache");
  assert.strictEqual(risky.decision, "purge_or_redact_cache");
  assert(codes.includes("unencrypted_restricted_cache"));
  assert(codes.includes("restricted_localstorage_cache"));
  assert(codes.includes("restricted_text_cached"));
  assert(codes.includes("anonymous_review_identity_cached"));
  assert(codes.includes("restricted_notebook_output_cached"));
  assert(codes.includes("private_collaborator_note_cached"));
  assert(codes.includes("shared_device_cache_retention"));
}

function testWarningCachePersistsWithWarning() {
  const result = assessLocalCachePrivacy(mixedCachePacket);
  const warning = result.snapshots.find((snapshot) => snapshot.snapshotId === "cache-warning");
  const codes = warning.warnings.map((item) => item.code);

  assert.strictEqual(warning.decision, "persist_with_warning");
  assert(codes.includes("stale_cache_snapshot"));
  assert(codes.includes("embargoed_title_cached"));
  assert(codes.includes("stale_notebook_output_cached"));
}

function testReadyCacheAllowed() {
  const result = assessLocalCachePrivacy(readyCachePacket);
  const ready = result.snapshots[0];

  assert.strictEqual(result.status, "ready");
  assert.strictEqual(ready.decision, "allow_cache");
  assert.strictEqual(ready.blockers.length, 0);
  assert.strictEqual(ready.warnings.length, 0);
}

function testDigestIsDeterministic() {
  const first = assessLocalCachePrivacy(mixedCachePacket);
  const second = assessLocalCachePrivacy(mixedCachePacket);

  assert.match(first.auditDigest, /^[a-f0-9]{64}$/);
  assert.strictEqual(first.auditDigest, second.auditDigest);
}

function run() {
  testRiskyCacheIsPurged();
  testWarningCachePersistsWithWarning();
  testReadyCacheAllowed();
  testDigestIsDeterministic();
  console.log("4 tests passed");
}

run();
