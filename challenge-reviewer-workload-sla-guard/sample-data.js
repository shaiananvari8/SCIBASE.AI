const riskyChallenge = {
  challengeId: "sci-bounty-review-2026-05",
  title: "Private climate-model challenge final review",
  policies: {
    now: "2026-05-27T17:00:00.000Z",
    escalationLead: "challenge-ops-lead",
    maxReviewerUtilization: 0.85,
    nearCapacityUtilization: 0.75,
    minEligibleReviewersPerCriterion: 2,
    staleReviewHours: 24,
    dueSoonHours: 12,
    inactiveReviewerHours: 72,
    arbitrationBackupRequired: true
  },
  criteria: [
    {
      id: "forecast-skill",
      label: "Forecast skill and uncertainty",
      requiredExpertise: "climate-modeling",
      minReviewers: 2
    },
    {
      id: "ml-validation",
      label: "Machine-learning validation",
      requiredExpertise: "ml-validation",
      minReviewers: 2
    },
    {
      id: "reproducibility",
      label: "Reproducibility package",
      requiredExpertise: "reproducibility",
      minReviewers: 2
    }
  ],
  submissions: [
    {
      id: "sub-lake-effect",
      teamLabel: "team-anonymous-17",
      criteriaTouched: ["forecast-skill", "ml-validation", "reproducibility"],
      submittedAt: "2026-05-24T14:20:00.000Z"
    },
    {
      id: "sub-regional-grid",
      teamLabel: "team-anonymous-31",
      criteriaTouched: ["forecast-skill", "reproducibility"],
      submittedAt: "2026-05-24T18:35:00.000Z"
    }
  ],
  reviewers: [
    {
      id: "rev-ada",
      displayName: "Ada River",
      roles: ["reviewer"],
      expertise: ["climate-modeling", "reproducibility"],
      canArbitrate: false,
      contactWindowHours: 8,
      lastActiveAt: "2026-05-27T14:00:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 10,
        committedHours: 8,
        maxConcurrentReviews: 2,
        blackoutWindows: []
      },
      assignments: [
        {
          id: "assign-forecast-ada",
          challengeId: "sci-bounty-review-2026-05",
          criterionId: "forecast-skill",
          dueAt: "2026-05-27T09:00:00.000Z",
          estimatedHours: 3,
          status: "in_review"
        },
        {
          id: "assign-repro-ada",
          challengeId: "sci-bounty-review-2026-05",
          criterionId: "reproducibility",
          dueAt: "2026-05-28T04:00:00.000Z",
          estimatedHours: 2,
          status: "queued"
        }
      ]
    },
    {
      id: "rev-ben",
      displayName: "Ben Cross",
      roles: ["reviewer"],
      expertise: ["ml-validation"],
      canArbitrate: false,
      contactWindowHours: 10,
      lastActiveAt: "2026-05-27T12:30:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 12,
        committedHours: 5,
        maxConcurrentReviews: 3,
        blackoutWindows: [
          {
            startsAt: "2026-05-27T00:00:00.000Z",
            endsAt: "2026-05-29T00:00:00.000Z",
            reason: "field work"
          }
        ]
      },
      assignments: [
        {
          id: "assign-ml-ben",
          challengeId: "sci-bounty-review-2026-05",
          criterionId: "ml-validation",
          dueAt: "2026-05-26T09:00:00.000Z",
          estimatedHours: 4,
          status: "in_review"
        }
      ]
    },
    {
      id: "rev-cora",
      displayName: "Cora Field",
      roles: ["reviewer", "arbitrator"],
      expertise: ["climate-modeling", "ml-validation"],
      canArbitrate: true,
      contactWindowHours: 4,
      lastActiveAt: "2026-05-27T16:00:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 16,
        committedHours: 6,
        maxConcurrentReviews: 3,
        blackoutWindows: []
      },
      assignments: [
        {
          id: "assign-forecast-cora",
          challengeId: "sci-bounty-review-2026-05",
          criterionId: "forecast-skill",
          dueAt: "2026-05-28T03:00:00.000Z",
          estimatedHours: 3,
          status: "queued"
        }
      ]
    },
    {
      id: "rev-drew",
      displayName: "Drew Lane",
      roles: ["reviewer"],
      expertise: ["reproducibility"],
      canArbitrate: false,
      contactWindowHours: 12,
      lastActiveAt: "2026-05-22T13:00:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 8,
        committedHours: 2,
        maxConcurrentReviews: 2,
        blackoutWindows: []
      },
      assignments: [
        {
          id: "assign-repro-drew",
          challengeId: "sci-bounty-review-2026-05",
          criterionId: "reproducibility",
          dueAt: "2026-05-25T16:00:00.000Z",
          estimatedHours: 3,
          status: "in_review"
        }
      ]
    },
    {
      id: "rev-eli",
      displayName: "Eli Stone",
      roles: ["arbitrator"],
      expertise: ["methodology"],
      canArbitrate: true,
      contactWindowHours: 6,
      lastActiveAt: "2026-05-27T15:10:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 6,
        committedHours: 6,
        maxConcurrentReviews: 1,
        blackoutWindows: []
      },
      assignments: []
    }
  ]
};

