import {
  initialState,
  type ConfirmedEstimate,
  type GameState,
} from "../game/gameReducer";
import { componentDefinitions } from "../content/components";
const PROGRESS_KEY = "scalequest.progress.v1";
const RECOVERY_KEY = "scalequest.progress.recovery";
function record(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function finite(x: unknown) {
  return typeof x === "number" && Number.isFinite(x);
}
function validEstimate(x: unknown): x is ConfirmedEstimate {
  if (
    !record(x) ||
    typeof x.answer !== "string" ||
    x.answer.trim() === "" ||
    !finite(x.activeUsers) ||
    !finite(x.requestsPerUserPerDay) ||
    !finite(x.peakMultiplier)
  )
    return false;
  const expected =
    ((Number(x.activeUsers) * Number(x.requestsPerUserPerDay)) / 86400) *
    Number(x.peakMultiplier);
  const answer = Number(x.answer);
  return (
    Number(x.activeUsers) === 10 &&
    Number(x.requestsPerUserPerDay) >= 1 &&
    Number(x.requestsPerUserPerDay) <= 10000 &&
    Number(x.peakMultiplier) >= 1 &&
    Number(x.peakMultiplier) <= 100 &&
    Number.isFinite(answer) &&
    Math.abs(answer - expected) <= Math.max(0.01, expected * 0.05)
  );
}
export function validProgress(x: unknown): x is GameState {
  if (
    !record(x) ||
    x.schemaVersion !== 1 ||
    x.campaignId !== "scale-read-api" ||
    !Number.isInteger(x.stageIndex) ||
    Number(x.stageIndex) < 0 ||
    Number(x.stageIndex) > 2
  )
    return false;
  if (
    !record(x.architecture) ||
    !Array.isArray(x.architecture.nodes) ||
    !Array.isArray(x.architecture.edges) ||
    !record(x.workload)
  )
    return false;
  if (x.architecture.nodes.length > 20 || x.architecture.edges.length > 40)
    return false;
  if (
    !x.architecture.nodes.every(
      (n) =>
        record(n) &&
        typeof n.id === "string" &&
        n.id.length > 0 &&
        n.id.length <= 100 &&
        typeof n.kind === "string" &&
        Object.hasOwn(componentDefinitions, n.kind) &&
        typeof n.label === "string" &&
        n.label.length > 0 &&
        n.label.length <= 100 &&
        finite(n.x) &&
        Math.abs(Number(n.x)) <= 10000 &&
        finite(n.y) &&
        Math.abs(Number(n.y)) <= 10000,
    )
  )
    return false;
  const ids = x.architecture.nodes.map((n) => n.id);
  if (new Set(ids).size !== ids.length) return false;
  if (
    !x.architecture.edges.every(
      (e) =>
        record(e) &&
        typeof e.id === "string" &&
        e.id.length > 0 &&
        e.id.length <= 100 &&
        typeof e.source === "string" &&
        typeof e.target === "string" &&
        e.source !== e.target &&
        ids.includes(e.source) &&
        ids.includes(e.target),
    )
  )
    return false;
  if (
    new Set(x.architecture.edges.map((e) => e.id)).size !==
    x.architecture.edges.length
  )
    return false;
  const bounds: Record<string, [number, number]> = {
    activeUsers: [1, 1e6],
    requestsPerUserPerDay: [0, 1e6],
    peakMultiplier: [1, 1000],
    readRatio: [1, 1],
    payloadKb: [0.01, 1e6],
    targetP95Ms: [1, 1e6],
    targetAvailabilityPercent: [0, 100],
    monthlyBudgetUsd: [0, 1e9],
  };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const value = x.workload[key];
    if (!finite(value) || Number(value) < min || Number(value) > max)
      return false;
  }
  const expectedCompleted =
    Number(x.stageIndex) === 0
      ? []
      : Number(x.stageIndex) === 1
        ? ["requirements"]
        : x.sliceComplete
          ? ["requirements", "ten-users", "hundred-users"]
          : ["requirements", "ten-users"];
  if (
    !Array.isArray(x.completedStageIds) ||
    x.completedStageIds.length !== expectedCompleted.length ||
    !x.completedStageIds.every((v, i) => v === expectedCompleted[i])
  )
    return false;
  const allowedKinds =
    Number(x.stageIndex) === 0
      ? []
      : Number(x.stageIndex) === 1
        ? ["client", "api-server", "local-data"]
        : ["client", "api-server", "local-data", "relational-database"];
  if (!x.architecture.nodes.every((n) => allowedKinds.includes(String(n.kind))))
    return false;
  if (
    !record(x.scoreByStage) ||
    !Object.entries(x.scoreByStage).every(
      ([id, n]) =>
        ["ten-users", "hundred-users"].includes(id) &&
        finite(n) &&
        Number(n) >= 0 &&
        Number(n) <= 100,
    )
  )
    return false;
  if (
    !record(x.answers) ||
    typeof x.answers.diagnosis !== "string" ||
    typeof x.answers.tradeoff !== "string" ||
    typeof x.assumptionsConfirmed !== "boolean" ||
    typeof x.estimateAnswer !== "string" ||
    typeof x.sliceComplete !== "boolean"
  )
    return false;
  if (typeof x.preserveStoredProgress !== "boolean" || x.preserveStoredProgress)
    return false;
  if (
    Number(x.stageIndex) === 0
      ? x.confirmedEstimate !== null
      : !x.assumptionsConfirmed || !validEstimate(x.confirmedEstimate)
  )
    return false;
  if (
    !Array.isArray(x.history) ||
    x.history.length > 8 ||
    !x.history.every((v) => typeof v === "string" && v.length <= 500)
  )
    return false;
  return (
    x.selectedLearningKind === null ||
    (typeof x.selectedLearningKind === "string" &&
      Object.hasOwn(componentDefinitions, x.selectedLearningKind))
  );
}
export function loadProgress(): GameState {
  const fallback = initialState();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return fallback;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (validProgress(parsed))
        return {
          ...parsed,
          lastResult: null,
          progressNotice: null,
          preserveStoredProgress: false,
        };
    } catch {
      /* Preserve the original below before replacing corrupt data. */
    }
    try {
      localStorage.setItem(RECOVERY_KEY, raw);
    } catch {
      return {
        ...fallback,
        preserveStoredProgress: true,
        progressNotice:
          "Saved progress could not be read. Storage is unavailable; this session will not overwrite the original.",
      };
    }
    return {
      ...fallback,
      progressNotice:
        "Saved progress was incompatible. A recovery copy was retained; a fresh campaign is ready.",
    };
  } catch {
    return {
      ...fallback,
      progressNotice:
        "Browser storage is unavailable. You can play, but progress may not survive a refresh.",
    };
  }
}
export function saveProgress(state: GameState): boolean {
  if (state.preserveStoredProgress) return false;
  try {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        ...state,
        lastResult: null,
        progressNotice: null,
        preserveStoredProgress: false,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
