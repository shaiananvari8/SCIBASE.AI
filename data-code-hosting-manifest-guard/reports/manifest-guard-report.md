# Data and Code Hosting Manifest Guard

Status: block_publication
Audit digest: 777f3022d220fed8225ca1f9586d09274e35b149e2cd764a753769c72c8dd951

## Summary

- Artifacts: 1
- Dataset artifacts: 1
- Code artifacts: 0
- Blockers: 10
- Warnings: 5

## Blockers

- missing_metadata: Required metadata field 'authors' is missing.
- missing_metadata: Required metadata field 'license' is missing.
- missing_metadata: Required metadata field 'doi' is missing.
- missing_metadata: Required metadata field 'keywords' is missing.
- missing_metadata: Required metadata field 'schemaVersion' is missing.
- invalid_artifact_hash: Artifact 'unhashed-export' does not contain a valid SHA-256 hash lock.
- embargo_without_release_date: Embargoed repositories need an explicit release date.
- missing_execution_environment: Executable repository hosting needs a Dockerfile, environment.yml, notebook kernel, or equivalent runtime definition.
- missing_reproducibility_commands: Repository needs at least one command that reproduces or verifies the hosted outputs.
- missing_versioning_policy: Repository needs explicit versioning strategy and current tag metadata.

## Warnings

- missing_code_artifact: No executable code, notebook, package, or model artifact is registered.
- dataset_schema_missing: Dataset 'unhashed-export' does not declare a metadata schema.
- docker_definition_unclear: Docker runtime is declared without a Dockerfile-style definition pointer.
- missing_output_digest: Reproducibility command has no expected output digest.
- missing_diffable_paths: No diffable paths are declared for dataset/code review.
