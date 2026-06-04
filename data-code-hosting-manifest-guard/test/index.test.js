import test from "node:test";
import assert from "node:assert/strict";
import { createSampleManifest, evaluateRepositoryManifest } from "../src/index.js";

test("ready repository manifests pass with stable audit evidence", () => {
  const result = evaluateRepositoryManifest(createSampleManifest());

  assert.equal(result.status, "ready_for_repository_release");
  assert.equal(result.summary.artifactCount, 2);
  assert.equal(result.summary.datasetCount, 1);
  assert.equal(result.summary.codeCount, 1);
  assert.equal(result.summary.blockerCount, 0);
  assert.match(result.auditDigest, /^[a-f0-9]{64}$/);
});

test("missing FAIR metadata and artifacts block publication", () => {
  const result = evaluateRepositoryManifest({
    metadata: { title: "Incomplete repository" },
    artifacts: [],
    access: { visibility: "public" }
  });

  assert.equal(result.status, "block_publication");
  assert.ok(result.blockers.some((finding) => finding.code === "missing_metadata" && finding.evidence === "doi"));
  assert.ok(result.blockers.some((finding) => finding.code === "missing_dataset_artifact"));
  assert.ok(result.blockers.some((finding) => finding.code === "missing_execution_environment"));
  assert.ok(result.blockers.some((finding) => finding.code === "missing_reproducibility_commands"));
});

test("invalid hash locks and embargo metadata are caught", () => {
  const manifest = createSampleManifest({
    artifacts: [
      {
        id: "supplement",
        type: "dataset",
        format: "json",
        sha256: "not-a-real-hash",
        version: "v1.0.0",
        license: "CC0-1.0",
        metadataSchema: "schema.org/Dataset"
      }
    ],
    access: { visibility: "embargoed" }
  });

  const result = evaluateRepositoryManifest(manifest);

  assert.equal(result.status, "block_publication");
  assert.ok(result.blockers.some((finding) => finding.code === "invalid_artifact_hash"));
  assert.ok(result.blockers.some((finding) => finding.code === "embargo_without_release_date"));
});

test("warning budget moves risky manifests into metadata review", () => {
  const manifest = createSampleManifest({
    metadata: {
      ...createSampleManifest().metadata,
      license: "custom-lab-license"
    },
    artifacts: [
      {
        id: "river-readings-2026",
        type: "dataset",
        format: "csv",
        sha256: "a".repeat(64),
        version: "v1.0.0",
        license: "custom-lab-license"
      }
    ],
    reproducibility: {
      commands: ["python notebooks/reproduce.py"]
    },
    versioning: {
      strategy: "semantic-versioning",
      currentTag: "v1.0.0"
    }
  });

  const result = evaluateRepositoryManifest(manifest, { warningBudget: 2 });

  assert.equal(result.status, "needs_metadata_review");
  assert.ok(result.warnings.some((finding) => finding.code === "weak_reuse_license"));
  assert.ok(result.warnings.some((finding) => finding.code === "missing_code_artifact"));
  assert.ok(result.warnings.some((finding) => finding.code === "missing_output_digest"));
});
