import { createHash } from "node:crypto";

const REQUIRED_METADATA = ["title", "authors", "license", "doi", "keywords", "schemaVersion"];
const REQUIRED_ARTIFACT_FIELDS = ["id", "type", "format", "sha256", "version", "license"];
const DATASET_TYPES = new Set(["dataset", "supplement", "instrument-output"]);
const CODE_TYPES = new Set(["script", "notebook", "package", "model"]);
const ALLOWED_VISIBILITY = new Set(["public", "private", "institutional", "embargoed"]);
const REUSABLE_LICENSES = new Set(["CC-BY-4.0", "CC0-1.0", "MIT", "Apache-2.0", "BSD-3-Clause"]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function addFinding(collection, code, message, evidence) {
  collection.push({ code, message, evidence });
}

function normalizeArtifacts(manifest) {
  return Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
}

function digestPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function evaluateRepositoryManifest(manifest, options = {}) {
  const blockers = [];
  const warnings = [];
  const metadata = manifest?.metadata ?? {};
  const artifacts = normalizeArtifacts(manifest);
  const datasetCount = artifacts.filter((artifact) => DATASET_TYPES.has(artifact.type)).length;
  const codeCount = artifacts.filter((artifact) => CODE_TYPES.has(artifact.type)).length;

  for (const field of REQUIRED_METADATA) {
    const value = metadata[field];
    const present = Array.isArray(value) ? hasArray(value) : hasText(value);
    if (!present) {
      addFinding(blockers, "missing_metadata", `Required metadata field '${field}' is missing.`, field);
    }
  }

  if (metadata.license && !REUSABLE_LICENSES.has(metadata.license)) {
    addFinding(warnings, "weak_reuse_license", "Repository license is not in the preferred reusable-license set.", metadata.license);
  }

  if (!hasArray(artifacts)) {
    addFinding(blockers, "missing_artifacts", "At least one data, code, notebook, model, or supplementary artifact must be registered.", "artifacts");
  }

  if (datasetCount === 0) {
    addFinding(blockers, "missing_dataset_artifact", "Scientific data hosting requires at least one registered dataset-like artifact.", artifacts.map((artifact) => artifact.type));
  }

  if (codeCount === 0) {
    addFinding(warnings, "missing_code_artifact", "No executable code, notebook, package, or model artifact is registered.", artifacts.map((artifact) => artifact.type));
  }

  for (const artifact of artifacts) {
    for (const field of REQUIRED_ARTIFACT_FIELDS) {
      if (!hasText(artifact[field])) {
        addFinding(blockers, "incomplete_artifact_manifest", `Artifact '${artifact.id ?? "unknown"}' is missing '${field}'.`, artifact);
      }
    }

    if (artifact.sha256 && !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
      addFinding(blockers, "invalid_artifact_hash", `Artifact '${artifact.id}' does not contain a valid SHA-256 hash lock.`, artifact.sha256);
    }

    if (artifact.type === "dataset" && !hasText(artifact.metadataSchema)) {
      addFinding(warnings, "dataset_schema_missing", `Dataset '${artifact.id}' does not declare a metadata schema.`, artifact.id);
    }

    if (CODE_TYPES.has(artifact.type) && !hasText(artifact.runtime)) {
      addFinding(warnings, "runtime_missing", `Executable artifact '${artifact.id}' does not declare its runtime.`, artifact.id);
    }
  }

  const access = manifest?.access ?? {};
  if (!ALLOWED_VISIBILITY.has(access.visibility)) {
    addFinding(blockers, "invalid_visibility", "Repository visibility must be public, private, institutional, or embargoed.", access.visibility);
  }

  if (access.visibility === "embargoed" && !hasText(access.embargoEndsAt)) {
    addFinding(blockers, "embargo_without_release_date", "Embargoed repositories need an explicit release date.", access);
  }

  const environment = manifest?.environment ?? {};
  if (!hasText(environment.kind) || !hasText(environment.definition)) {
    addFinding(blockers, "missing_execution_environment", "Executable repository hosting needs a Dockerfile, environment.yml, notebook kernel, or equivalent runtime definition.", environment);
  }

  if (environment.kind === "docker" && !environment.definition.toLowerCase().includes("dockerfile")) {
    addFinding(warnings, "docker_definition_unclear", "Docker runtime is declared without a Dockerfile-style definition pointer.", environment.definition);
  }

  const reproducibility = manifest?.reproducibility ?? {};
  if (!hasArray(reproducibility.commands)) {
    addFinding(blockers, "missing_reproducibility_commands", "Repository needs at least one command that reproduces or verifies the hosted outputs.", reproducibility);
  }

  if (!hasText(reproducibility.expectedOutputHash)) {
    addFinding(warnings, "missing_output_digest", "Reproducibility command has no expected output digest.", reproducibility);
  }

  const versioning = manifest?.versioning ?? {};
  if (!hasText(versioning.strategy) || !hasText(versioning.currentTag)) {
    addFinding(blockers, "missing_versioning_policy", "Repository needs explicit versioning strategy and current tag metadata.", versioning);
  }

  if (!hasArray(versioning.diffablePaths)) {
    addFinding(warnings, "missing_diffable_paths", "No diffable paths are declared for dataset/code review.", versioning);
  }

  const status = blockers.length > 0 ? "block_publication" : warnings.length > (options.warningBudget ?? 3) ? "needs_metadata_review" : "ready_for_repository_release";
  const result = {
    status,
    summary: {
      artifactCount: artifacts.length,
      datasetCount,
      codeCount,
      blockerCount: blockers.length,
      warningCount: warnings.length
    },
    blockers,
    warnings
  };

  return { ...result, auditDigest: digestPayload(result) };
}

export function createSampleManifest(overrides = {}) {
  return {
    metadata: {
      title: "Open river sensor calibration study",
      authors: ["SCIBASE Synthetic Lab"],
      license: "CC-BY-4.0",
      doi: "10.5555/scibase.synthetic.001",
      keywords: ["hydrology", "sensor-calibration", "open-data"],
      schemaVersion: "scibase-repository-manifest/v1"
    },
    artifacts: [
      {
        id: "river-readings-2026",
        type: "dataset",
        format: "csv",
        sha256: "a".repeat(64),
        version: "v1.0.0",
        license: "CC-BY-4.0",
        metadataSchema: "DataCite 4.5"
      },
      {
        id: "calibration-notebook",
        type: "notebook",
        format: "ipynb",
        sha256: "b".repeat(64),
        version: "v1.0.0",
        license: "MIT",
        runtime: "python-3.12"
      }
    ],
    access: {
      visibility: "public"
    },
    environment: {
      kind: "docker",
      definition: "Dockerfile"
    },
    reproducibility: {
      commands: ["python notebooks/reproduce.py"],
      expectedOutputHash: "c".repeat(64)
    },
    versioning: {
      strategy: "semantic-versioning",
      currentTag: "v1.0.0",
      diffablePaths: ["data/", "notebooks/", "metadata.json"]
    },
    ...overrides
  };
}
