import { componentDefinitions } from "../content/components";
import type {
  Architecture,
  Bottleneck,
  HealthStatus,
  MetricResult,
  SimulationIncident,
  SimulationResult,
  ValidationIssue,
  WorkloadInput,
} from "../domain/systemDesign";
import { calculateWorkload } from "./calculateWorkload";
import { explainResult } from "./explainResult";
import { validateArchitecture } from "./validateArchitecture";

export function simulateArchitecture(
  architecture: Architecture,
  workloadInput: WorkloadInput,
  incident: SimulationIncident = "none",
): SimulationResult {
  const workloadIssues = validateWorkload(workloadInput);
  const safeInput = workloadIssues.length
    ? safeWorkload(workloadInput)
    : workloadInput;
  const workload = calculateWorkload(safeInput);
  const issues = [...workloadIssues, ...validateArchitecture(architecture)];
  const cost = architecture.nodes.reduce(
    (sum, node) => sum + (componentDefinitions[node.kind]?.monthlyCostUsd ?? 0),
    0,
  );
  const complexityValue =
    architecture.nodes.reduce(
      (sum, node) =>
        sum + (componentDefinitions[node.kind]?.complexityPoints ?? 0),
      0,
    ) +
    architecture.edges.length * 0.25;
  const durable = architecture.nodes.some(
    (node) => node.kind === "relational-database",
  );

  if (issues.length)
    return invalidResult(
      issues,
      workload,
      cost,
      complexityValue,
      incident,
      durable,
    );

  const path = resolveSinglePath(architecture);
  const processingNodes = path.filter((node) => node.kind !== "client");
  const pathCapacity = Math.min(
    ...processingNodes.map(
      (node) => componentDefinitions[node.kind].capacityRps,
    ),
  );
  const normalThroughput = Math.min(workload.peakRps, pathCapacity);
  const overloadRatio =
    workload.peakRps === 0
      ? 0
      : Math.max(0, workload.peakRps - pathCapacity) / workload.peakRps;
  const saturation = pathCapacity === 0 ? 0 : workload.peakRps / pathCapacity;
  const latencyMultiplier = saturation <= 0.7 ? 1 : 1 + (saturation - 0.7) * 4;
  const p95Latency =
    path.reduce(
      (sum, node) => sum + componentDefinitions[node.kind].baseLatencyMs,
      0,
    ) * latencyMultiplier;
  const restartLostData = incident === "restart" && !durable;
  const errorRate = restartLostData ? 100 : overloadRatio * 100;
  const scenarioSuccess = 100 - errorRate;
  const throughputValue = restartLostData ? 0 : normalThroughput;
  const bottlenecks: Bottleneck[] = processingNodes
    .filter(
      (node) => workload.peakRps > componentDefinitions[node.kind].capacityRps,
    )
    .map((node) => ({
      componentId: node.id,
      severity:
        workload.peakRps > componentDefinitions[node.kind].capacityRps * 1.2
          ? "critical"
          : "warning",
      offeredRps: workload.peakRps,
      capacityRps: componentDefinitions[node.kind].capacityRps,
      explanation: `${node.label} receives ${workload.peakRps.toFixed(2)} RPS but supports ${componentDefinitions[node.kind].capacityRps} RPS.`,
    }));

  const result: SimulationResult = {
    valid: true,
    issues: [],
    workload,
    throughput: metric(
      throughputValue,
      "rps",
      restartLostData || bottlenecks.length ? "critical" : "healthy",
      restartLostData
        ? "The API recovered, but no successful reads remain because its local data was lost."
        : `Successful throughput is limited to ${pathCapacity} RPS by the request path.`,
    ),
    p95Latency: metric(
      p95Latency,
      "ms",
      thresholdStatus(p95Latency, workloadInput.targetP95Ms),
      `Base path latency is adjusted by a ${latencyMultiplier.toFixed(2)}× saturation multiplier.`,
    ),
    errorRate: metric(
      errorRate,
      "percent",
      errorRate === 0 ? "healthy" : errorRate < 5 ? "warning" : "critical",
      restartLostData
        ? "The recovered API cannot find data that was stored only in its previous process."
        : "This estimate models errors caused by capacity overload.",
    ),
    availability: metric(
      scenarioSuccess,
      "percent",
      scenarioSuccess >= workloadInput.targetAvailabilityPercent
        ? "healthy"
        : "critical",
      "This is the percentage of successful requests in this simulation scenario, not an uptime or production-availability estimate.",
    ),
    monthlyCost: metric(
      cost,
      "usd",
      thresholdStatus(cost, workloadInput.monthlyBudgetUsd),
      `Instantiated components cost $${cost.toFixed(2)} per month.`,
    ),
    complexity: metric(
      complexityValue,
      "points",
      complexityValue <= 4
        ? "healthy"
        : complexityValue <= 7
          ? "warning"
          : "critical",
      "Complexity combines component points with 0.25 points per connection.",
    ),
    bottlenecks,
    trace: [],
    incident,
    durable,
  };
  result.trace = explainResult({
    workload,
    path,
    pathCapacity,
    saturation,
    latencyMs: p95Latency,
    errorRate,
    scenarioSuccess,
    monthlyCost: cost,
    bottlenecks,
    incident,
    durable,
  });
  return result;
}

