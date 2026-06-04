import crypto from "node:crypto";

const DEFAULT_POLICY = {
  maxRetryAgeMinutes: 120,
  maxClockSkewMinutes: 10,
  requireIdempotencyKey: true,
  blockSignatureReplay: true,
  blockOutOfOrderExports: true
};

export function evaluateWebhookReplayPacket(packet, options = {}) {
  const normalized = normalizePacket(packet);
  const policy = { ...DEFAULT_POLICY, ...normalized.policy, ...(options.policy ?? {}) };
  const now = new Date(options.now ?? normalized.generatedAt);
  const blockers = [];
  const warnings = [];
  const eventActions = [];
  const seenEvents = new Map();
  const seenKeys = new Map();
  const seenSignatures = new Map();
  const lastSequence = new Map();

  for (const event of normalized.events) {
    const action = {
      eventId: event.id,
      deliveryId: event.deliveryId,
      destination: event.destination,
      stream: event.stream,
      decision: "deliver",
      reasons: [],
      requiredActions: []
    };
    const streamKey = `${event.destination}|${event.stream}`;
    const previousSequence = lastSequence.get(streamKey);
    const ageMinutes = minutesBetween(new Date(event.createdAt), now);
    const skewMinutes = Math.abs(minutesBetween(new Date(event.signedAt), new Date(event.createdAt)));

    if (seenEvents.has(event.id)) {
      hold(action, "duplicate_event_id", "Collapse duplicate delivery rows under one canonical event id.");
      blockers.push(finding("duplicate_event_id", event.id, "The same event id appears in multiple delivery records."));
    } else {
      seenEvents.set(event.id, event.deliveryId);
    }

    if (policy.requireIdempotencyKey && !event.idempotencyKey) {
      hold(action, "missing_idempotency_key", "Attach a stable idempotency key before enterprise delivery.");
      blockers.push(finding("missing_idempotency_key", event.id, "Enterprise delivery requires an idempotency key."));
    } else if (event.idempotencyKey && seenKeys.has(event.idempotencyKey)) {
      hold(action, "reused_idempotency_key", "Rotate the idempotency key or suppress the duplicate delivery.");
      blockers.push(finding("reused_idempotency_key", event.id, "The same idempotency key appears on multiple delivery records."));
    } else if (event.idempotencyKey) {
      seenKeys.set(event.idempotencyKey, event.id);
    }

    if (policy.blockSignatureReplay && seenSignatures.has(event.signatureDigest)) {
      hold(action, "signature_replay", "Regenerate the signature with a fresh timestamp and delivery nonce.");
      blockers.push(finding("signature_replay", event.id, "The same signature digest appears on multiple events."));
    } else {
      seenSignatures.set(event.signatureDigest, event.id);
    }

    if (event.attempt > 1 && ageMinutes > policy.maxRetryAgeMinutes) {
      hold(action, "stale_retry_window", "Escalate stale retries for manual review instead of automatic replay.");
      blockers.push({ ...finding("stale_retry_window", event.id, "Retry delivery is outside the allowed replay window."), ageMinutes });
    }

    if (typeof previousSequence === "number" && event.sequence <= previousSequence) {
      hold(action, "non_monotonic_sequence", "Rebuild the destination stream from the last acknowledged sequence.");
      blockers.push({ ...finding("non_monotonic_sequence", event.id, "Destination stream sequence is not monotonic."), previousSequence, sequence: event.sequence });
    }
    lastSequence.set(streamKey, Math.max(previousSequence ?? -1, event.sequence));

    if (skewMinutes > policy.maxClockSkewMinutes) {
      warnings.push({ ...finding("signature_clock_skew", event.id, "Signature timestamp is outside the warning threshold."), skewMinutes });
    }

    if (event.type === "export.completed" && event.exportBatch) {
      const destination = normalized.destinations.find((item) => item.id === event.destination);
      if (policy.blockOutOfOrderExports && destination && event.exportBatch.sequence <= destination.ackedExportSequence) {
        hold(action, "out_of_order_export_batch", "Regenerate the export batch after the destination acknowledgement.");
        blockers.push(finding("out_of_order_export_batch", event.id, "Export batch sequence is not newer than the destination acknowledgement."));
      }
      if (!event.exportBatch.manifestDigest) {
        hold(action, "missing_export_manifest_digest", "Attach a deterministic manifest digest before export delivery.");
        blockers.push(finding("missing_export_manifest_digest", event.id, "Export-completed event lacks a manifest digest."));
      }
      if (!event.exportBatch.destinationAck) {
        hold(action, "missing_destination_acknowledgement", "Hold export completion until destination acknowledgement is present.");
        blockers.push(finding("missing_destination_acknowledgement", event.id, "Export-completed event has no destination acknowledgement."));
      }
    }

    eventActions.push(action);
  }

  const status = blockers.length ? "block_delivery" : warnings.length ? "needs_review" : "deliver_ready";
  return {
    status,
    generatedAt: now.toISOString(),
    packetId: normalized.packetId,
    digest: digest({ packetId: normalized.packetId, blockers, warnings, eventActions }),
    counts: {
      destinations: normalized.destinations.length,
      events: normalized.events.length,
      blockers: blockers.length,
      warnings: warnings.length,
      heldEvents: eventActions.filter((event) => event.decision === "hold").length
    },
    blockers,
    warnings,
    eventActions,
    policy
  };
}

