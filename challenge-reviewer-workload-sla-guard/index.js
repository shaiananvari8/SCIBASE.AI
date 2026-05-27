const crypto = require("node:crypto");

const HOURS = 60 * 60 * 1000;

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

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function asDate(value, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid date for ${label}: ${value}`);
  }
  return date;
}

function hoursBetween(start, end) {
  return (asDate(end, "end") - asDate(start, "start")) / HOURS;
}

function includes(value, list) {
  return Array.isArray(list) && list.includes(value);
}

function inWindow(now, window) {
  return asDate(window.startsAt, "blackout startsAt") <= now && now <= asDate(window.endsAt, "blackout endsAt");
}

function openAssignments(reviewer, challengeId) {
  return (reviewer.assignments || []).filter((assignment) => {
    return assignment.challengeId === challengeId && assignment.status !== "submitted" && assignment.status !== "withdrawn";
  });
}

function getReviewerState(reviewer, challengeId, now, policy) {
  const assignments = openAssignments(reviewer, challengeId);
  const estimatedHours = assignments.reduce((total, assignment) => total + Number(assignment.estimatedHours || 0), 0);
  const weeklyBudget = Math.max(Number(reviewer.availability.weeklyHourBudget || 0), 1);
  const committedHours = Number(reviewer.availability.committedHours || 0) + estimatedHours;
  const utilization = committedHours / weeklyBudget;
  const isBlackout = (reviewer.availability.blackoutWindows || []).some((window) => inWindow(now, window));
  const inactiveHours = hoursBetween(reviewer.lastActiveAt, now);
  const isInactive = inactiveHours > policy.inactiveReviewerHours;
  const isUnavailable = reviewer.availability.status !== "active" || isBlackout || isInactive;
  const isOverloaded =
    utilization > policy.maxReviewerUtilization ||
    assignments.length > Number(reviewer.availability.maxConcurrentReviews || 0);

  const staleAssignments = assignments
    .map((assignment) => {
      const hoursLate = hoursBetween(assignment.dueAt, now);
      return {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        criterionId: assignment.criterionId,
        dueAt: assignment.dueAt,
        hoursLate: Math.max(0, Number(hoursLate.toFixed(1))),
        isCritical: hoursLate >= policy.staleReviewHours
      };
    })
    .filter((assignment) => assignment.hoursLate > 0);

  return {
    reviewerId: reviewer.id,
    displayName: reviewer.displayName,
    expertise: reviewer.expertise || [],
    roles: reviewer.roles || [],
    canArbitrate: Boolean(reviewer.canArbitrate),
    status: reviewer.availability.status,
    contactWindowHours: reviewer.contactWindowHours,
    weeklyBudget,
    committedHours,
    openAssignments: assignments.length,
    utilization: Number(utilization.toFixed(3)),
    isBlackout,
    inactiveHours: Number(inactiveHours.toFixed(1)),
    isInactive,
    isUnavailable,
    isOverloaded,
    staleAssignments
  };
}

function reviewerCanCoverCriterion(state, reviewer, criterion, policy) {
  return (
    state.status === "active" &&
    !state.isBlackout &&
    !state.isInactive &&
    state.utilization <= policy.maxReviewerUtilization &&
    state.openAssignments < Number(reviewer.availability.maxConcurrentReviews || 0) &&
    includes(criterion.requiredExpertise, reviewer.expertise)
  );
}

function buildCriterionCoverage(challenge, reviewerStatesById, policy) {
  return challenge.criteria.map((criterion) => {
    const eligibleReviewers = challenge.reviewers
      .filter((reviewer) => reviewerCanCoverCriterion(reviewerStatesById.get(reviewer.id), reviewer, criterion, policy))
      .map((reviewer) => reviewer.id);
    const assignedReviewers = challenge.reviewers
      .filter((reviewer) => openAssignments(reviewer, challenge.challengeId).some((assignment) => assignment.criterionId === criterion.id))
      .map((reviewer) => reviewer.id);
    const needed = Number(criterion.minReviewers || policy.minEligibleReviewersPerCriterion);

    return {
      criterionId: criterion.id,
      label: criterion.label,
      requiredExpertise: criterion.requiredExpertise,
      minReviewers: needed,
      eligibleReviewers,
      assignedReviewers,
      hasEnoughCoverage: eligibleReviewers.length >= needed
    };
  });
}

function buildAssignmentQueue(challenge, reviewerStatesById, now, policy) {
  const queue = [];
  for (const reviewer of challenge.reviewers) {
    const state = reviewerStatesById.get(reviewer.id);
    for (const assignment of openAssignments(reviewer, challenge.challengeId)) {
      const hoursUntilDue = hoursBetween(now, assignment.dueAt);
      const dueBucket =
        hoursUntilDue < 0
          ? "past_due"
          : hoursUntilDue <= policy.dueSoonHours
            ? "due_soon"
            : "on_track";
      queue.push({
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        criterionId: assignment.criterionId,
        status: assignment.status,
        dueAt: assignment.dueAt,
        estimatedHours: Number(assignment.estimatedHours || 0),
        dueBucket,
        hoursUntilDue: Number(hoursUntilDue.toFixed(1)),
        reviewerUnavailable: state.isUnavailable,
        reviewerOverloaded: state.isOverloaded
      });
    }
  }
  return queue.sort((left, right) => {
    const due = asDate(left.dueAt, "left dueAt") - asDate(right.dueAt, "right dueAt");
    return due || left.assignmentId.localeCompare(right.assignmentId);
  });
}

function addBlocker(blockers, code, message, evidence) {
  blockers.push({ code, message, evidence });
}

function addWarning(warnings, code, message, evidence) {
  warnings.push({ code, message, evidence });
}

function buildEscalationPlan(blockers, warnings, challenge) {
  const actions = [];
  const addAction = (priority, owner, action, evidence) => {
    actions.push({ priority, owner, action, evidence });
  };

  for (const blocker of blockers) {
    if (blocker.code === "assigned_reviewer_unavailable") {
      addAction(
        "critical",
        challenge.policies.escalationLead,
        "Reassign blocked reviews to eligible backups before sponsor scoring opens.",
        blocker.evidence
      );
    }
    if (blocker.code === "critical_stale_review") {
      addAction(
        "critical",
        challenge.policies.escalationLead,
        "Hold award release and request same-day replacement review or arbitration signoff.",
        blocker.evidence
      );
    }
    if (blocker.code === "criterion_capacity_gap") {
      addAction(
        "high",
        challenge.policies.escalationLead,
        "Recruit additional eligible reviewers for uncovered rubric criteria.",
        blocker.evidence
      );
    }
    if (blocker.code === "arbitration_backup_gap") {
      addAction(
        "high",
        challenge.policies.escalationLead,
        "Name a conflict-free backup arbitrator before any contested decision is released.",
        blocker.evidence
      );
    }
  }

  for (const warning of warnings) {
    if (warning.code === "reviewer_near_capacity") {
      addAction(
        "medium",
        challenge.policies.escalationLead,
        "Keep a standby reviewer warm for near-capacity assignments.",
        warning.evidence
      );
    }
    if (warning.code === "assignment_due_soon") {
      addAction(
        "medium",
        challenge.policies.escalationLead,
        "Send due-soon reminders with a replacement deadline.",
        warning.evidence
      );
    }
  }

  return actions;
}

function evaluateChallengeReviewerWorkload(challenge) {
  if (!challenge || typeof challenge !== "object") {
    throw new Error("Challenge packet is required");
  }

  const policy = {
    maxReviewerUtilization: 0.85,
    nearCapacityUtilization: 0.75,
    minEligibleReviewersPerCriterion: 2,
    staleReviewHours: 24,
    dueSoonHours: 12,
    inactiveReviewerHours: 72,
    ...challenge.policies
  };
  const now = asDate(policy.now, "policies.now");
  const challengeId = challenge.challengeId;

  const reviewerStates = challenge.reviewers.map((reviewer) => getReviewerState(reviewer, challengeId, now, policy));
  const reviewerStatesById = new Map(reviewerStates.map((state) => [state.reviewerId, state]));
  const coverage = buildCriterionCoverage(challenge, reviewerStatesById, policy);
  const assignmentQueue = buildAssignmentQueue(challenge, reviewerStatesById, now, policy);
  const blockers = [];
  const warnings = [];

  for (const state of reviewerStates) {
    const assignedOpen = state.openAssignments > 0;
    if (assignedOpen && state.isUnavailable) {
      addBlocker(blockers, "assigned_reviewer_unavailable", `${state.displayName} cannot complete an assigned challenge review.`, {
        reviewerId: state.reviewerId,
        status: state.status,
        isBlackout: state.isBlackout,
        inactiveHours: state.inactiveHours,
        openAssignments: state.openAssignments
      });
    }
    if (assignedOpen && state.isOverloaded) {
      addBlocker(blockers, "assigned_reviewer_overloaded", `${state.displayName} is above reviewer capacity policy.`, {
        reviewerId: state.reviewerId,
        utilization: state.utilization,
        openAssignments: state.openAssignments,
        weeklyBudget: state.weeklyBudget,
        committedHours: state.committedHours
      });
    } else if (assignedOpen && state.utilization >= policy.nearCapacityUtilization) {
      addWarning(warnings, "reviewer_near_capacity", `${state.displayName} is near reviewer capacity.`, {
        reviewerId: state.reviewerId,
        utilization: state.utilization
      });
    }

    for (const stale of state.staleAssignments) {
      const code = stale.isCritical ? "critical_stale_review" : "assignment_past_due";
      const add = stale.isCritical ? addBlocker : addWarning;
      add(
        stale.isCritical ? blockers : warnings,
        code,
        `${state.displayName} has a ${stale.hoursLate}-hour stale challenge review.`,
        stale
      );
    }
  }

  for (const criterion of coverage) {
    if (!criterion.hasEnoughCoverage) {
      addBlocker(
        blockers,
        "criterion_capacity_gap",
        `${criterion.label} has ${criterion.eligibleReviewers.length} eligible reviewers, below the required ${criterion.minReviewers}.`,
        {
          criterionId: criterion.criterionId,
          eligibleReviewers: criterion.eligibleReviewers,
          minReviewers: criterion.minReviewers
        }
      );
    }
  }

  for (const assignment of assignmentQueue) {
    if (assignment.dueBucket === "due_soon" && !assignment.reviewerUnavailable && !assignment.reviewerOverloaded) {
      addWarning(warnings, "assignment_due_soon", `${assignment.assignmentId} is due within ${policy.dueSoonHours} hours.`, {
        assignmentId: assignment.assignmentId,
        reviewerId: assignment.reviewerId,
        criterionId: assignment.criterionId,
        hoursUntilDue: assignment.hoursUntilDue
      });
    }
  }

  const activeArbitrators = challenge.reviewers
    .filter((reviewer) => {
      const state = reviewerStatesById.get(reviewer.id);
      return reviewer.canArbitrate && !state.isUnavailable && !state.isOverloaded;
    })
    .map((reviewer) => reviewer.id);
  if (policy.arbitrationBackupRequired && activeArbitrators.length < 2) {
    addBlocker(blockers, "arbitration_backup_gap", "Challenge lacks two active, under-capacity arbitration reviewers.", {
      activeArbitrators,
      requiredArbitrators: 2
    });
  }

  const summary = {
    challengeId,
    title: challenge.title,
    status:
      blockers.length > 0
        ? "hold_review_window"
        : warnings.length > 0
          ? "conditional_review_ready"
          : "ready_for_review",
    evaluatedAt: now.toISOString(),
    blockers: blockers.length,
    warnings: warnings.length,
    reviewers: reviewerStates.length,
    openAssignments: assignmentQueue.length,
    criteriaWithCapacityGaps: coverage.filter((criterion) => !criterion.hasEnoughCoverage).length,
    activeArbitrators: activeArbitrators.length
  };

  const result = {
    summary,
    policy,
    reviewerStates,
    criterionCoverage: coverage,
    assignmentQueue,
    blockers,
    warnings,
    escalationPlan: buildEscalationPlan(blockers, warnings, challenge)
  };
  return {
    ...result,
    auditDigest: digest(result)
  };
}

function renderMarkdown(result) {
  const lines = [];
  lines.push(`# Challenge Reviewer Workload SLA Report`);
  lines.push("");
  lines.push(`Challenge: ${result.summary.title} (${result.summary.challengeId})`);
  lines.push(`Status: ${result.summary.status}`);
  lines.push(`Audit digest: ${result.auditDigest}`);
  lines.push("");
  lines.push("## Decision Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | ---: |");
  lines.push(`| Blockers | ${result.summary.blockers} |`);
  lines.push(`| Warnings | ${result.summary.warnings} |`);
  lines.push(`| Open review assignments | ${result.summary.openAssignments} |`);
  lines.push(`| Criteria with capacity gaps | ${result.summary.criteriaWithCapacityGaps} |`);
  lines.push(`| Active arbitrators | ${result.summary.activeArbitrators} |`);
  lines.push("");
  lines.push("## Reviewer Load");
  lines.push("");
  lines.push("| Reviewer | Open | Utilization | State |");
  lines.push("| --- | ---: | ---: | --- |");
  for (const reviewer of result.reviewerStates) {
    const state = reviewer.isUnavailable
      ? "unavailable"
      : reviewer.isOverloaded
        ? "overloaded"
        : reviewer.utilization >= result.policy.nearCapacityUtilization
          ? "near capacity"
          : "available";
    lines.push(`| ${reviewer.displayName} | ${reviewer.openAssignments} | ${Math.round(reviewer.utilization * 100)}% | ${state} |`);
  }
  lines.push("");
  lines.push("## Rubric Coverage");
  lines.push("");
  lines.push("| Criterion | Eligible Reviewers | Required | Decision |");
  lines.push("| --- | ---: | ---: | --- |");
  for (const criterion of result.criterionCoverage) {
    lines.push(
      `| ${criterion.label} | ${criterion.eligibleReviewers.length} | ${criterion.minReviewers} | ${
        criterion.hasEnoughCoverage ? "covered" : "gap"
      } |`
    );
  }
  lines.push("");
  lines.push("## Blockers");
  lines.push("");
  if (result.blockers.length === 0) {
    lines.push("No blockers.");
  } else {
    for (const blocker of result.blockers) {
      lines.push(`- ${blocker.code}: ${blocker.message}`);
    }
  }
  lines.push("");
  lines.push("## Escalation Plan");
  lines.push("");
  if (result.escalationPlan.length === 0) {
    lines.push("No escalation actions required.");
  } else {
    for (const action of result.escalationPlan) {
      lines.push(`- ${action.priority}: ${action.action} Owner: ${action.owner}.`);
    }
  }
  lines.push("");
  lines.push("Synthetic data only. No private reviewer records, payment rails, identity systems, or external services are used.");
  lines.push("");
  return lines.join("\n");
}

