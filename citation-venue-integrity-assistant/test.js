"use strict";

const assert = require("assert");
const { assessCitationVenueIntegrity } = require("./index");
const { mixedVenuePacket, readyOnlyPacket } = require("./sample-data");

function testBlocksPredatoryVenueSignals() {
  const result = assessCitationVenueIntegrity(mixedVenuePacket);
  const blocked = result.candidates.find((candidate) => candidate.candidateId === "candidate-blocked");
  const codes = blocked.checks.map((check) => check.code);

  assert.strictEqual(result.status, "hold_citation_insertions");
  assert.strictEqual(blocked.action, "block_insertion");
  assert(codes.includes("implausible_acceptance_timeline"));
  assert(codes.includes("disputed_indexing_claim"));
  assert(codes.includes("fake_impact_factor_signal"));
  assert(codes.includes("paper_mill_template_signal"));
  assert(codes.includes("hijacked_journal_identity_risk"));
  assert(blocked.riskScore >= 70);
}

function testWarnsForWeakVenueEvidence() {
  const result = assessCitationVenueIntegrity(mixedVenuePacket);
  const warning = result.candidates.find((candidate) => candidate.candidateId === "candidate-warning");
  const codes = warning.checks.map((check) => check.code);

  assert.strictEqual(warning.action, "warn_before_insertion");
  assert(codes.includes("weak_indexing_evidence"));
  assert(codes.includes("weak_editorial_board_evidence"));
  assert(codes.includes("special_issue_spike"));
}

function testAllowsReputableVenue() {
  const result = assessCitationVenueIntegrity(readyOnlyPacket);
  const candidate = result.candidates[0];

  assert.strictEqual(result.status, "ready");
  assert.strictEqual(candidate.action, "allow_insertion");
  assert.strictEqual(candidate.checks.length, 0);
}

function testDigestIsDeterministic() {
  const first = assessCitationVenueIntegrity(mixedVenuePacket);
  const second = assessCitationVenueIntegrity(mixedVenuePacket);

  assert.match(first.auditDigest, /^[a-f0-9]{64}$/);
  assert.strictEqual(first.auditDigest, second.auditDigest);
}

function run() {
  testBlocksPredatoryVenueSignals();
  testWarnsForWeakVenueEvidence();
  testAllowsReputableVenue();
  testDigestIsDeterministic();
  console.log("4 tests passed");
}

run();
