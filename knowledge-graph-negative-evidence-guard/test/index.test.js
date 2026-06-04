import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewerPacket,
  demoPacket,
  evaluateNegativeEvidenceGraph,
  normalizePacket,
  renderMarkdownReport,
  renderSvgSummary,
  scoreEvidenceConflict
} from "../src/index.js";

test("blocks recommendations that depend on retracted evidence", () => {
  const result = evaluateNegativeEvidenceGraph(demoPacket(), {
    now: "2026-06-04T00:00:00.000Z"
  });

  assert.equal(result.status, "block_publication");
  assert.ok(result.blockers.some((blocker) => blocker.code === "retracted_evidence_in_graph_path"));
  assert.ok(
    result.recommendationActions.some(
      (action) => action.recommendationId === "rec:recommend-protocol-v2" && action.decision === "hold"
    )
  );
});

test("detects unresolved contradiction and failed replication conflicts", () => {
  const result = evaluateNegativeEvidenceGraph(demoPacket(), {
    now: "2026-06-04T00:00:00.000Z"
  });

  assert.ok(result.blockers.some((blocker) => blocker.code === "unresolved_contradictory_claims"));
  assert.ok(result.blockers.some((blocker) => blocker.code === "failed_replication_without_curator_outcome"));
  assert.ok(result.actions.some((action) => action.type === "open_conflict_review"));
});

test("allows a clean public recommendation with resolved conflict evidence", () => {
  const packet = demoPacket();
  packet.claims = packet.claims
    .filter((claim) => claim.id !== "claim:retracted-dataset-link" && claim.id !== "claim:embargoed-contradiction")
    .map((claim) => ({ ...claim, curatorDecision: "resolved" }));
  packet.recommendations = [
    {
      id: "rec:resolved-gene-x",
      from: "paper:crispr-neuro-2024",
      to: "finding:gene-x-effect",
      visibility: "public",
      reason: "Curator accepted qualified finding with replication context displayed.",
      derivedFrom: ["claim:supports-gene-x", "claim:failed-replication-gene-x"]
    }
  ];

  const result = evaluateNegativeEvidenceGraph(packet, {
    now: "2026-06-04T00:00:00.000Z"
  });

  assert.equal(result.status, "publish_ready");
  assert.equal(result.counts.blockers, 0);
  assert.equal(result.recommendationActions[0].decision, "publish");
});

test("normalizes packets and rejects unknown recommendation entities", () => {
  const packet = demoPacket();
  assert.equal(normalizePacket(packet).claims.length, 4);

  const broken = demoPacket();
  broken.recommendations[0].to = "dataset:missing";
  assert.throws(() => normalizePacket(broken), /unknown entity/);
});

test("produces stable reviewer artifacts", () => {
  const packet = demoPacket();
  const review = buildReviewerPacket(packet, {
    now: "2026-06-04T00:00:00.000Z"
  });
  const markdown = renderMarkdownReport(packet, {
    now: "2026-06-04T00:00:00.000Z"
  });
  const svg = renderSvgSummary(packet, {
    now: "2026-06-04T00:00:00.000Z"
  });

  assert.equal(review.issue, "SCIBASE.AI#17");
  assert.match(markdown, /Negative-Evidence Graph Guard Report/);
  assert.match(markdown, /`\/claim #17`/);
  assert.match(svg, /<svg/);
  assert.match(svg, /Negative-Evidence Graph Guard/);
});

test("scores conflicts higher when negative evidence is strong", () => {
  const score = scoreEvidenceConflict(
    [{ confidence: 0.4, source: { status: "published", doi: "10.test/1" }, visibility: "public" }],
    [{ confidence: 0.95, source: { status: "published", doi: "10.test/2" }, visibility: "public" }]
  );

  assert.ok(score > 0.55);
});
