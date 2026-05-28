"use strict";

const mixedBayesianReviewPacket = {
  generatedAt: "2026-05-28T07:30:00Z",
  manuscriptId: "synthetic-bayesian-review",
  analyses: [
    {
      id: "clinical-survival-model",
      domain: "clinical trials",
      priors: [
        {
          name: "treatment_log_hazard_ratio",
          reported: true,
          strength: "informative",
          justification: false
        },
        {
          name: "baseline_hazard_spline",
          reported: false,
          strength: "weakly-informative",
          justification: false
        }
      ],
      sensitivityRuns: [
        {
          name: "skeptical treatment prior",
          baselineEstimate: 0.31,
          alternateEstimate: -0.08
        },
        {
          name: "wider frailty prior",
          baselineEstimate: 0.31,
          alternateEstimate: 0.04
        }
      ],
      diagnostics: {
        maxRhat: 1.08,
        minEffectiveSampleSize: 112,
        divergentTransitions: 14
      },
      priorPredictiveCheck: {
        reported: false,
        coverage: 0
      },
      claims: [
        {
          id: "claim-treatment-definitive",
          posteriorProbability: 0.91,
          strength: "definitive",
          robustAcrossPriors: false
        }
      ]
    },
    {
      id: "materials-yield-model",
      domain: "materials science",
      priors: [
        {
          name: "thermal_gradient_effect",
          reported: true,
          strength: "informative",
          justification: false
        }
      ],
      sensitivityRuns: [
        {
          name: "neutral process prior",
          baselineEstimate: 0.44,
          alternateEstimate: 0.29
        }
      ],
      diagnostics: {
        maxRhat: 1.02,
        minEffectiveSampleSize: 260,
        divergentTransitions: 0
      },
      priorPredictiveCheck: {
        reported: true,
        coverage: 0.58
      },
      claims: [
        {
          id: "claim-yield-improves",
          posteriorProbability: 0.94,
          strength: "likely",
          robustAcrossPriors: true
        }
      ]
    },
    {
      id: "ecology-occupancy-model",
      domain: "ecology",
      priors: [
        {
          name: "occupancy_intercept",
          reported: true,
          strength: "weakly-informative",
          justification: true
        }
      ],
      sensitivityRuns: [
        {
          name: "wide occupancy prior",
          baselineEstimate: 0.22,
          alternateEstimate: 0.18
        },
        {
          name: "skeptical occupancy prior",
          baselineEstimate: 0.22,
          alternateEstimate: 0.2
        }
      ],
      diagnostics: {
        maxRhat: 1,
        minEffectiveSampleSize: 920,
        divergentTransitions: 0
      },
      priorPredictiveCheck: {
        reported: true,
        coverage: 0.82
      },
      claims: [
        {
          id: "claim-habitat-associated",
          posteriorProbability: 0.96,
          strength: "likely",
          robustAcrossPriors: true
        }
      ]
    }
  ]
};

const readyBayesianReviewPacket = {
  generatedAt: "2026-05-28T07:30:00Z",
  manuscriptId: "synthetic-ready-bayesian-review",
  analyses: [mixedBayesianReviewPacket.analyses[2]]
};

module.exports = {
  mixedBayesianReviewPacket,
  readyBayesianReviewPacket
};
