import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewerPacket,
  demoPacket,
  evaluateRevenueRecognitionPacket,
  normalizePacket,
  recognizeObligation,
  renderMarkdownReport,
  renderSvgSummary
} from "../src/index.js";

test("blocks premature subscription revenue recognition", () => {
  const result = evaluateRevenueRecognitionPacket(demoPacket(), {
    asOf: "2026-06-04T00:00:00.000Z"
  });

  assert.equal(result.status, "block_close");
  assert.ok(result.blockers.some((blocker) => blocker.code === "premature_revenue_recognition"));
  assert.ok(
    result.obligationActions.some(
      (action) => action.obligationId === "obl:annual-subscription" && action.decision === "hold"
    )
  );
});

test("blocks unconsumed compute credits", () => {
  const result = evaluateRevenueRecognitionPacket(demoPacket(), {
    asOf: "2026-06-04T00:00:00.000Z"
  });

  assert.ok(result.blockers.some((blocker) => blocker.code === "usage_credits_recognized_before_consumption"));
  const usageAction = result.obligationActions.find((action) => action.obligationId === "obl:compute-credits");
  assert.equal(usageAction.decision, "hold");
  assert.equal(usageAction.allowedRecognizedCents, 120000);
});

test("blocks missing delivery evidence for recognized license revenue", () => {
  const result = evaluateRevenueRecognitionPacket(demoPacket(), {
    asOf: "2026-06-04T00:00:00.000Z"
  });

  assert.ok(result.blockers.some((blocker) => blocker.code === "missing_recognition_evidence"));
  assert.ok(
    result.obligationActions.some(
      (action) => action.obligationId === "obl:analytics-license-export" && action.reasons.includes("missing_recognition_evidence")
    )
  );
});

test("accepts a clean fully delivered synthetic close packet", () => {
  const packet = demoPacket();
  packet.asOf = "2027-01-02T00:00:00.000Z";
  packet.contracts[0].obligations[0].recognizedCents = 1800000;
  packet.contracts[0].obligations[1].recognizedCents = 600000;
  packet.contracts[0].obligations[1].expiresAt = "2026-12-31T23:59:59.000Z";
  packet.contracts[0].obligations[1].evidence = { state: "complete", reference: "synthetic-expiry-ledger" };
  packet.contracts[1].obligations[0].evidence = { state: "complete", reference: "synthetic-export-receipt" };

  const result = evaluateRevenueRecognitionPacket(packet, {
    asOf: "2027-01-02T00:00:00.000Z"
  });

  assert.equal(result.status, "close_ready");
  assert.equal(result.totals.blockers, 0);
  assert.equal(result.totals.heldObligations, 0);
});

test("normalizes packets and rejects bad cent amounts", () => {
  assert.equal(normalizePacket(demoPacket()).contracts.length, 2);
  const broken = demoPacket();
  broken.contracts[0].invoiceCents = 23.4;
  assert.throws(() => normalizePacket(broken), /integer cent amount/);
});

test("recognizes subscription progress by service window", () => {
  const packet = normalizePacket(demoPacket());
  const contract = packet.contracts[0];
  const obligation = contract.obligations[0];
  const recognition = recognizeObligation(contract, obligation, packet.usageEvents, new Date("2026-07-01T00:00:00.000Z"));

  assert.ok(recognition.serviceProgressRatio > 0.49);
  assert.ok(recognition.allowedRecognizedCents < obligation.allocatedCents);
});

test("produces reviewer artifacts with claim marker", () => {
  const packet = demoPacket();
  const review = buildReviewerPacket(packet, { asOf: packet.asOf });
  const markdown = renderMarkdownReport(packet, { asOf: packet.asOf });
  const svg = renderSvgSummary(packet, { asOf: packet.asOf });

  assert.equal(review.claim, "/claim #20");
  assert.match(markdown, /Revenue Recognition Deferral Guard Report/);
  assert.match(markdown, /`\/claim #20`/);
  assert.match(svg, /<svg/);
  assert.match(svg, /Revenue Recognition Deferral Guard/);
});
