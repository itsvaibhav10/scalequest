import { useState } from "react";
import { GameProvider, useGame } from "../game/GameProvider";
import { CampaignIntro } from "../campaign/CampaignIntro";
import { GameWorkspace } from "../campaign/GameWorkspace";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
function Shell() {
  const { state, dispatch, storageFailed } = useGame();
  const [reset, setReset] = useState(false);
  const [help, setHelp] = useState(false);
  const milestones = [
    ["Brief", "Understand the problem"],
    ["10 users", "Build the first version"],
    ["100 users", "Keep the data safe"],
    ["1K users", "Query efficiently"],
    ["10K users", "Distribute requests"],
    ["100K users", "Offload reads"],
    ["1M users", "Handle the unexpected"],
  ];
  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="./" aria-label="ScaleQuest home">
          <Icon name="layers" size={27} />
          <span>
            Scale<span>Quest</span>
          </span>
        </a>
        <span className="header-divider" />
        <span className="header-context">System design lab</span>
        <span className="learning-mode">Learning mode</span>
        <div className="header-actions">
          <span className="saved-indicator">
            <span />
            {storageFailed ? "Session only" : "Saved locally"}
          </span>
          <Button variant="ghost" onClick={() => setHelp(true)}>
            <Icon name="book" size={17} />
            Guide
          </Button>
          <Button
            variant="ghost"
            onClick={() => setReset(true)}
            aria-label="Reset campaign"
          >
            <Icon name="reset" size={17} />
          </Button>
        </div>
      </header>
      <nav className="campaign-track" aria-label="Campaign progression">
        {milestones.map(([title, copy], i) => (
          <div
            key={title}
            aria-current={i === state.stageIndex ? "step" : undefined}
            className={`milestone ${i === state.stageIndex ? "active" : ""} ${i < state.stageIndex || (state.sliceComplete && i === 2) ? "done" : ""} ${i > 2 ? "future" : ""}`}
          >
            <span className="milestone-number">
              {i < state.stageIndex || (state.sliceComplete && i === 2) ? (
                <Icon name="check" size={16} />
              ) : (
                i + 1
              )}
            </span>
            <div>
              <strong>
                {title}
                {i > 2 && <Icon name="lock" size={12} />}
              </strong>
              <small>{copy}</small>
            </div>
          </div>
        ))}
      </nav>
      {state.progressNotice && (
        <div className="recovery-notice" role="status">
          {state.progressNotice}
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "dismiss-progress-notice" })}
          >
            Dismiss
          </Button>
        </div>
      )}
      {state.stageIndex === 0 ? <CampaignIntro /> : <GameWorkspace />}
      <footer className="app-footer">
        <span>ScaleQuest · Learn by making decisions.</span>
        <span>
          Chapter 1 of the planned 0 → 1M journey · No AI or cloud services
        </span>
      </footer>
      {reset && (
        <Modal title="Start a fresh campaign?" onClose={() => setReset(false)}>
          <p>
            This clears your local chapter progress and answers. Your current
            architecture will be replaced.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setReset(false)}>Keep learning</Button>
            <Button
              variant="primary"
              onClick={() => {
                dispatch({ type: "reset-campaign" });
                setReset(false);
              }}
            >
              Reset my progress
            </Button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="How to play" onClose={() => setHelp(false)}>
          <ol className="guide-steps">
            <li>
              Clarify the assumptions and calculate peak requests per second.
            </li>
            <li>
              Add components from the left palette and connect the output dots.
              The list below the canvas also supports keyboard connections.
            </li>
            <li>
              Run the workload. Increase traffic to discover a bottleneck.
            </li>
            <li>
              Read the trace, choose your diagnosis and explain the trade-off.
            </li>
            <li>
              Meet all objectives to unlock the persistence mission. Run its
              restart incident before and after adding the database.
            </li>
          </ol>
          <p>
            The simulation is a teaching model. Numeric presets are examples,
            not hardware benchmarks or provider pricing.
          </p>
        </Modal>
      )}
    </div>
  );
}
export function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
