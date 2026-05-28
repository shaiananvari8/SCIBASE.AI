"use strict";

const crypto = require("crypto");

const REQUIRED_ARTIFACTS = ["manuscript", "data", "code", "metadata"];

function assessRepositoryVersionTags(packet) {
  const generatedAt = new Date(packet.generatedAt || "2026-05-28T00:00:00Z");
  const proposals = (packet.proposals || []).map((proposal) => evaluateProposal(proposal));
  const summary = summarize(proposals);
  const payload = {
    generatedAt: generatedAt.toISOString(),
    repositoryId: packet.repositoryId || "synthetic-project-repository",
    status: summary.status,
    summary,
    proposals
  };

  return {
    ...payload,
    auditDigest: digest(payload)
  };
}

function evaluateProposal(proposal) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const parsedTag = parseTag(proposal.tag);

  checkTagFormat(proposal, parsedTag, blockers, actions);
  checkCollision(proposal, blockers, actions);
  checkMonotonicity(proposal, parsedTag, blockers, actions);
  checkMetadataDrift(proposal, blockers, warnings, actions);
  checkArtifactHashes(proposal, blockers, warnings, actions);
  checkForkAttribution(proposal, blockers, actions);
  checkChangelog(proposal, warnings, actions);

  const decision = blockers.length > 0
    ? "block_release_tag"
    : warnings.length > 0
      ? "manual_review_tag"
      : "approve_tag";

  return {
    proposalId: proposal.id,
    tag: proposal.tag,
    releaseType: proposal.releaseType,
    decision,
    blockers,
    warnings,
    actions: [...new Set(actions)]
  };
}

function checkTagFormat(proposal, parsedTag, blockers, actions) {
  if (!parsedTag.valid) {
    blockers.push({
      code: "unsupported_version_tag",
      message: `${proposal.tag} is not a supported vX.Y.Z or preprint-vX.Y tag.`
    });
    actions.push("Rename the release tag to a supported semantic repository version.");
  }
}

function checkCollision(proposal, blockers, actions) {
  const collisions = proposal.history.filter((entry) => entry.tag === proposal.tag);
  for (const collision of collisions) {
    if (collision.commitHash !== proposal.commitHash || collision.doi !== proposal.doi) {
      blockers.push({
        code: "version_tag_collision",
        message: `${proposal.tag} already points to a different commit or DOI.`
      });
      actions.push("Create a new monotonic tag instead of reusing a published repository version.");
      return;
    }
  }
}

function checkMonotonicity(proposal, parsedTag, blockers, actions) {
  if (!parsedTag.valid) return;

  const comparable = proposal.history
    .map((entry) => ({ ...entry, parsed: parseTag(entry.tag) }))
    .filter((entry) => entry.parsed.valid && entry.parsed.kind === parsedTag.kind);
  const latest = comparable.reduce((max, entry) => compareVersions(entry.parsed.parts, max.parts) > 0 ? entry.parsed : max, { parts: [-1, -1, -1] });

  if (compareVersions(parsedTag.parts, latest.parts) <= 0 && comparable.some((entry) => entry.tag !== proposal.tag)) {
    blockers.push({
      code: "non_monotonic_version_tag",
      message: `${proposal.tag} does not advance beyond the latest ${parsedTag.kind} version.`
    });
    actions.push("Advance the semantic version or preprint version before publication.");
  }
}

function checkMetadataDrift(proposal, blockers, warnings, actions) {
  if (proposal.metadataVersion !== proposal.tag) {
    blockers.push({
      code: "metadata_version_drift",
      message: `metadata.json version ${proposal.metadataVersion} does not match tag ${proposal.tag}.`
    });
    actions.push("Update metadata.json before DOI or citation release.");
  }

  if (proposal.metadataDoi !== proposal.doi) {
    blockers.push({
      code: "doi_metadata_mismatch",
      message: "Repository DOI and metadata DOI differ for the proposed version."
    });
    actions.push("Reconcile DOI fields before publishing the tag.");
  }

  if (proposal.citationVersion !== proposal.tag) {
    warnings.push({
      code: "citation_version_stale",
      message: `Citation text references ${proposal.citationVersion} instead of ${proposal.tag}.`
    });
    actions.push("Regenerate citation text and Cite this project metadata for the tag.");
  }
}

function checkArtifactHashes(proposal, blockers, warnings, actions) {
  const hashes = proposal.artifactHashes || {};
  const missing = REQUIRED_ARTIFACTS.filter((name) => !hashes[name]);
  if (missing.length > 0) {
    blockers.push({
      code: "artifact_hashes_missing",
      message: `Missing hash locks for ${missing.join(", ")}.`
    });
    actions.push("Lock manuscript, data, code, and metadata hashes before release.");
  }

  if (!hashes.results && proposal.releaseType !== "metadata-only") {
    warnings.push({
      code: "results_hash_missing",
      message: "Results output hash is absent for a reproducibility-bearing tag."
    });
    actions.push("Add result/figure hash evidence or mark the release as metadata-only.");
  }
}

function checkForkAttribution(proposal, blockers, actions) {
  if (proposal.forkAttribution.required && !proposal.forkAttribution.present) {
    blockers.push({
      code: "fork_attribution_missing",
      message: "Derived repository release lacks parent project attribution."
    });
    actions.push("Attach parent repository DOI and fork lineage before publishing the tag.");
  }
}

function checkChangelog(proposal, warnings, actions) {
  if (!proposal.changelogEntry) {
    warnings.push({
      code: "changelog_entry_missing",
      message: "No changelog entry is attached to the proposed tag."
    });
    actions.push("Add a concise changelog entry that explains version-scoped changes.");
  }
}

function parseTag(tag) {
  const semver = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (semver) {
    return {
      valid: true,
      kind: "release",
      parts: semver.slice(1).map(Number)
    };
  }

  const preprint = /^preprint-v(\d+)\.(\d+)$/.exec(tag);
  if (preprint) {
    return {
      valid: true,
      kind: "preprint",
      parts: [Number(preprint[1]), Number(preprint[2]), 0]
    };
  }

  return {
    valid: false,
    kind: "unknown",
    parts: [-1, -1, -1]
  };
}

function compareVersions(left, right) {
  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }
  return 0;
}

function summarize(proposals) {
  const blocked = proposals.filter((proposal) => proposal.decision === "block_release_tag").length;
  const manualReview = proposals.filter((proposal) => proposal.decision === "manual_review_tag").length;
  const approved = proposals.filter((proposal) => proposal.decision === "approve_tag").length;
  const blockerCount = proposals.reduce((sum, proposal) => sum + proposal.blockers.length, 0);
  const warningCount = proposals.reduce((sum, proposal) => sum + proposal.warnings.length, 0);
  const status = blocked > 0 ? "hold_tag_publication" : manualReview > 0 ? "review_before_tagging" : "ready";

  return {
    status,
    proposalCount: proposals.length,
    blocked,
    manualReview,
    approved,
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

module.exports = {
  assessRepositoryVersionTags,
  parseTag
};
