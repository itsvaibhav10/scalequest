import type { GameState } from "../game/gameReducer";
import { readApiStages } from "../content/readApiCampaign";
export const questions = {
  1: {
    diagnosis: {
      prompt: "What is the constraint at this scale?",
      options: [
        ["capacity", "We need more API servers."],
        ["simple", "No capacity bottleneck: keep the request path simple."],
        ["queue", "Every read needs a queue."],
      ],
      correct: "simple",
    },
    tradeoff: {
      prompt: "What are you accepting with local data?",
      options: [
        ["volatile", "Low cost, but data is lost when the process restarts."],
        ["durable", "It is as durable as an external database."],
        ["free", "There are no operational trade-offs."],
      ],
      correct: "volatile",
    },
  },
  2: {
    diagnosis: {
      prompt: "Why did the product disappear after restart?",
      options: [
        ["traffic", "100 users always overload one API server."],
        ["memory", "The product lived in process memory."],
        ["network", "Every restart requires a load balancer."],
      ],
      correct: "memory",
    },
    tradeoff: {
      prompt: "What does an external database change?",
      options: [
        ["uptime", "The API can never be unavailable again."],
        [
          "persist",
          "Data survives the API process; cost and a new dependency increase.",
        ],
        ["fast", "Every request automatically becomes faster."],
      ],
      correct: "persist",
    },
  },
} as const;
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
  const q = questions[state.stageIndex === 2 ? 2 : 1];
  const objectives = result
    ? readApiStages[state.stageIndex].objectives.every((o) =>
        o.evaluate(state.architecture, result),
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
      state.answers.diagnosis === q.diagnosis.correct,
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
      state.answers.tradeoff === q.tradeoff.correct,
      "Choose the limitation that comes with your decision.",
    ],
    [
      "Cost discipline",
      10,
      !!result?.valid &&
        result.monthlyCost.value <= state.workload.monthlyBudgetUsd &&
        state.architecture.nodes.length === 3,
      "Use a focused three-component path within budget.",
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