function renderSvg(result) {
  const blockerWidth = Math.min(440, result.summary.blockers * 44);
  const warningWidth = Math.min(440, result.summary.warnings * 44);
  const readyWidth = result.summary.status === "ready_for_review" ? 440 : result.summary.status === "conditional_review_ready" ? 260 : 120;
  const rows = result.reviewerStates
    .slice(0, 5)
    .map((reviewer, index) => {
      const y = 205 + index * 30;
      const load = Math.min(260, Math.round(reviewer.utilization * 260));
      const fill = reviewer.isUnavailable || reviewer.isOverloaded ? "#d94f45" : reviewer.utilization >= 0.75 ? "#c9962f" : "#2f8f68";
      return [
        `<text x="44" y="${y}" font-size="14" fill="#263238">${escapeXml(reviewer.displayName)}</text>`,
        `<rect x="210" y="${y - 14}" width="260" height="12" rx="3" fill="#d9e2e4"/>`,
        `<rect x="210" y="${y - 14}" width="${load}" height="12" rx="3" fill="${fill}"/>`,
        `<text x="486" y="${y}" font-size="13" fill="#263238">${Math.round(reviewer.utilization * 100)}%</text>`
      ].join("\n        ");
    })
    .join("\n        ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Challenge reviewer workload SLA summary">
  <rect width="960" height="540" fill="#f6f8f4"/>
  <rect x="28" y="28" width="904" height="484" rx="8" fill="#ffffff" stroke="#b8c5c2"/>
  <text x="44" y="72" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#1b2a2f">Challenge Reviewer Workload SLA Guard</text>
  <text x="44" y="106" font-family="Arial, sans-serif" font-size="16" fill="#4c5c61">${escapeXml(result.summary.challengeId)} - ${escapeXml(result.summary.status)}</text>
  <g font-family="Arial, sans-serif">
    <text x="44" y="154" font-size="14" fill="#263238">Blockers</text>
    <rect x="140" y="140" width="440" height="18" rx="4" fill="#f1d9d6"/>
    <rect x="140" y="140" width="${blockerWidth}" height="18" rx="4" fill="#d94f45"/>
    <text x="600" y="155" font-size="14" fill="#263238">${result.summary.blockers}</text>
    <text x="44" y="184" font-size="14" fill="#263238">Warnings</text>
    <rect x="140" y="170" width="440" height="18" rx="4" fill="#f4ead2"/>
    <rect x="140" y="170" width="${warningWidth}" height="18" rx="4" fill="#c9962f"/>
    <text x="600" y="185" font-size="14" fill="#263238">${result.summary.warnings}</text>
    ${rows}
    <text x="44" y="402" font-size="15" font-weight="700" fill="#1b2a2f">Review gate</text>
    <rect x="44" y="418" width="440" height="18" rx="4" fill="#d9e2e4"/>
    <rect x="44" y="418" width="${readyWidth}" height="18" rx="4" fill="#2f8f68"/>
    <text x="504" y="433" font-size="14" fill="#263238">${escapeXml(result.summary.status)}</text>
    <text x="44" y="474" font-size="13" fill="#5b6b70">Audit digest: ${result.auditDigest.slice(0, 24)}...</text>
  </g>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  evaluateChallengeReviewerWorkload,
  renderMarkdown,
  renderSvg,
  stableStringify,
  digest
};
