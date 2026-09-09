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
              <div className="section-label">
                MISSION {state.stageIndex.toString().padStart(2, "0")} /{" "}
                {state.stageIndex === 1 ? "FOUNDATIONS" : "PERSISTENCE"}
              </div>
              <h1>
                {state.stageIndex === 1
                  ? "Keep it simple."
                  : "Make the data survive."}
              </h1>
              <p>
                {state.stageIndex === 1
                  ? "Serve product lookups for 10 daily active users."
                  : "100 daily users. One new promise: a restart must not erase products."}
              </p>
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
            <span className="small muted">One synchronous request path</span>
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
                o.evaluate(state.architecture, state.lastResult);
              return (
                <div
                  key={o.id}
                  className={passed ? "objective passed" : "objective"}
                >
                  <span>{passed ? "✓" : "○"}</span>
                  {o.label}
                </div>
              );
            })}
            <div
              className={score.total === 100 ? "objective passed" : "objective"}
            >
              <span>{score.total === 100 ? "✓" : "○"}</span>Defend your
              diagnosis and trade-offs
            </div>
            <Button
              variant="primary"
              onClick={completeStage}
              disabled={!canCompleteStage}
            >
              {state.sliceComplete
                ? "Chapter complete"
                : state.stageIndex === 1
                  ? "Continue to 100 users"
                  : "Complete this chapter"}
              <Icon name="arrow" size={16} />
            </Button>
          </div>
          {state.sliceComplete && (
            <section className="completion">
              <span className="success-text">✓ FIRST CHAPTER COMPLETE</span>
              <h2>You designed for the requirement.</h2>
              <p>
                You started with a simple read path, estimated traffic, and
                moved product data outside the API process when durability
                became necessary.
              </p>
              <h3>Your interview summary</h3>
              <p>
                “For {state.workload.activeUsers} daily users, I expect{" "}
                {state.lastResult?.workload.peakRps.toFixed(2) ??
                  "a small number of"}{" "}
                peak requests per second. A client calls one API server, which
                reads an external database. This adds cost and a dependency but
                preserves data after the API restarts. The API is still a single
                point of failure; replication and traffic routing would need new
                requirements.”
              </p>
              <p className="muted">
                Next chapter: indexes, pooling and scaling the API. These
                missions are on the roadmap.
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
