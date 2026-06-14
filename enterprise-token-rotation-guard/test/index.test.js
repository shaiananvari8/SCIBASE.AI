import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewerPacket,
  demoPacket,
  evaluateEnterpriseIntegrations,
  normalizePacket,
  renderMarkdownReport,
  renderSvgSummary
} from "../src/index.js";

test("holds stale tokens, orphan owners, and overbroad scopes", () => {
  const result = evaluateEnterpriseIntegrations(demoPacket(), { now: "2026-06-13T19:00:00.000Z" });
  assert.equal(result.status, "hold_integration");
  assert.ok(result.blockers.some((blocker) => blocker.code === "orphan_owner"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "stale_token"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "overbroad_scopes"));
});

test("holds stale audit exports, SSO drift, and missing DPA approval", () => {
  const result = evaluateEnterpriseIntegrations(demoPacket(), { now: "2026-06-13T19:00:00.000Z" });
  assert.ok(result.blockers.some((blocker) => blocker.code === "stale_audit_export"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "sso_group_drift"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "missing_dpa_approval"));
});

test("releases clean enterprise integration packets", () => {
  const packet = demoPacket();
  packet.integrations = [packet.integrations[0]];
  const result = evaluateEnterpriseIntegrations(packet, { now: "2026-06-13T19:00:00.000Z" });
  assert.equal(result.status, "integration_ready");
  assert.equal(result.counts.blockers, 0);
  assert.equal(result.counts.heldIntegrations, 0);
});

test("warns on repeated webhook delivery failures", () => {
  const packet = demoPacket();
  packet.integrations = [{ ...packet.integrations[0], webhookFailures: 3 }];
  const result = evaluateEnterpriseIntegrations(packet, { now: "2026-06-13T19:00:00.000Z" });
  assert.equal(result.status, "needs_admin_review");
  assert.ok(result.warnings.some((warning) => warning.code === "webhook_failure_streak"));
});

test("rejects malformed packets and renders claim artifacts", () => {
  assert.equal(normalizePacket(demoPacket()).integrations.length, 2);
  const broken = demoPacket();
  broken.integrations[0].scopes = "project:read";
  assert.throws(() => normalizePacket(broken), /integration\.scopes must be an array/);

  const packet = demoPacket();
  const review = buildReviewerPacket(packet, { now: packet.generatedAt });
  const markdown = renderMarkdownReport(packet, { now: packet.generatedAt });
  const svg = renderSvgSummary(packet, { now: packet.generatedAt });
  assert.equal(review.claim, "/claim #19");
  assert.match(markdown, /Enterprise Token Rotation Guard Report/);
  assert.match(markdown, /`\/claim #19`/);
  assert.match(svg, /<svg/);
});
