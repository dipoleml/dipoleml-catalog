// Fidelity — the public surface of the self-correcting clone loop.
//
//   combineFidelity()  blends static visual fidelity (verify) and motion
//                      fidelity into one overall score + letter grade.
//   runFidelityLoop()  the loop: measure → plan → rebuild → re-measure, until
//                      the score crosses a threshold or the round budget runs
//                      out. `measure` and `rebuild` are injected, so the
//                      orchestration tests without a browser.
//
// This is the capability neither competitor ships: a clone whose fidelity is
// measured (not claimed) and improved on a loop (not one-shot).

import { buildCorrectionPlan } from './correction-plan.js';

const VISUAL_WEIGHT = 0.6;
const MOTION_WEIGHT = 0.4;

export function gradeFor(score) {
  if (score == null) return 'unknown';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Blend visual + motion fidelity into one score.
 * @param {object} args { verify, motion, weights? }
 */
export function combineFidelity({ verify, motion, weights } = {}) {
  const visual = verify?.fidelity ?? null;
  const motionScore = motion?.score ?? null;
  const vw = weights?.visual ?? VISUAL_WEIGHT;
  const mw = weights?.motion ?? MOTION_WEIGHT;

  let overall = null;
  if (visual != null && motionScore != null) {
    overall = Math.round((visual * vw + motionScore * mw) / (vw + mw));
  } else if (visual != null) {
    overall = visual;
  } else if (motionScore != null) {
    overall = motionScore;
  }

  const plan = buildCorrectionPlan({ verify, motion });
  return {
    overall,
    grade: gradeFor(overall),
    visual,
    motion: motionScore,
    weights: { visual: vw, motion: mw },
    directives: plan.directives,
    counts: plan.counts,
    summary: summarize(overall, visual, motionScore, plan.counts),
  };
}

function summarize(overall, visual, motion, counts) {
  if (overall == null) return 'No fidelity could be measured.';
  const parts = [`${overall}% overall fidelity (${gradeFor(overall)})`];
  if (visual != null) parts.push(`visual ${visual}%`);
  if (motion != null) parts.push(`motion ${motion}%`);
  const open = counts.high + counts.medium + counts.low;
  parts.push(open ? `${open} correction(s): ${counts.high} high, ${counts.medium} med, ${counts.low} low` : 'no corrections outstanding');
  return parts.join(' · ');
}

/**
 * Drive the closed correction loop.
 * @param {object} args
 * @param {() => Promise<{verify,motion}>|{verify,motion}} args.measure  re-measure fidelity
 * @param {(plan:object, round:number) => Promise<void>|void} [args.rebuild]  apply corrections
 * @param {number} [args.threshold]  stop once overall >= this (default 90)
 * @param {number} [args.maxRounds]  hard cap on iterations (default 4)
 * @returns {Promise<{rounds:Array, final:object, converged:boolean}>}
 */
export async function runFidelityLoop({ measure, rebuild, threshold = 90, maxRounds = 4 } = {}) {
  if (typeof measure !== 'function') throw new TypeError('runFidelityLoop requires a measure() function');

  const rounds = [];
  let final = null;
  let converged = false;

  for (let round = 1; round <= maxRounds; round++) {
    const measured = await measure(round);
    const combined = combineFidelity(measured);
    rounds.push({ round, overall: combined.overall, visual: combined.visual, motion: combined.motion, directives: combined.directives.length });
    final = combined;

    if (combined.overall != null && combined.overall >= threshold) { converged = true; break; }
    if (!combined.directives.length) { converged = combined.overall != null; break; }
    if (round === maxRounds) break;
    if (typeof rebuild === 'function') await rebuild(combined, round);
  }

  return { rounds, final, converged };
}
