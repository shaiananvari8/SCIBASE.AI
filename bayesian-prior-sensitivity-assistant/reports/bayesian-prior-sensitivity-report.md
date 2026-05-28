# Bayesian Prior Sensitivity Assistant Report

Synthetic auto peer-review packet for SCIBASE issue #16.

## Summary

| Packet | Status | Major | Minor | Ready | Digest |
| --- | --- | ---: | ---: | ---: | --- |
| mixed | hold_peer_review_claims | 1 | 1 | 1 | 0f1f6b29a79b |
| ready | ready | 0 | 0 | 1 | 43a9b74dc9b5 |

## Analysis Decisions

### clinical-survival-model: major_revision_prior_robustness
- blocker prior_not_reported: 1 model prior(s) are used without manuscript disclosure.
- blocker posterior_direction_flips_under_prior: skeptical treatment prior changes effect direction from 0.31 to -0.08.
- blocker divergent_transitions_present: 14 divergent transition(s) were reported.
- blocker severe_rhat_convergence_failure: Maximum R-hat is 1.08.
- blocker severe_effective_sample_size_shortfall: Minimum effective sample size is 112.
- blocker prior_predictive_check_missing: No prior predictive check is reported for the Bayesian model.
- blocker strong_claim_not_prior_robust: claim-treatment-definitive uses strong language without prior-robust support.
- warning informative_prior_not_justified: 1 informative prior(s) lack domain justification.
- warning large_posterior_shift_under_prior: wider frailty prior shifts posterior estimate by 0.27.

### materials-yield-model: minor_revision_prior_robustness
- warning informative_prior_not_justified: 1 informative prior(s) lack domain justification.
- warning rhat_above_review_threshold: Maximum R-hat is 1.02.
- warning low_effective_sample_size: Minimum effective sample size is 260.
- warning weak_prior_predictive_coverage: Prior predictive coverage is 58%.

### ecology-occupancy-model: ready_for_peer_review

## Non-Overlap Notes

This module focuses specifically on Bayesian prior sensitivity, convergence diagnostics, prior predictive checks, and posterior claim calibration. It does not implement a broad assistant suite, multiple-comparison correction, generic statistical consistency checks, study power feasibility, uncertainty tone review, prompt safety, literature freshness, image integrity, external validity, or protocol trace workflows.