export function buildReviewerPacket(packet, options = {}) {
  return {
    title: "SCIBASE Enterprise Webhook Replay Guard",
    issue: "SCIBASE.AI#19",
    claim: "/claim #19",
    evaluation: evaluateWebhookReplayPacket(packet, options),
    reviewerChecklist: [
      "Each enterprise event has a stable idempotency key.",
      "Duplicate event ids and repeated signature digests are held.",
      "Destination streams remain monotonic by destination and stream.",
      "Retry attempts outside the replay window are escalated.",
      "Export-completed events wait for ordered manifests and destination acknowledgement."
    ]
  };
}

export function renderMarkdownReport(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return [
    "# Enterprise Webhook Replay Guard Report",
    "",
    `Issue: ${review.issue}`,
    `Claim marker: \`${review.claim}\``,
    `Status: \`${evaluation.status}\``,
    `Digest: \`${evaluation.digest}\``,
    "",
    "## Reviewer Checklist",
    ...review.reviewerChecklist.map((item) => `- ${item}`),
    "",
    "## Blockers",
    ...(evaluation.blockers.length ? evaluation.blockers.map((item) => `- ${item.code}: ${item.message}`) : ["- None."]),
    "",
    "## Event Decisions",
    ...evaluation.eventActions.map((item) => `- ${item.eventId}: ${item.decision}${item.reasons.length ? ` (${item.reasons.join(", ")})` : ""}`)
  ].join("\n") + "\n";
}