function validateWorkload(input: WorkloadInput): ValidationIssue[] {
  const positive = [
    "activeUsers",
    "peakMultiplier",
    "targetP95Ms",
    "targetAvailabilityPercent",
  ] as const;
  const nonNegative = [
    "requestsPerUserPerDay",
    "payloadKb",
    "monthlyBudgetUsd",
  ] as const;
  const invalid =
    positive.some((key) => !Number.isFinite(input[key]) || input[key] <= 0) ||
    nonNegative.some((key) => !Number.isFinite(input[key]) || input[key] < 0) ||
    !Number.isFinite(input.readRatio) ||
    input.readRatio < 0 ||
    input.readRatio > 1 ||
    input.targetAvailabilityPercent > 100;
  return invalid
    ? [
        {
          code: "invalid-workload",
          message:
            "Use finite workload values: positive users, peak and targets; requests may be zero; read ratio must be 0–1.",
          nodeIds: [],
        },
      ]
    : [];
}

function safeWorkload(input: WorkloadInput): WorkloadInput {
  const finiteOrZero = (value: number) =>
    Number.isFinite(value) ? Math.max(0, value) : 0;
  return {
    activeUsers: finiteOrZero(input.activeUsers),
    requestsPerUserPerDay: finiteOrZero(input.requestsPerUserPerDay),
    peakMultiplier: finiteOrZero(input.peakMultiplier),
    readRatio: Math.min(1, finiteOrZero(input.readRatio)),
    payloadKb: finiteOrZero(input.payloadKb),
    targetP95Ms: finiteOrZero(input.targetP95Ms),
    targetAvailabilityPercent: Math.min(
      100,
      finiteOrZero(input.targetAvailabilityPercent),
    ),
    monthlyBudgetUsd: finiteOrZero(input.monthlyBudgetUsd),
  };
}

function resolveSinglePath(architecture: Architecture) {
  const byId = new Map(architecture.nodes.map((node) => [node.id, node]));
  const path = [] as Architecture["nodes"];
  let current = architecture.nodes.find((node) => node.kind === "client");
  while (current) {
    path.push(current);
    const edge = architecture.edges.find(
      (candidate) => candidate.source === current?.id,
    );
    current = edge ? byId.get(edge.target) : undefined;
  }
  return path;
}

function metric(
  value: number,
  unit: MetricResult["unit"],
  status: HealthStatus,
  explanation: string,
): MetricResult {
  return { value, unit, status, explanation };
}

function thresholdStatus(value: number, target: number): HealthStatus {
  if (value <= target) return "healthy";
  return value <= target * 1.2 ? "warning" : "critical";
}

function invalidResult(
  issues: ValidationIssue[],
  workload: ReturnType<typeof calculateWorkload>,
  cost: number,
  complexityValue: number,
  incident: SimulationIncident,
  durable: boolean,
): SimulationResult {
  const critical = (unit: MetricResult["unit"], explanation: string) =>
    metric(0, unit, "critical", explanation);
  return {
    valid: false,
    issues,
    workload,
    throughput: critical(
      "rps",
      "Fix validation issues before throughput can be simulated.",
    ),
    p95Latency: critical(
      "ms",
      "Fix validation issues before latency can be simulated.",
    ),
    errorRate: {
      value: 100,
      unit: "percent",
      status: "critical",
      explanation: "The invalid architecture cannot serve the scenario.",
    },
    availability: critical(
      "percent",
      "Scenario success is zero for an invalid architecture; this is not an uptime estimate.",
    ),
    monthlyCost: metric(
      cost,
      "usd",
      "warning",
      `The current components would cost $${cost.toFixed(2)} per month.`,
    ),
    complexity: metric(
      complexityValue,
      "points",
      "warning",
      "Complexity is shown even though the graph is invalid.",
    ),
    bottlenecks: [],
    trace: issues.map((issue) => `Validation: ${issue.message}`),
    incident,
    durable,
  };
}
