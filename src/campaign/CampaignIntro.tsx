import { useState } from "react";
import { useGame } from "../game/GameProvider";
import { calculateWorkload } from "../simulator/calculateWorkload";
import { estimateCorrect } from "../scoring/calculateStageScore";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
export function CampaignIntro() {
  const { state, dispatch, begin } = useGame();
  const [showMath, setShowMath] = useState(false);
  const w = calculateWorkload(state.workload);
  const correct = estimateCorrect(state);
  return (
    <main className="intro">
      <section className="intro-story">
        <div className="intro-kicker">CAMPAIGN 01 / THE READ API</div>
        <h1>
          Good systems start
          <br />
          with better questions.
        </h1>
        <p className="intro-lead">
          Your first interview: design a product lookup API. Start small, watch
          it break, and understand every decision you make.
        </p>
        <div className="api-contract">
          <span className="http-method">GET</span>
          <code>/api/products/:id</code>
          <span className="quiet-tag">200 OK</span>
        </div>
        <pre className="response-code">
          {JSON.stringify(
            {
              id: "prod_123",
              name: "Noise Cancelling Headphones",
              price: 19999,
              currency: "INR",
              available: true,
            },
            null,
            2,
          )}
        </pre>
        <div className="intro-lessons">
          {[
            [
              "01",
              "Clarify the workload",
              "Users are not requests per second.",
            ],
            [
              "02",
              "Build the simplest path",
              "Trace one request from client to data.",
            ],
            [
              "03",
              "Respond to a new constraint",
              "See why persistence changes your design.",
            ],
          ].map(([n, title, copy]) => (
            <div key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="small muted">
          First playable chapter: brief → 10 users → 100 users.
          <br />
          Higher-scale missions are shown as the roadmap.
        </p>
      </section>
      <section className="brief-panel">
        <div className="section-label">YOUR INTERVIEW BRIEF</div>
        <h2>Before you draw a box.</h2>
        <p>
          The catalogue is a disposable prototype today. Product lookups are
          synchronous and read-only. Agree on a workload, then estimate the peak
          demand.
        </p>
        <div className="brief-assumptions">
          <div>
            <span>Daily active users</span>
            <strong>10</strong>
          </div>
          <div>
            <span>Read / write split</span>
            <strong>100% / 0%</strong>
          </div>
          <div>
            <span>Response size</span>
            <strong>2 KB</strong>
          </div>
          <div>
            <span>p95 target</span>
            <strong>≤ 200 ms</strong>
          </div>
          <div>
            <span>Monthly budget</span>
            <strong>$150</strong>
          </div>
        </div>
        <div className="form-row">
          <label>
            Requests / user / day
            <input
              type="number"
              min="1"
              max="10000"
              value={state.workload.requestsPerUserPerDay}
              onChange={(e) =>
                dispatch({
                  type: "set-workload",
                  workload: {
                    ...state.workload,
                    requestsPerUserPerDay: Math.min(
                      10000,
                      Math.max(1, Number(e.target.value)),
                    ),
                  },
                })
              }
            />
          </label>
          <label>
            Peak multiplier
            <input
              type="number"
              min="1"
              max="100"
              value={state.workload.peakMultiplier}
              onChange={(e) =>
                dispatch({
                  type: "set-workload",
                  workload: {
                    ...state.workload,
                    peakMultiplier: Math.min(
                      100,
                      Math.max(1, Number(e.target.value)),
                    ),
                  },
                })
              }
            />
          </label>
        </div>
        <label className="estimate-label">
          Your estimate: peak requests per second
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 0.12"
            value={state.estimateAnswer}
            onChange={(e) =>
              dispatch({ type: "estimate", value: e.target.value })
            }
          />
        </label>
        <Button variant="ghost" onClick={() => setShowMath(!showMath)}>
          {showMath ? "Hide calculation" : "Show me the calculation"}
        </Button>
        {showMath && (
          <div className="math-box">
            <code>
              10 × {state.workload.requestsPerUserPerDay} ÷ 86,400 ={" "}
              {w.averageRps.toFixed(4)} average RPS
            </code>
            <code>
              Average × {state.workload.peakMultiplier} = {w.peakRps.toFixed(4)}{" "}
              peak RPS
            </code>
            <p>
              Daily users are spread over time. A million registered users does
              not mean a million simultaneous requests.
            </p>
          </div>
        )}
        <label className="confirm-label">
          <input
            type="checkbox"
            checked={state.assumptionsConfirmed}
            onChange={(e) =>
              dispatch({ type: "confirm-assumptions", value: e.target.checked })
            }
          />
          I understand the workload, latency target and budget.
        </label>
        {state.estimateAnswer && (
          <p role="status" className={correct ? "success-text" : "muted"}>
            {correct
              ? "✓ Estimate checks out."
              : "Use users × daily requests ÷ 86,400 × peak multiplier."}
          </p>
        )}
        <Button
          variant="primary"
          className="full-width"
          disabled={!correct || !state.assumptionsConfirmed}
          onClick={begin}
        >
          Build my first system <Icon name="arrow" size={18} />
        </Button>
        <p className="small muted">
          No timer. No account. Your progress stays in this browser.
        </p>
      </section>
    </main>
  );
}
