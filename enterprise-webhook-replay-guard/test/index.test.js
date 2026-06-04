import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewerPacket,
  demoPacket,
  evaluateWebhookReplayPacket,
  normalizePacket,
  renderMarkdownReport,
  renderSvgSummary
} from "../src/index.js";

test("blocks replay, stale retry, and missing idempotency risks", () => {
  const result = evaluateWebhookReplayPacket(demoPacket(), { now: "2026-06-04T00:00:00.000Z" });
  assert.equal(result.status, "block_delivery");
  assert.ok(result.blockers.some((blocker) => blocker.code === "duplicate_event_id"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "signature_replay"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "stale_retry_window"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "missing_idempotency_key"));
});

test("blocks out-of-order exports without destination acknowledgement", () => {
  const result = evaluateWebhookReplayPacket(demoPacket(), { now: "2026-06-04T00:00:00.000Z" });
  assert.ok(result.blockers.some((blocker) => blocker.code === "out_of_order_export_batch"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "missing_destination_acknowledgement"));
});

test("accepts a clean ordered enterprise delivery packet", () => {
  const packet = demoPacket();
  packet.destinations[0].ackedExportSequence = 39;
  packet.events = [
    { id: "evt-clean-project", deliveryId: "del-clean-001", destination: "institutional-repository", stream: "project-events", type: "project.created", sequence: 42, attempt: 1, idempotencyKey: "idem-clean-project", signatureDigest: "sig-clean-a", createdAt: "2026-06-03T23:55:00.000Z", signedAt: "2026-06-03T23:55:01.000Z" },
    { id: "evt-clean-export", deliveryId: "del-clean-002", destination: "institutional-repository", stream: "export-events", type: "export.completed", sequence: 43, attempt: 1, idempotencyKey: "idem-clean-export", signatureDigest: "sig-clean-b", createdAt: "2026-06-03T23:56:00.000Z", signedAt: "2026-06-03T23:56:02.000Z", exportBatch: { sequence: 42, manifestDigest: "sha256:clean", records: 10, destinationAck: true } },
    { id: "evt-clean-lms", deliveryId: "del-clean-003", destination: "lms-sync", stream: "course-events", type: "course.sync", sequence: 9, attempt: 1, idempotencyKey: "idem-clean-lms", signatureDigest: "sig-clean-c", createdAt: "2026-06-03T23:57:00.000Z", signedAt: "2026-06-03T23:57:01.000Z" }
  ];
  const result = evaluateWebhookReplayPacket(packet, { now: "2026-06-04T00:00:00.000Z" });
  assert.equal(result.status, "deliver_ready");
  assert.equal(result.counts.blockers, 0);
  assert.equal(result.counts.heldEvents, 0);
});

test("normalizes packets and rejects unknown destinations", () => {
  assert.equal(normalizePacket(demoPacket()).events.length, 4);
  const broken = demoPacket();
  broken.events[0].destination = "missing-destination";
  assert.throws(() => normalizePacket(broken), /unknown destination/);
});

test("renders reviewer artifacts with claim marker", () => {
  const packet = demoPacket();
  const review = buildReviewerPacket(packet, { now: packet.generatedAt });
  const markdown = renderMarkdownReport(packet, { now: packet.generatedAt });
  const svg = renderSvgSummary(packet, { now: packet.generatedAt });
  assert.equal(review.claim, "/claim #19");
  assert.match(markdown, /Enterprise Webhook Replay Guard Report/);
  assert.match(markdown, /`\/claim #19`/);
  assert.match(svg, /<svg/);
});
