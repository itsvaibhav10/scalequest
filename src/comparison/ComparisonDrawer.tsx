import { useState } from "react";
import { useGame } from "../game/GameProvider";
import { simulateArchitecture } from "../simulator/simulate";
import { componentDefinitions } from "../content/components";
import { Modal } from "../ui/Modal";
import type { SimulationIncident } from "../domain/systemDesign";
export function ComparisonDrawer({ onClose }: { onClose: () => void }) {
  const { state, stage } = useGame();
  const [incident, setIncident] = useState<SimulationIncident>(
    stage.incidents[0]?.id ?? "none",
  );
  const designs = [
    ["Baseline", stage.baseline],
    ["Your design", state.architecture],
    ["Reference", stage.reference],
  ] as const;
  return (
    <Modal title="Compare the trade-offs" onClose={onClose} wide>
      <p className="muted">
        Same workload, same scenario. The reference is one valid design, not the
        only answer.
      </p>
      {stage.incidents.length > 0 && (
        <label className="scenario-picker">
          Scenario
          <select
            value={incident}
            onChange={(e) => setIncident(e.target.value as SimulationIncident)}
          >
            <option value="none">Normal traffic</option>
            {stage.incidents.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title
                  .replace("Incident / ", "")
                  .replace(/^./, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="comparison-grid">
        {designs.map(([name, graph]) => {
          const r = simulateArchitecture(graph, state.workload, incident);
          return (
            <section key={name}>
              <h3>{name}</h3>
              <p className="comparison-path">
                {graph.nodes
                  .map(
                    (n) =>
                      `${n.label}${(n.count ?? 1) > 1 ? ` ×${n.count}` : ""}`,
                  )
                  .join(" → ")}
              </p>
              <dl>
                <div>
                  <dt>Connected path</dt>
                  <dd>{r.valid ? "Valid" : "Incomplete"}</dd>
                </div>
                <div>
                  <dt>Monthly cost</dt>
                  <dd>$ {r.monthlyCost.value}</dd>
                </div>
                <div>
                  <dt>Complexity</dt>
                  <dd>{r.complexity.value}</dd>
                </div>
                <div>
                  <dt>Scenario success</dt>
                  <dd>{r.availability.value.toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>Errors</dt>
                  <dd>{r.errorRate.value.toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>p95 estimate</dt>
                  <dd>{r.p95Latency.value.toFixed(2)} ms</dd>
                </div>
              </dl>
              <h4>Failure modes</h4>
              {graph.nodes
                .filter((n) => n.kind !== "client")
                .map((n) => (
                  <p key={n.id} className="small muted">
                    {componentDefinitions[n.kind].failureMode}
                  </p>
                ))}
            </section>
          );
        })}
      </div>
      <p className="callout">{stage.comparisonNote}</p>
    </Modal>
  );
}