export function renderSvgSummary(packet, options = {}) {
  const review = buildReviewerPacket(packet, options);
  const { evaluation } = review;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="320" viewBox="0 0 720 320" role="img"><rect width="720" height="320" fill="#f8fafc"/><rect x="32" y="28" width="656" height="264" rx="8" fill="#fff" stroke="#cbd5e1"/><text x="56" y="72" font-family="Arial" font-size="24" font-weight="700" fill="#0f172a">Enterprise Webhook Replay Guard</text><text x="56" y="106" font-family="Arial" font-size="15" fill="#334155">Status: ${escapeXml(evaluation.status)} | Blockers: ${evaluation.counts.blockers}</text><text x="56" y="148" font-family="Arial" font-size="14" fill="#334155">Events inspected: ${evaluation.counts.events}</text><text x="56" y="184" font-family="Arial" font-size="14" fill="#334155">Held events: ${evaluation.counts.heldEvents}</text><text x="56" y="220" font-family="Arial" font-size="14" fill="#334155">Digest: ${escapeXml(evaluation.digest.slice(0, 24))}</text><text x="56" y="264" font-family="Arial" font-size="14" fill="#475569">Synthetic events only. No network delivery, credentials, private payloads, or external services.</text></svg>\n`;
}

export function demoPacket() {
  return {
    packetId: "scibase-enterprise-webhook-replay-demo",
    generatedAt: "2026-06-04T00:00:00.000Z",
    destinations: [
      { id: "institutional-repository", name: "Institutional Repository", ackedExportSequence: 41 },
      { id: "lms-sync", name: "Learning Management System", ackedExportSequence: 8 }
    ],
    events: [
      { id: "evt-project-created-001", deliveryId: "del-001", destination: "institutional-repository", stream: "project-events", type: "project.created", sequence: 42, attempt: 1, idempotencyKey: "idem-project-created-001", signatureDigest: "sig-a", createdAt: "2026-06-03T23:55:00.000Z", signedAt: "2026-06-03T23:55:02.000Z" },
      { id: "evt-project-created-001", deliveryId: "del-002", destination: "institutional-repository", stream: "project-events", type: "project.created", sequence: 42, attempt: 2, idempotencyKey: "idem-project-created-001", signatureDigest: "sig-a", createdAt: "2026-06-03T21:10:00.000Z", signedAt: "2026-06-03T21:40:00.000Z" },
      { id: "evt-export-043", deliveryId: "del-003", destination: "institutional-repository", stream: "export-events", type: "export.completed", sequence: 43, attempt: 1, idempotencyKey: "idem-export-043", signatureDigest: "sig-b", createdAt: "2026-06-03T23:58:00.000Z", signedAt: "2026-06-03T23:58:01.000Z", exportBatch: { sequence: 40, manifestDigest: "sha256:synthetic-manifest", records: 18, destinationAck: false } },
      { id: "evt-lms-sync-009", deliveryId: "del-004", destination: "lms-sync", stream: "course-events", type: "course.sync", sequence: 9, attempt: 1, idempotencyKey: "", signatureDigest: "sig-c", createdAt: "2026-06-03T23:57:00.000Z", signedAt: "2026-06-03T23:57:00.000Z" }
    ]
  };
}

export function normalizePacket(packet) {
  if (!packet || typeof packet !== "object") throw new TypeError("A webhook replay packet object is required.");
  const destinations = asArray(packet.destinations, "destinations").map((destination) => ({
    id: text(destination.id, "destination.id"),
    name: text(destination.name, "destination.name"),
    ackedExportSequence: number(destination.ackedExportSequence ?? -1, "destination.ackedExportSequence")
  }));
  const destinationIds = new Set(destinations.map((destination) => destination.id));
  const events = asArray(packet.events, "events").map((event) => normalizeEvent(event, destinationIds));
  return { packetId: text(packet.packetId, "packetId"), generatedAt: text(packet.generatedAt, "generatedAt"), policy: packet.policy ?? {}, destinations, events };
}

function normalizeEvent(event, destinationIds) {
  const destination = text(event.destination, "event.destination");
  if (!destinationIds.has(destination)) throw new Error(`Event ${event.id ?? "(missing)"} references an unknown destination.`);
  return { id: text(event.id, "event.id"), deliveryId: text(event.deliveryId, "event.deliveryId"), destination, stream: text(event.stream, "event.stream"), type: text(event.type, "event.type"), sequence: number(event.sequence, "event.sequence"), attempt: number(event.attempt ?? 1, "event.attempt"), idempotencyKey: event.idempotencyKey ?? "", signatureDigest: text(event.signatureDigest, "event.signatureDigest"), createdAt: text(event.createdAt, "event.createdAt"), signedAt: text(event.signedAt, "event.signedAt"), exportBatch: event.exportBatch ? { sequence: number(event.exportBatch.sequence, "event.exportBatch.sequence"), manifestDigest: event.exportBatch.manifestDigest ?? "", records: number(event.exportBatch.records ?? 0, "event.exportBatch.records"), destinationAck: Boolean(event.exportBatch.destinationAck) } : null };
}

function hold(action, reason, requiredAction) { action.decision = "hold"; action.reasons.push(reason); action.requiredActions.push(requiredAction); }
function finding(code, eventId, message) { return { code, eventId, message }; }
function minutesBetween(start, end) { return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000)); }
function text(value, name) { if (typeof value !== "string" || !value.trim()) throw new TypeError(`${name} must be a non-empty string.`); return value.trim(); }
function number(value, name) { const parsed = Number(value); if (!Number.isFinite(parsed)) throw new TypeError(`${name} must be finite.`); return parsed; }
function asArray(value, name) { if (!Array.isArray(value)) throw new TypeError(`${name} must be an array.`); return value; }
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function escapeXml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;"); }
