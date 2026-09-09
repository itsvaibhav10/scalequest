import type { SimulationResult } from "../domain/systemDesign";
export function MetricsStrip({ result }: { result: SimulationResult | null }) {
  const rows = [
    ["Throughput", result?.throughput],
    ["p95 estimate", result?.p95Latency],
    ["Errors", result?.errorRate],
    ["Scenario success", result?.availability],
    ["Monthly cost", result?.monthlyCost],
    ["Complexity", result?.complexity],
  ] as const;
  return (
    <div className="metrics-strip">
      {rows.map(([label, m]) => (
        <details className="metric" key={label}>
          <summary>
            <span>{label}</span>
            <strong className={m?.status}>
              {m
                ? (m.unit === "usd" ? "$" : "") +
                  m.value.toLocaleString("en-US", { maximumFractionDigits: 2 })
                : "—"}
              <small>
                {m
                  ? m.unit === "usd"
                    ? "/mo"
                    : m.unit === "percent"
                      ? "%"
                      : m.unit === "points"
                        ? "pts"
                        : m.unit
                  : ""}
              </small>
            </strong>
          </summary>
          <p>{m?.explanation ?? "Run a simulation to see the result."}</p>
        </details>
      ))}
    </div>
  );
}
