import type {
  Bottleneck,
  ComponentInstance,
  SimulationIncident,
  WorkloadEstimate,
} from "../domain/systemDesign";

interface ExplanationInput {
  workload: WorkloadEstimate;
  path: ComponentInstance[];
  pathCapacity: number;
  saturation: number;
  latencyMs: number;
  errorRate: number;
  scenarioSuccess: number;
  monthlyCost: number;
  bottlenecks: Bottleneck[];
  incident: SimulationIncident;
  durable: boolean;
}

export function explainResult(input: ExplanationInput): string[] {
  const trace = [
    `Workload: ${input.workload.averageRps.toFixed(2)} average RPS becomes ${input.workload.peakRps.toFixed(2)} peak RPS.`,
    `Path: ${input.path.map((node) => node.label).join(" → ")}.`,
    `Capacity: the processing path supports ${input.pathCapacity.toFixed(2)} RPS.`,
    `Saturation: peak load uses ${(input.saturation * 100).toFixed(2)}% of path capacity.`,
    `Latency: the estimated p95 is ${input.latencyMs.toFixed(2)} ms.`,
    input.incident === "restart" && !input.durable
      ? `Errors: the API recovered after restart, but lost process-local data causes ${input.errorRate.toFixed(2)}% errors.`
      : `Errors: capacity overload produces ${input.errorRate.toFixed(2)}% errors.`,
    `Scenario success: ${input.scenarioSuccess.toFixed(2)}% of requests succeed; this is not an uptime estimate.`,
    `Cost: instantiated components total $${input.monthlyCost.toFixed(2)}/month.`,
  ];
  if (input.incident === "restart")
    trace.push(
      input.durable
        ? "Restart: the API recovers and committed database data remains available."
        : "Restart: the API recovers, but process-local data was lost.",
    );
  if (input.bottlenecks[0])
    trace.push(`First bottleneck: ${input.bottlenecks[0].explanation}`);
  return trace;
}