const cleanChallenge = {
  ...riskyChallenge,
  challengeId: "sci-bounty-review-clean",
  policies: {
    ...riskyChallenge.policies,
    now: "2026-05-27T17:00:00.000Z"
  },
  reviewers: [
    {
      id: "rev-ada",
      displayName: "Ada River",
      roles: ["reviewer"],
      expertise: ["climate-modeling", "reproducibility"],
      canArbitrate: false,
      contactWindowHours: 8,
      lastActiveAt: "2026-05-27T14:00:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 20,
        committedHours: 4,
        maxConcurrentReviews: 4,
        blackoutWindows: []
      },
      assignments: [
        {
          id: "assign-forecast-ada",
          challengeId: "sci-bounty-review-clean",
          criterionId: "forecast-skill",
          dueAt: "2026-05-28T12:00:00.000Z",
          estimatedHours: 2,
          status: "queued"
        }
      ]
    },
    {
      id: "rev-ben",
      displayName: "Ben Cross",
      roles: ["reviewer"],
      expertise: ["ml-validation", "reproducibility"],
      canArbitrate: false,
      contactWindowHours: 10,
      lastActiveAt: "2026-05-27T12:30:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 18,
        committedHours: 4,
        maxConcurrentReviews: 4,
        blackoutWindows: []
      },
      assignments: [
        {
          id: "assign-ml-ben",
          challengeId: "sci-bounty-review-clean",
          criterionId: "ml-validation",
          dueAt: "2026-05-28T15:00:00.000Z",
          estimatedHours: 3,
          status: "queued"
        }
      ]
    },
    {
      id: "rev-cora",
      displayName: "Cora Field",
      roles: ["reviewer", "arbitrator"],
      expertise: ["climate-modeling", "ml-validation"],
      canArbitrate: true,
      contactWindowHours: 4,
      lastActiveAt: "2026-05-27T16:00:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 16,
        committedHours: 6,
        maxConcurrentReviews: 3,
        blackoutWindows: []
      },
      assignments: [
        {
          id: "assign-forecast-cora",
          challengeId: "sci-bounty-review-clean",
          criterionId: "forecast-skill",
          dueAt: "2026-05-28T18:00:00.000Z",
          estimatedHours: 2,
          status: "queued"
        }
      ]
    },
    {
      id: "rev-drew",
      displayName: "Drew Lane",
      roles: ["reviewer", "arbitrator"],
      expertise: ["reproducibility", "ml-validation"],
      canArbitrate: true,
      contactWindowHours: 12,
      lastActiveAt: "2026-05-27T13:00:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 14,
        committedHours: 3,
        maxConcurrentReviews: 3,
        blackoutWindows: []
      },
      assignments: [
        {
          id: "assign-repro-drew",
          challengeId: "sci-bounty-review-clean",
          criterionId: "reproducibility",
          dueAt: "2026-05-28T20:00:00.000Z",
          estimatedHours: 2,
          status: "queued"
        }
      ]
    },
    {
      id: "rev-eli",
      displayName: "Eli Stone",
      roles: ["reviewer", "arbitrator"],
      expertise: ["reproducibility", "ml-validation", "climate-modeling"],
      canArbitrate: true,
      contactWindowHours: 6,
      lastActiveAt: "2026-05-27T15:10:00.000Z",
      availability: {
        status: "active",
        weeklyHourBudget: 12,
        committedHours: 2,
        maxConcurrentReviews: 3,
        blackoutWindows: []
      },
      assignments: []
    }
  ]
};

module.exports = {
  riskyChallenge,
  cleanChallenge
};
