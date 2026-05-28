"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = {
  maxCacheAgeHours: 24,
  maxSharedDeviceAgeHours: 2,
  requireEncryptionForRestricted: true,
  requirePurgeForAnonymousLeak: true
};

function assessLocalCachePrivacy(packet, policy = {}) {
  const settings = { ...DEFAULT_POLICY, ...policy };
  const generatedAt = new Date(packet.generatedAt || "2026-05-28T00:00:00Z");
  const snapshots = (packet.snapshots || []).map((snapshot) => evaluateSnapshot(snapshot, generatedAt, settings));
  const summary = summarize(snapshots);
  const payload = {
    generatedAt: generatedAt.toISOString(),
    documentId: packet.documentId || "synthetic-document",
    status: summary.status,
    summary,
    snapshots
  };

  return {
    ...payload,
    auditDigest: digest(payload)
  };
}

function evaluateSnapshot(snapshot, generatedAt, settings) {
  const blockers = [];
  const warnings = [];
  const actions = [];

  checkAge(snapshot, generatedAt, settings, blockers, warnings, actions);
  checkEncryption(snapshot, settings, blockers, warnings, actions);
  checkRestrictedContent(snapshot, blockers, warnings, actions);
  checkAnonymousReview(snapshot, settings, blockers, warnings, actions);
  checkNotebookOutputs(snapshot, blockers, warnings, actions);
  checkPrivateNotes(snapshot, blockers, warnings, actions);
  checkDeviceRisk(snapshot, generatedAt, settings, blockers, warnings, actions);

  const decision = blockers.length > 0 ? "purge_or_redact_cache" : warnings.length > 0 ? "persist_with_warning" : "allow_cache";

  return {
    snapshotId: snapshot.id,
    editorMode: snapshot.editorMode,
    decision,
    blockers,
    warnings,
    actions: [...new Set(actions)]
  };
}

function checkAge(snapshot, generatedAt, settings, blockers, warnings, actions) {
  const ageHours = hoursBetween(new Date(snapshot.createdAt), generatedAt);
  if (ageHours > settings.maxCacheAgeHours) {
    warnings.push({
      code: "stale_cache_snapshot",
      message: `Cache snapshot is ${round(ageHours)} hours old.`
    });
    actions.push("Expire stale local cache snapshots before they are offered for restore.");
  }
}

function checkEncryption(snapshot, settings, blockers, warnings, actions) {
  const hasRestricted = snapshot.sections.some((section) => section.classification !== "public");
  if (settings.requireEncryptionForRestricted && hasRestricted && !snapshot.storage.encrypted) {
    blockers.push({
      code: "unencrypted_restricted_cache",
      message: "Restricted content is present in an unencrypted local cache snapshot."
    });
    actions.push("Purge the local cache or rewrite it into encrypted storage before persistence.");
  }

  if (snapshot.storage.persistedIn === "localStorage" && hasRestricted) {
    blockers.push({
      code: "restricted_localstorage_cache",
      message: "Restricted scientific content is cached in long-lived localStorage."
    });
    actions.push("Move restricted autosave content to short-lived encrypted session storage.");
  }
}

function checkRestrictedContent(snapshot, blockers, warnings, actions) {
  const restrictedSections = snapshot.sections.filter((section) => section.classification === "restricted");
  const embargoedSections = snapshot.sections.filter((section) => section.embargoed);

  if (restrictedSections.some((section) => section.cachedText)) {
    blockers.push({
      code: "restricted_text_cached",
      message: "Restricted dataset or manuscript excerpts are present in local autosave text."
    });
    actions.push("Redact restricted section text and keep only section hashes in local cache.");
  }

  if (embargoedSections.some((section) => section.titleCached)) {
    warnings.push({
      code: "embargoed_title_cached",
      message: "Embargoed section titles are cached locally."
    });
    actions.push("Replace embargoed titles with neutral placeholders before caching.");
  }
}

function checkAnonymousReview(snapshot, settings, blockers, warnings, actions) {
  const leaks = snapshot.reviewMarkers.filter((marker) => marker.mode.includes("anonymous") && marker.identityCached);
  if (leaks.length > 0) {
    const target = settings.requirePurgeForAnonymousLeak ? blockers : warnings;
    target.push({
      code: "anonymous_review_identity_cached",
      message: `${leaks.length} anonymous review marker(s) cache reviewer identity details.`
    });
    actions.push("Purge cached reviewer identities and retain only blinded review labels.");
  }
}

function checkNotebookOutputs(snapshot, blockers, warnings, actions) {
  const staleOutputs = snapshot.notebookOutputs.filter((output) => output.cached && !output.outputFresh);
  const restrictedOutputs = snapshot.notebookOutputs.filter((output) => output.cached && output.containsRestrictedData);

  if (restrictedOutputs.length > 0) {
    blockers.push({
      code: "restricted_notebook_output_cached",
      message: `${restrictedOutputs.length} cached notebook output(s) include restricted data.`
    });
    actions.push("Remove restricted notebook outputs from browser cache and retain reproducibility hashes only.");
  }

  if (staleOutputs.length > 0) {
    warnings.push({
      code: "stale_notebook_output_cached",
      message: `${staleOutputs.length} cached notebook output(s) are stale.`
    });
    actions.push("Invalidate stale notebook outputs before local restore is offered.");
  }
}

function checkPrivateNotes(snapshot, blockers, warnings, actions) {
  const privateNotes = snapshot.privateNotes.filter((note) => note.cached && note.visibility !== "public");
  if (privateNotes.length > 0) {
    blockers.push({
      code: "private_collaborator_note_cached",
      message: `${privateNotes.length} private collaborator note(s) are cached locally.`
    });
    actions.push("Redact private notes from autosave payloads on shared or recoverable devices.");
  }
}

function checkDeviceRisk(snapshot, generatedAt, settings, blockers, warnings, actions) {
  const ageHours = hoursBetween(new Date(snapshot.createdAt), generatedAt);
  if (snapshot.device.shared && ageHours > settings.maxSharedDeviceAgeHours) {
    blockers.push({
      code: "shared_device_cache_retention",
      message: `Shared-device cache is retained for ${round(ageHours)} hours.`
    });
    actions.push("Purge shared-device cache after the short retention window.");
  }

  if (!snapshot.device.screenLockEnabled && snapshot.sections.some((section) => section.classification !== "public")) {
    warnings.push({
      code: "weak_device_lock_for_cache",
      message: "Restricted cache exists on a device without screen-lock evidence."
    });
    actions.push("Warn user and shorten local cache retention.");
  }
}

function summarize(snapshots) {
  const purged = snapshots.filter((snapshot) => snapshot.decision === "purge_or_redact_cache").length;
  const warned = snapshots.filter((snapshot) => snapshot.decision === "persist_with_warning").length;
  const allowed = snapshots.filter((snapshot) => snapshot.decision === "allow_cache").length;
  const blockerCount = snapshots.reduce((sum, snapshot) => sum + snapshot.blockers.length, 0);
  const warningCount = snapshots.reduce((sum, snapshot) => sum + snapshot.warnings.length, 0);
  const status = purged > 0 ? "hold_local_cache" : warned > 0 ? "warn_before_cache" : "ready";

  return {
    status,
    snapshotCount: snapshots.length,
    purged,
    warned,
    allowed,
    blockerCount,
    warningCount
  };
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hoursBetween(start, end) {
  return Math.max(0, (end - start) / (1000 * 60 * 60));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

module.exports = {
  assessLocalCachePrivacy,
  DEFAULT_POLICY
};
