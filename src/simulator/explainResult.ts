import type {
  Bottleneck,
  NodeLoad,
  SimulationIncident,
  WorkloadEstimate,
} from "../domain/systemDesign";

interface ExplanationInput {
  workload: WorkloadEstimate;
  route: string[];
  loads: NodeLoad[];
  cacheNotes: string[];
  shedRps: number;
  botRps: number;
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
  ];
  if (input.incident === "spike")
    trace.push(
      `Spike: abusive traffic adds ${input.botRps.toFixed(2)} RPS on top of the legitimate peak.`,
    );
  if (input.incident === "node-failure")
    trace.push("Node failure: one API server instance stops responding.");
  trace.push(`Components in request order: ${input.route.join(", ")}.`);
  for (const load of input.loads)
    trace.push(
      `${load.label}: ${load.offeredRps.toFixed(2)} RPS offered, ${load.capacityRps.toFixed(2)} RPS capacity (${Number.isFinite(load.utilization) ? `${(load.utilization * 100).toFixed(1)}%` : "no capacity"}).`,
    );
  trace.push(...input.cacheNotes);
  if (input.incident === "spike")
    trace.push(
      input.shedRps > 0
        ? `Rate limit: ${input.shedRps.toFixed(2)} RPS of abusive traffic is rejected before it reaches your servers.`
        : "Rate limit: nothing filters the spike, so abusive and real requests compete for the same capacity.",
    );
  trace.push(
    `Latency: the estimated p95 is ${input.latencyMs.toFixed(2)} ms.`,
    input.incident === "restart" && !input.durable
      ? `Errors: the API recovered after restart, but lost process-local data causes ${input.errorRate.toFixed(2)}% errors.`
      : `Errors: ${input.errorRate.toFixed(2)}% of legitimate requests fail.`,
    `Scenario success: ${input.scenarioSuccess.toFixed(2)}% of requests succeed; this is not an uptime estimate.`,
    `Cost: instantiated components total $${input.monthlyCost.toFixed(2)}/month.`,
  );
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
