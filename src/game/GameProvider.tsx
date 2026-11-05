import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { gameReducer, type GameAction, type GameState } from "./gameReducer";
import { loadProgress, saveProgress } from "../persistence/progressStorage";
import { readApiStages } from "../content/readApiCampaign";
import { simulateArchitecture } from "../simulator/simulate";
import {
  calculateStageScore,
  estimateCorrect,
} from "../scoring/calculateStageScore";
import type { CampaignStage, SimulationIncident } from "../domain/systemDesign";
interface Value {
  state: GameState;
  stage: CampaignStage;
  dispatch: React.Dispatch<GameAction>;
  runSimulation: (incident?: SimulationIncident) => void;
  canCompleteStage: boolean;
  completeStage: () => void;
  begin: () => void;
  storageFailed: boolean;
}
const Context = createContext<Value | null>(null);
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadProgress);
  const [storageFailed, setStorageFailed] = useState(false);
  const stage = readApiStages[state.stageIndex];
  useEffect(() => {
    if (!saveProgress(state)) setStorageFailed(true);
  }, [state]);
  const score = calculateStageScore(state);
  const canCompleteStage =
    !!state.lastResult &&
    stage.objectives.every((o) =>
      o.evaluate(state.architecture, state.lastResult!, state.runs),
    ) &&
    score.total === 100 &&
    !state.sliceComplete;
  const runSimulation = (incident: SimulationIncident = "none") =>
    dispatch({
      type: "store-result",
      result: simulateArchitecture(
        state.architecture,
        state.workload,
        incident,
      ),
    });
  const completeStage = () => {
    if (canCompleteStage)
      dispatch({ type: "complete-stage", score: score.total });
  };
  const begin = () => {
    if (state.assumptionsConfirmed && estimateCorrect(state))
      dispatch({ type: "begin" });
  };
  return (
    <Context.Provider
      value={{
        state,
        stage,
        dispatch,
        runSimulation,
        canCompleteStage,
        completeStage,
        begin,
        storageFailed,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useGame() {
  const c = useContext(Context);
  if (!c) throw new Error("GameProvider missing");
  return c;
}
