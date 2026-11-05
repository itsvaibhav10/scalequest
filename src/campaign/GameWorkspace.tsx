import { useState, useEffect } from "react";
import { useGame } from "../game/GameProvider";
import { ComponentPalette } from "../canvas/ComponentPalette";
import { ArchitectureCanvas } from "../canvas/ArchitectureCanvas";
import { InterviewerPanel } from "../interview/InterviewerPanel";
import { SimulationConsole } from "../metrics/SimulationConsole";
import { ComparisonDrawer } from "../comparison/ComparisonDrawer";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { calculateStageScore } from "../scoring/calculateStageScore";
export function GameWorkspace() {
  const { state, stage, dispatch, canCompleteStage, completeStage } = useGame();
  const [compare, setCompare] = useState(false);
  const score = calculateStageScore(state);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage.id]);
  return (
    <>
      <div className="workspace">
        <ComponentPalette />
        <main className="workspace-main">
          <div className="mission-heading">
            <div>
              <h1>{stage.mission.headline}</h1>
              <p>{stage.mission.summary}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => dispatch({ type: "reset-stage" })}
              title="Restore this stage’s starting design"
            >
              <Icon name="reset" size={16} />
              Reset canvas
            </Button>
          </div>
          <div className="mobile-notice">
            <Icon name="layers" />
            <p>
              Use a wider screen to edit the architecture. You can still read
              the brief, explanations and simulation results here.
            </p>
          </div>
          <div className="desktop-editor">
            <ArchitectureCanvas key={stage.id} />
          </div>
          <div className="canvas-toolbar">
            <span className="small muted">
              Traffic flows left to right ·{" "}
              {stage.userCount.toLocaleString("en-US")} daily users
            </span>
            <Button variant="ghost" onClick={() => setCompare(true)}>
              <Icon name="compare" size={16} />
              Compare designs
            </Button>
          </div>
          <SimulationConsole />
          <div className="objectives">
            <h3>Mission objectives</h3>
            {stage.objectives.map((o) => {
              const passed =
                !!state.lastResult &&
                o.evaluate(state.architecture, state.lastResult, state.runs);
              return (
                <div
                  key={o.id}
                  className={passed ? "objective passed" : "objective"}
                >
                  <span className="obj-mark">
                    {passed && <Icon name="check" size={13} />}
                  </span>
                  {o.label}
                </div>
              );
            })}
            <div
              className={score.total === 100 ? "objective passed" : "objective"}
            >
              <span className="obj-mark">
                {score.total === 100 && <Icon name="check" size={13} />}
              </span>
              Defend your diagnosis and trade-offs
            </div>
            <Button
              variant="primary"
              onClick={completeStage}
              disabled={!canCompleteStage}
            >
              {state.sliceComplete ? "Campaign complete" : stage.continueLabel}
              <Icon name="arrow" size={16} />
            </Button>
          </div>
          {state.sliceComplete && stage.completion && (
            <section className="completion">
              <span className="success-text">✓ CAMPAIGN COMPLETE</span>
              <h2>{stage.completion.headline}</h2>
              <p>{stage.completion.body}</p>
              <h3>Your interview summary</h3>
              <p>
                “
                {stage.completion.summary(
                  state.lastResult?.workload.peakRps.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  }) ?? "a large number of",
                  state.workload.activeUsers,
                )}
                ”
              </p>
              <Button onClick={() => setCompare(true)}>
                Review my architecture
              </Button>
            </section>
          )}
        </main>
        <InterviewerPanel />
      </div>
      {compare && <ComparisonDrawer onClose={() => setCompare(false)} />}
    </>
  );
}
