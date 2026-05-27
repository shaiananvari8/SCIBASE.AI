"use strict";

const riskySnapshot = {
  generatedAt: "2026-05-27T22:00:00Z",
  researchers: [
    {
      id: "researcher-risky",
      displayName: "Dr. Mira Vale",
      profileMode: "institutional",
      publicBadges: ["downloads", "forks", "endorsements", "reproducibility"],
      anonymousReviewParticipant: true,
      metrics: {
        checkedAt: "2026-05-20T12:00:00Z",
        downloads: [
          {
            date: "2026-05-26",
            count: 140,
            institutions: ["North Valley Lab"],
            sameNetworkRatio: 0.72
          },
          {
            date: "2026-05-25",
            count: 110,
            institutions: ["North Valley Lab", "North Valley Lab"],
            sameNetworkRatio: 0.68
          },
          {
            date: "2026-04-30",
            count: 12,
            institutions: ["State Biohub", "Open Climate Lab"],
            sameNetworkRatio: 0.18
          },
          {
            date: "2026-04-22",
            count: 18,
            institutions: ["State Biohub", "Metro Genomics"],
            sameNetworkRatio: 0.21
          }
        ],
        forks: [
          {
            projectId: "single-cell-atlas",
            forkedBy: "mvale-lab-bot",
            hasDownstreamCommit: false,
            selfControlled: true,
            samePaymentAdmin: true,
            identityConfidence: 0.35
          },
          {
            projectId: "single-cell-atlas",
            forkedBy: "mvale-student-1",
            hasDownstreamCommit: false,
            selfControlled: false,
            samePaymentAdmin: false,
            identityConfidence: 0.52
          },
          {
            projectId: "single-cell-atlas",
            forkedBy: "external-reuse-lab",
            hasDownstreamCommit: true,
            selfControlled: false,
            samePaymentAdmin: false,
            identityConfidence: 0.93
          }
        ],
        endorsements: [
          {
            from: "mvale-student-1",
            to: "researcher-risky",
            reciprocal: true,
            sharedAffiliation: true,
            endorserAccountAgeDays: 12,
            verifiedIdentity: false
          },
          {
            from: "mvale-student-2",
            to: "researcher-risky",
            reciprocal: true,
            sharedAffiliation: true,
            endorserAccountAgeDays: 18,
            verifiedIdentity: false
          },
          {
            from: "external-reviewer",
            to: "researcher-risky",
            reciprocal: false,
            sharedAffiliation: false,
            endorserAccountAgeDays: 540,
            verifiedIdentity: true
          }
        ],
        reproducibilityRuns: [
          {
            projectId: "single-cell-atlas",
            score: 0.98,
            runnerId: "mvale-lab-runner",
            runnerRelation: "same_lab",
            rerunStatus: "passed",
            environmentPinned: false,
            datasetHashMatch: true,
            notebookOutputFresh: false
          },
          {
            projectId: "single-cell-atlas",
            score: 0.97,
            runnerId: "mvale",
            runnerRelation: "self",
            rerunStatus: "passed",
            environmentPinned: true,
            datasetHashMatch: true,
            notebookOutputFresh: true
          }
        ]
      }
    }
  ]
};

const cleanSnapshot = {
  generatedAt: "2026-05-27T22:00:00Z",
  researchers: [
    {
      id: "researcher-clean",
      displayName: "Dr. Rowan Chen",
      profileMode: "public",
      publicBadges: ["downloads", "forks", "reproducibility"],
      anonymousReviewParticipant: false,
      metrics: {
        checkedAt: "2026-05-25T12:00:00Z",
        downloads: [
          {
            date: "2026-05-26",
            count: 24,
            institutions: ["Metro Genomics", "Coastal Lab", "North Valley Lab", "Open Climate Lab"],
            sameNetworkRatio: 0.18
          },
          {
            date: "2026-04-25",
            count: 95,
            institutions: ["Metro Genomics", "Coastal Lab", "State Biohub", "Open Climate Lab"],
            sameNetworkRatio: 0.2
          }
        ],
        forks: [
          {
            projectId: "climate-assay",
            forkedBy: "coastal-lab",
            hasDownstreamCommit: true,
            selfControlled: false,
            samePaymentAdmin: false,
            identityConfidence: 0.91
          },
          {
            projectId: "climate-assay",
            forkedBy: "state-biohub",
            hasDownstreamCommit: true,
            selfControlled: false,
            samePaymentAdmin: false,
            identityConfidence: 0.88
          }
        ],
        endorsements: [
          {
            from: "external-reviewer-a",
            to: "researcher-clean",
            reciprocal: false,
            sharedAffiliation: false,
            endorserAccountAgeDays: 440,
            verifiedIdentity: true
          },
          {
            from: "external-reviewer-b",
            to: "researcher-clean",
            reciprocal: false,
            sharedAffiliation: false,
            endorserAccountAgeDays: 620,
            verifiedIdentity: true
          }
        ],
        reproducibilityRuns: [
          {
            projectId: "climate-assay",
            score: 0.96,
            runnerId: "external-runner",
            runnerRelation: "independent",
            rerunStatus: "passed",
            environmentPinned: true,
            datasetHashMatch: true,
            notebookOutputFresh: true
          }
        ]
      }
    }
  ]
};

const staleSnapshot = {
  generatedAt: "2026-05-27T22:00:00Z",
  researchers: [
    {
      id: "researcher-stale",
      displayName: "Dr. Imani Stone",
      profileMode: "public",
      publicBadges: ["downloads"],
      anonymousReviewParticipant: false,
      metrics: {
        checkedAt: "2026-02-20T12:00:00Z",
        downloads: [],
        forks: [],
        endorsements: [],
        reproducibilityRuns: []
      }
    }
  ]
};

module.exports = {
  riskySnapshot,
  cleanSnapshot,
  staleSnapshot
};
