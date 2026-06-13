import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewerPacket,
  demoPacket,
  evaluateComputeBudgets,
  normalizePacket,
  renderMarkdownReport,
  renderSvgSummary
} from "../src/index.js";

test("holds expired grant, billing hold, and missing purchase order", () => {
  const result = evaluateComputeBudgets(demoPacket(), { now: "2026-06-13T18:30:00.000Z" });
  assert.equal(result.status, "hold_billing");
  assert.ok(result.blockers.some((blocker) => blocker.code === "missing_award_id"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "expired_grant"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "grant_billing_hold"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "missing_purchase_order"));
});

test("holds large overages and low margin usage", () => {
  const result = evaluateComputeBudgets(demoPacket(), { now: "2026-06-13T18:30:00.000Z" });
  assert.ok(result.blockers.some((blocker) => blocker.code === "budget_overage"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "low_compute_margin"));
});

test("releases clean compute billing packets", () => {
  const packet = demoPacket();
  packet.accounts = [packet.accounts[0]];
  const result = evaluateComputeBudgets(packet, { now: "2026-06-13T18:30:00.000Z" });
  assert.equal(result.status, "ready_to_bill");
  assert.equal(result.counts.blockers, 0);
  assert.equal(result.counts.heldAccounts, 0);
});

test("warns on small budget overages", () => {
  const packet = demoPacket();
  packet.accounts = [{
    id: "acct-small-overage",
    institution: "Small Lab",
    grantId: "grant-active-nsf",
    billingMode: "card",
    purchaseOrder: "",
    budgetLimit: 1000,
    currentSpend: 980,
    pendingUsageCost: 40,
    cloudCost: 10
  }];
  const result = evaluateComputeBudgets(packet, { now: "2026-06-13T18:30:00.000Z" });
  assert.equal(result.status, "needs_finance_review");
  assert.ok(result.warnings.some((warning) => warning.code === "minor_budget_overage"));
});

test("rejects malformed packets and renders claim artifacts", () => {
  assert.equal(normalizePacket(demoPacket()).accounts.length, 2);
  const broken = demoPacket();
  broken.accounts[0].budgetLimit = "not-a-number";
  assert.throws(() => normalizePacket(broken), /budgetLimit must be finite/);

  const packet = demoPacket();
  const review = buildReviewerPacket(packet, { now: packet.generatedAt });
  const markdown = renderMarkdownReport(packet, { now: packet.generatedAt });
  const svg = renderSvgSummary(packet, { now: packet.generatedAt });
  assert.equal(review.claim, "/claim #20");
  assert.match(markdown, /Grant Compute Budget Guard Report/);
  assert.match(markdown, /`\/claim #20`/);
  assert.match(svg, /<svg/);
});
