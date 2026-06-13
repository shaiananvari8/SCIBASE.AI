import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewerPacket,
  demoPacket,
  evaluateReputationAppeals,
  normalizePacket,
  renderMarkdownReport,
  renderSvgSummary
} from "../src/index.js";

test("holds appeals with weak evidence and conflicted review", () => {
  const result = evaluateReputationAppeals(demoPacket(), { now: "2026-06-13T18:00:00.000Z" });
  assert.equal(result.status, "hold_reputation_change");
  assert.ok(result.blockers.some((blocker) => blocker.code === "insufficient_evidence"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "insufficient_independent_review"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "same_actor_reappeal"));
});

test("flags expired appeal windows and long reinstatement probation", () => {
  const result = evaluateReputationAppeals(demoPacket(), { now: "2026-06-13T18:00:00.000Z" });
  assert.ok(result.blockers.some((blocker) => blocker.code === "appeal_window_expired"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "probation_too_long"));
});

test("releases clean appeal packets", () => {
  const packet = demoPacket();
  packet.appeals = [packet.appeals[0]];
  const result = evaluateReputationAppeals(packet, { now: "2026-06-13T18:00:00.000Z" });
  assert.equal(result.status, "ready_for_reputation_update");
  assert.equal(result.counts.blockers, 0);
  assert.equal(result.counts.heldAppeals, 0);
});

test("rejects malformed packets", () => {
  assert.equal(normalizePacket(demoPacket()).appeals.length, 2);
  const broken = demoPacket();
  broken.appeals[0].evidence = null;
  assert.throws(() => normalizePacket(broken), /appeal\.evidence must be an array/);
});

test("renders reviewer artifacts with issue and claim marker", () => {
  const packet = demoPacket();
  const review = buildReviewerPacket(packet, { now: packet.generatedAt });
  const markdown = renderMarkdownReport(packet, { now: packet.generatedAt });
  const svg = renderSvgSummary(packet, { now: packet.generatedAt });
  assert.equal(review.issue, "SCIBASE.AI#15");
  assert.equal(review.claim, "/claim #15");
  assert.match(markdown, /Reputation Appeal Evidence Guard Report/);
  assert.match(markdown, /`\/claim #15`/);
  assert.match(svg, /<svg/);
});
