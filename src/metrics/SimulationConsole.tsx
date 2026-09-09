import { useGame } from "../game/GameProvider";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { MetricsStrip } from "./MetricsStrip";
export function SimulationConsole() {
  const { state, dispatch, runSimulation } = useGame();
  const result = state.lastResult;
  return (
    <section className="simulation-console">
      <div className="console-heading">
        <h2>Traffic configuration</h2>
        <span className="small muted">Educational model · presets v1</span>
      </div>
      <div className="traffic-controls">
        <label>
          Daily active users
          <input
            aria-label="Daily active users"
            type="number"
            min="1"
            max="1000000"
            value={state.workload.activeUsers}
            onChange={(e) =>
              dispatch({
                type: "set-workload",
                workload: {
                  ...state.workload,
                  activeUsers: Math.min(
                    1000000,
                    Math.max(1, Number(e.target.value)),
                  ),
                },
              })
            }
          />
        </label>
        <label>
          Requests / user / day
          <input
            type="number"
            min="0"
            max="1000000"
            value={state.workload.requestsPerUserPerDay}
            onChange={(e) =>
              dispatch({
                type: "set-workload",
                workload: {
                  ...state.workload,
                  requestsPerUserPerDay: Math.min(
                    1e6,
                    Math.max(0, Number(e.target.value)),
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
            max="1000"
            value={state.workload.peakMultiplier}
            onChange={(e) =>
              dispatch({
                type: "set-workload",
                workload: {
                  ...state.workload,
                  peakMultiplier: Math.min(
                    1000,
                    Math.max(1, Number(e.target.value)),
                  ),
                },
              })
            }
          />
        </label>
        <Button variant="primary" onClick={() => runSimulation()}>
          <Icon name="play" size={16} />
          Run simulation
        </Button>
      </div>
      {state.stageIndex === 2 && (
        <div className="incident-banner">
          <div>
            <strong>Incident / API restart</strong>
            <p>After the API comes back, can it still find the product?</p>
          </div>
          <Button onClick={() => runSimulation(true)}>
            Run restart incident
          </Button>
        </div>
      )}
      <MetricsStrip result={result} />
      <details className="trace-panel">
        <summary>
          Inspect the calculations{" "}
          {result ? "· last run" : "· run an experiment first"}
        </summary>
        {result ? (
          <>
            <ol>
              {result.trace.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
            {result.issues.map((i, n) => (
              <p className="error-text" key={n}>
                {i.message}
              </p>
            ))}
          </>
        ) : (
          <p>Your inputs, request path and calculations appear here.</p>
        )}
      </details>
      <p className="model-note">
        Cost excludes real hosting, bandwidth and engineering time. Latency is
        illustrative; scenario success is not an uptime SLA.
      </p>
    </section>
  );
}
