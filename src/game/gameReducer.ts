import type {
  Architecture,
  ComponentKind,
  ScenarioRuns,
  WorkloadInput,
  SimulationResult,
} from "../domain/systemDesign";
import { readApiStages } from "../content/readApiCampaign";
export interface Answers {
  diagnosis: string;
  tradeoff: string;
}
export interface ConfirmedEstimate {
  answer: string;
  activeUsers: number;
  requestsPerUserPerDay: number;
  peakMultiplier: number;
}
export interface GameState {
  schemaVersion: 1;
  campaignId: "scale-read-api";
  stageIndex: number;
  completedStageIds: string[];
  architecture: Architecture;
  workload: WorkloadInput;
  lastResult: SimulationResult | null;
  /** Latest result of each scenario; cleared whenever the design or workload changes. */
  runs: ScenarioRuns;
  selectedLearningKind: ComponentKind | null;
  scoreByStage: Record<string, number>;
  progressNotice: string | null;
  assumptionsConfirmed: boolean;
  estimateAnswer: string;
  answers: Answers;
  history: string[];
  sliceComplete: boolean;
  confirmedEstimate: ConfirmedEstimate | null;
  preserveStoredProgress: boolean;
}
export function initialState(): GameState {
  return {
    schemaVersion: 1,
    campaignId: "scale-read-api",
    stageIndex: 0,
    completedStageIds: [],
    architecture: structuredClone(readApiStages[0].baseline),
    workload: { ...readApiStages[0].defaultWorkload },
    lastResult: null,
    runs: {},
    selectedLearningKind: null,
    scoreByStage: {},
    progressNotice: null,
    assumptionsConfirmed: false,
    estimateAnswer: "",
    answers: { diagnosis: "", tradeoff: "" },
    history: [],
    sliceComplete: false,
    confirmedEstimate: null,
    preserveStoredProgress: false,
  };
}
export type GameAction =
  | {
      type: "set-architecture";
      architecture: Architecture;
      positionsOnly?: boolean;
    }
  | { type: "set-workload"; workload: WorkloadInput }
  | { type: "show-learning"; kind: ComponentKind | null }
  | { type: "store-result"; result: SimulationResult }
  | { type: "answer"; field: keyof Answers; value: string }
  | { type: "confirm-assumptions"; value: boolean }
  | { type: "estimate"; value: string }
  | { type: "begin" }
  | { type: "complete-stage"; score: number }
  | { type: "reset-stage" }
  | { type: "reset-campaign" }
  | { type: "dismiss-progress-notice" };
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "set-architecture":
      return {
        ...state,
        architecture: action.architecture,
        lastResult: action.positionsOnly ? state.lastResult : null,
        runs: action.positionsOnly ? state.runs : {},
        ...(!action.positionsOnly
          ? {
              answers: { diagnosis: "", tradeoff: "" },
              sliceComplete: false,
              completedStageIds: state.completedStageIds.filter(
                (id) => id !== readApiStages[state.stageIndex].id,
              ),
              history: [...state.history, "Updated request path."].slice(-8),
            }
          : {}),
      };
    case "set-workload":
      return {
        ...state,
        workload: action.workload,
        lastResult: null,
        runs: {},
        answers: { diagnosis: "", tradeoff: "" },
        sliceComplete: false,
        completedStageIds: state.completedStageIds.filter(
          (id) => id !== readApiStages[state.stageIndex].id,
        ),
      };
    case "show-learning":
      return { ...state, selectedLearningKind: action.kind };
    case "store-result":
      return {
        ...state,
        lastResult: action.result,
        runs: { ...state.runs, [action.result.incident]: action.result },
        history: [
          ...state.history,
          `Simulation: ${action.result.valid ? "valid request path" : "needs attention"} · ${action.result.workload.peakRps.toFixed(2)} peak RPS.`,
        ].slice(-8),
      };
    case "answer":
      return {
        ...state,
        answers: { ...state.answers, [action.field]: action.value },
      };
    case "confirm-assumptions":
      return { ...state, assumptionsConfirmed: action.value };
    case "estimate":
      return { ...state, estimateAnswer: action.value };
    case "begin":
      return {
        ...enterStage(state, 1),
        completedStageIds: ["requirements"],
        confirmedEstimate: {
          answer: state.estimateAnswer,
          activeUsers: state.workload.activeUsers,
          requestsPerUserPerDay: state.workload.requestsPerUserPerDay,
          peakMultiplier: state.workload.peakMultiplier,
        },
        history: [
          "Requirements agreed. Start with the simplest working system.",
        ],
      };
    case "complete-stage": {
      const stage = readApiStages[state.stageIndex];
      const completedStageIds = [
        ...new Set([...state.completedStageIds, stage.id]),
      ];
      const scoreByStage = {
        ...state.scoreByStage,
        [stage.id]: Math.max(state.scoreByStage[stage.id] ?? 0, action.score),
      };
      const done = { ...state, completedStageIds, scoreByStage };
      if (state.stageIndex === readApiStages.length - 1)
        return { ...done, sliceComplete: true };
      return advance(done);
    }
    case "reset-stage":
      return {
        ...state,
        architecture: structuredClone(readApiStages[state.stageIndex].baseline),
        lastResult: null,
        runs: {},
        answers: { diagnosis: "", tradeoff: "" },
        sliceComplete: false,
        completedStageIds: state.completedStageIds.filter(
          (id) => id !== readApiStages[state.stageIndex].id,
        ),
      };
    case "reset-campaign":
      return initialState();
    case "dismiss-progress-notice":
      return { ...state, progressNotice: null };
  }
}

/** Starts a stage: its baseline design, its workload and a clean slate. */
function enterStage(state: GameState, index: number): GameState {
  const stage = readApiStages[index];
  return {
    ...state,
    stageIndex: index,
    architecture: structuredClone(stage.baseline),
    workload: {
      ...state.workload,
      ...stage.workloadOverrides,
      activeUsers: stage.userCount,
    },
    lastResult: null,
    runs: {},
    answers: { diagnosis: "", tradeoff: "" },
    selectedLearningKind: null,
    sliceComplete: false,
  };
}

/** Moves a finished game state on to the next chapter. */
export function advance(state: GameState): GameState {
  const next = enterStage(state, state.stageIndex + 1);
  return {
    ...next,
    history: [
      ...state.history,
      `Chapter ${next.stageIndex}: ${readApiStages[next.stageIndex].brief}`.slice(
        0,
        480,
      ),
    ].slice(-8),
  };
}
