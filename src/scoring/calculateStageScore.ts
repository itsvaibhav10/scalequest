import type { GameState } from "../game/gameReducer";
import { readApiStages } from "../content/readApiCampaign";
export interface StageScore {
  total: number;
  categories: {
    label: string;
    points: number;
    max: number;
    explanation: string;
  }[];
}
export function estimateCorrect(state: GameState) {
  const evidence = state.confirmedEstimate ?? {
    answer: state.estimateAnswer,
    activeUsers: state.workload.activeUsers,
    requestsPerUserPerDay: state.workload.requestsPerUserPerDay,
    peakMultiplier: state.workload.peakMultiplier,
  };
  const expected =
    ((evidence.activeUsers * evidence.requestsPerUserPerDay) / 86400) *
    evidence.peakMultiplier;
  return (
    evidence.answer.trim() !== "" &&
    Number.isFinite(Number(evidence.answer)) &&
    Math.abs(Number(evidence.answer) - expected) <=
      Math.max(0.01, expected * 0.05)
  );
}
export function calculateStageScore(state: GameState): StageScore {
  const result = state.lastResult;
  const stage = readApiStages[state.stageIndex];
  const q = stage.questions;
  const objectives = result
    ? stage.objectives.every((o) =>
        o.evaluate(state.architecture, result, state.runs),
      )
    : false;
  const parts = [
    [
      "Requirements",
      20,
      state.assumptionsConfirmed,
      "Confirm the agreed workload and requirements.",
    ],
    [
      "Capacity estimation",
      15,
      estimateCorrect(state),
      "Estimate peak RPS within 5% (or 0.01 RPS).",
    ],
    [
      "Diagnosis",
      20,
      !!q && state.answers.diagnosis === q.diagnosis.correct,
      "Identify the cause from the scenario evidence.",
    ],
    [
      "Architecture",
      20,
      !!result?.valid && objectives,
      "Meet the stage requirements with a connected path.",
    ],
    [
      "Trade-off reasoning",
      15,
      !!q && state.answers.tradeoff === q.tradeoff.correct,
      "Choose the limitation that comes with your decision.",
    ],
    [
      "Cost discipline",
      10,
      !!result?.valid &&
        result.monthlyCost.value <= state.workload.monthlyBudgetUsd &&
        state.architecture.nodes.length <= stage.reference.nodes.length,
      "Stay within budget without more components than the problem needs.",
    ],
  ] as const;
  const categories = parts.map(([label, max, ok, explanation]) => ({
    label,
    max,
    points: ok ? max : 0,
    explanation,
  }));
  return {
    total: categories.reduce((sum, c) => sum + c.points, 0),
    categories,
  };
}
