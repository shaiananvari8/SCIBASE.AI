"use strict";

const sharedHistory = [
  {
    tag: "preprint-v1.9",
    commitHash: "a100",
    doi: "10.5555/scibase.preprint.v1.9"
  },
  {
    tag: "preprint-v2.0",
    commitHash: "b200",
    doi: "10.5555/scibase.preprint.v2.0"
  },
  {
    tag: "v1.2.0",
    commitHash: "c300",
    doi: "10.5555/scibase.release.v1.2.0"
  }
];

const mixedRepositoryTagPacket = {
  generatedAt: "2026-05-28T08:10:00Z",
  repositoryId: "synthetic-repository-versioning",
  proposals: [
    {
      id: "reused-preprint-tag",
      releaseType: "preprint",
      tag: "preprint-v2.0",
      commitHash: "d400",
      doi: "10.5555/scibase.preprint.v2.0-reused",
      metadataVersion: "preprint-v1.9",
      metadataDoi: "10.5555/scibase.preprint.v2.0",
      citationVersion: "preprint-v1.9",
      changelogEntry: false,
      artifactHashes: {
        manuscript: "sha256:manuscript-v20",
        code: "sha256:code-v20",
        metadata: "sha256:metadata-v20"
      },
      forkAttribution: {
        required: true,
        present: false
      },
      history: sharedHistory
    },
    {
      id: "minor-release-needs-review",
      releaseType: "release",
      tag: "v1.3.0",
      commitHash: "e500",
      doi: "10.5555/scibase.release.v1.3.0",
      metadataVersion: "v1.3.0",
      metadataDoi: "10.5555/scibase.release.v1.3.0",
      citationVersion: "v1.2.0",
      changelogEntry: false,
      artifactHashes: {
        manuscript: "sha256:manuscript-v130",
        data: "sha256:data-v130",
        code: "sha256:code-v130",
        metadata: "sha256:metadata-v130"
      },
      forkAttribution: {
        required: false,
        present: false
      },
      history: sharedHistory
    },
    {
      id: "major-release-ready",
      releaseType: "release",
      tag: "v2.0.0",
      commitHash: "f600",
      doi: "10.5555/scibase.release.v2.0.0",
      metadataVersion: "v2.0.0",
      metadataDoi: "10.5555/scibase.release.v2.0.0",
      citationVersion: "v2.0.0",
      changelogEntry: true,
      artifactHashes: {
        manuscript: "sha256:manuscript-v200",
        data: "sha256:data-v200",
        code: "sha256:code-v200",
        metadata: "sha256:metadata-v200",
        results: "sha256:results-v200"
      },
      forkAttribution: {
        required: true,
        present: true
      },
      history: sharedHistory
    }
  ]
};

const readyRepositoryTagPacket = {
  generatedAt: "2026-05-28T08:10:00Z",
  repositoryId: "synthetic-ready-repository-versioning",
  proposals: [mixedRepositoryTagPacket.proposals[2]]
};

module.exports = {
  mixedRepositoryTagPacket,
  readyRepositoryTagPacket
};
