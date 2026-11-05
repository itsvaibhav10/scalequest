import { componentDefinitions } from "../content/components";
import type {
  Architecture,
  Bottleneck,
  ComponentInstance,
  HealthStatus,
  MetricResult,
  NodeLoad,
  SimulationIncident,
  SimulationResult,
  ValidationIssue,
  WorkloadInput,
} from "../domain/systemDesign";
import { calculateWorkload } from "./calculateWorkload";
import { explainResult } from "./explainResult";
import { capacityDuring, instanceCount, nodeSpec } from "./nodeSpec";
import { validateArchitecture } from "./validateArchitecture";

/** During a spike, abusive traffic adds this multiple of normal peak load. */
export const SPIKE_FACTOR = 3;
/** The p95 latency is the slowest path that carries at least 5% of requests. */
const TAIL = 0.05;

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
    (sum, node) =>
      sum +
      (componentDefinitions[node.kind]?.monthlyCostUsd ?? 0) *
        instanceCount(node),
    0,
  );
  const complexityValue =
    architecture.nodes.reduce(
      (sum, node) =>
        sum +
        (componentDefinitions[node.kind]?.complexityPoints ?? 0) +
        (instanceCount(node) - 1) * 0.25,
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

  const flow = routeTraffic(architecture, workload.peakRps, incident);
  const restartLostData = incident === "restart" && !durable;
  const successFraction =
    workload.peakRps === 0 ? 1 : flow.completedRps / workload.peakRps;
  const errorRate = restartLostData ? 100 : (1 - successFraction) * 100;
  const scenarioSuccess = 100 - errorRate;
  const throughputValue = restartLostData ? 0 : flow.completedRps;
  const p95Latency = tailLatency(flow.paths);
  const bottlenecks: Bottleneck[] = flow.loads
    .filter((load) => load.offeredRps > load.capacityRps)
    .map((load) => ({
      componentId: load.componentId,
      severity:
        load.offeredRps > load.capacityRps * 1.2 ? "critical" : "warning",
      offeredRps: load.offeredRps,
      capacityRps: load.capacityRps,
      explanation: `${load.label} receives ${load.offeredRps.toFixed(2)} RPS but supports ${load.capacityRps.toFixed(2)} RPS.`,
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
        : `${flow.completedRps.toFixed(2)} of ${workload.peakRps.toFixed(2)} peak RPS complete successfully.`,
    ),
    p95Latency: metric(
      p95Latency,
      "ms",
      thresholdStatus(p95Latency, workloadInput.targetP95Ms),
      "The slowest route that carries at least 5% of requests, with each component slowed as it nears capacity.",
    ),
    errorRate: metric(
      errorRate,
      "percent",
      errorRate === 0 ? "healthy" : errorRate < 5 ? "warning" : "critical",
      restartLostData
        ? "The recovered API cannot find data that was stored only in its previous process."
        : "Requests lost to overload, a failed instance or rejection by the rate limiter.",
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
      "Complexity combines component points, extra instances and 0.25 points per connection.",
    ),
    bottlenecks,
    nodeLoads: flow.loads,
    shedRps: flow.shedRps,
    trace: [],
    incident,
    durable,
  };
  result.trace = explainResult({
    workload,
    route: flow.order.map(
      (node) =>
        `${node.label}${instanceCount(node) > 1 ? ` ×${instanceCount(node)}` : ""}`,
    ),
    loads: flow.loads,
    cacheNotes: flow.cacheNotes,
    shedRps: flow.shedRps,
    botRps: flow.botRps,
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

interface RoutePath {
  probability: number;
  latencyMs: number;
}

/**
 * Pushes legitimate and abusive traffic through the (acyclic) graph in
 * topological order. A node serves at most its capacity; the rest is lost.
 * Fan-out is weighted by the capacity of each target, so identical servers
 * share traffic equally and a bigger data tier takes proportionally more.
 */
function routeTraffic(
  architecture: Architecture,
  peakRps: number,
  incident: SimulationIncident,
) {
  const byId = new Map(architecture.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, ComponentInstance[]>();
  const indegree = new Map(architecture.nodes.map((node) => [node.id, 0]));
  for (const edge of architecture.edges) {
    const target = byId.get(edge.target);
    if (!target) continue;
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), target]);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  const order: ComponentInstance[] = [];
  const ready = architecture.nodes.filter(
    (node) => indegree.get(node.id) === 0,
  );
  while (ready.length) {
    const node = ready.shift() as ComponentInstance;
    order.push(node);
    for (const next of outgoing.get(node.id) ?? []) {
      const left = (indegree.get(next.id) ?? 0) - 1;
      indegree.set(next.id, left);
      if (left === 0) ready.push(next);
    }
  }

  const botRps = incident === "spike" ? peakRps * SPIKE_FACTOR : 0;
  const incoming = new Map<string, { legit: number; bot: number }>();
  const addIncoming = (id: string, legit: number, bot: number) => {
    const current = incoming.get(id) ?? { legit: 0, bot: 0 };
    incoming.set(id, { legit: current.legit + legit, bot: current.bot + bot });
  };
  const weights = (targets: ComponentInstance[]) => {
    const capacities = targets.map((t) => capacityDuring(t, incident));
    const total = capacities.reduce((a, b) => a + b, 0);
    return capacities.map((c) =>
      total === 0 ? 1 / targets.length : c / total,
    );
  };

  const loads: NodeLoad[] = [];
  const cacheNotes: string[] = [];
  let completedRps = 0;
  let shedRps = 0;
  for (const node of order) {
    const def = componentDefinitions[node.kind];
    const inbound =
      def.role === "source"
        ? { legit: peakRps, bot: botRps }
        : (incoming.get(node.id) ?? { legit: 0, bot: 0 });
    const total = inbound.legit + inbound.bot;
    const capacity = capacityDuring(node, incident);
    const ratio =
      def.role === "source" || total === 0 ? 1 : Math.min(1, capacity / total);
    let legit = inbound.legit * ratio;
    let bot = inbound.bot * ratio;
    if (def.role !== "source")
      loads.push({
        componentId: node.id,
        label: node.label,
        instances: instanceCount(node),
        offeredRps: total,
        capacityRps: capacity,
        utilization:
          capacity === 0 ? (total > 0 ? Infinity : 0) : total / capacity,
      });
    if (def.role === "gate") {
      shedRps += bot;
      legit *= 1 - (def.falsePositiveRate ?? 0);
      bot = 0;
    }
    if (def.role === "data") {
      completedRps += legit;
      continue;
    }
    if (def.role === "cache") {
      const hit = def.hitRatio ?? 0;
      completedRps += legit * hit;
      legit *= 1 - hit;
      bot *= 1 - hit;
      cacheNotes.push(
        `${node.label} answers ${(hit * 100).toFixed(0)}% of reads itself; ${legit.toFixed(2)} RPS reach the data tier.`,
      );
    }
    const targets = outgoing.get(node.id) ?? [];
    weights(targets).forEach((weight, index) =>
      addIncoming(targets[index].id, legit * weight, bot * weight),
    );
  }

  const loadById = new Map(loads.map((load) => [load.componentId, load]));
  const paths: RoutePath[] = [];
  const walk = (
    node: ComponentInstance,
    probability: number,
    latency: number,
  ) => {
    const def = componentDefinitions[node.kind];
    const utilization = loadById.get(node.id)?.utilization ?? 0;
    const saturation = Number.isFinite(utilization) ? utilization : 0;
    const multiplier = saturation <= 0.7 ? 1 : 1 + (saturation - 0.7) * 4;
    const here = latency + nodeSpec(node).baseLatencyMs * multiplier;
    if (def.role === "data") {
      paths.push({ probability, latencyMs: here });
      return;
    }
    let remaining = probability;
    if (def.role === "cache") {
      const hit = def.hitRatio ?? 0;
      paths.push({ probability: probability * hit, latencyMs: here });
      remaining = probability * (1 - hit);
    }
    const targets = outgoing.get(node.id) ?? [];
    weights(targets).forEach((weight, index) =>
      walk(targets[index], remaining * weight, here),
    );
  };
  const client = order.find((node) => node.kind === "client");
  if (client) walk(client, 1, 0);
  return { order, loads, paths, cacheNotes, completedRps, shedRps, botRps };
}

function tailLatency(paths: RoutePath[]): number {
  const slowestFirst = paths
    .filter((path) => path.probability > 0)
    .sort((a, b) => b.latencyMs - a.latencyMs);
  let covered = 0;
  for (const path of slowestFirst) {
    covered += path.probability;
    if (covered >= TAIL) return path.latencyMs;
  }
  return slowestFirst.at(-1)?.latencyMs ?? 0;
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
    nodeLoads: [],
    shedRps: 0,
    trace: issues.map((issue) => `Validation: ${issue.message}`),
    incident,
    durable,
  };
}
