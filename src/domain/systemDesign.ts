export type ComponentKind =
  | "client"
  | "rate-limiter"
  | "load-balancer"
  | "api-server"
  | "cache"
  | "local-data"
  | "relational-database"
  | "read-replica";

export type HealthStatus = "healthy" | "warning" | "critical";
export type SimulationIncident = "none" | "restart" | "node-failure" | "spike";

/** How a component treats the traffic that reaches it. */
export type ComponentRole =
  "source" | "gate" | "distributor" | "compute" | "cache" | "data";

export interface GoldenCircle {
  why: string;
  how: string;
  what: string;
  tradeoffs: string[];
  whenNotToUse: string;
}

export interface ComponentDefinition {
  kind: ComponentKind;
  label: string;
  description: string;
  role: ComponentRole;
  /** Capacity of one instance. A node scales it by `count` when `scalable`. */
  capacityRps: number;
  baseLatencyMs: number;
  monthlyCostUsd: number;
  complexityPoints: number;
  /** Instance count can be raised on the canvas (API servers, replicas). */
  scalable?: boolean;
  /** Fraction of reads a cache answers itself. */
  hitRatio?: number;
  /** Fraction of legitimate requests a rate limiter wrongly rejects. */
  falsePositiveRate?: number;
  /** Behaviour of a database whose lookup column has no index. */
  unindexed?: { capacityRps: number; baseLatencyMs: number };
  acceptsFrom: ComponentKind[];
  connectsTo: ComponentKind[];
  failureMode: string;
  learning: GoldenCircle;
}

export interface ComponentInstance {
  id: string;
  kind: ComponentKind;
  label: string;
  x: number;
  y: number;
  /** Instances behind this node; only meaningful for scalable kinds. */
  count?: number;
  /** Databases only. Missing means indexed, so older saves keep behaving. */
  indexed?: boolean;
}
export interface Connection {
  id: string;
  source: string;
  target: string;
}
export interface Architecture {
  nodes: ComponentInstance[];
  edges: Connection[];
}

export interface WorkloadInput {
  activeUsers: number;
  requestsPerUserPerDay: number;
  peakMultiplier: number;
  readRatio: number;
  payloadKb: number;
  targetP95Ms: number;
  targetAvailabilityPercent: number;
  monthlyBudgetUsd: number;
}

export interface WorkloadEstimate {
  averageRps: number;
  peakRps: number;
  peakReadRps: number;
  monthlyTransferGb: number;
  formula: string[];
}

export type ValidationIssueCode =
  | "missing-client"
  | "missing-api"
  | "missing-data"
  | "missing-load-balancer"
  | "replica-without-primary"
  | "stateful-api-scaled"
  | "invalid-count"
  | "duplicate-id"
  | "unknown-kind"
  | "invalid-workload"
  | "disconnected-path"
  | "disconnected-component"
  | "invalid-connection"
  | "unsupported-cycle";

export interface ValidationIssue {
  code: ValidationIssueCode;
  message: string;
  nodeIds: string[];
}
export interface MetricResult {
  value: number;
  unit: "rps" | "ms" | "percent" | "usd" | "points";
  status: HealthStatus;
  explanation: string;
}
export interface Bottleneck {
  componentId: string;
  severity: "warning" | "critical";
  offeredRps: number;
  capacityRps: number;
  explanation: string;
}

export interface NodeLoad {
  componentId: string;
  label: string;
  instances: number;
  offeredRps: number;
  capacityRps: number;
  /** offered / capacity; 0 when nothing arrives, Infinity when capacity is 0. */
  utilization: number;
}

export interface SimulationResult {
  valid: boolean;
  issues: ValidationIssue[];
  workload: WorkloadEstimate;
  throughput: MetricResult;
  p95Latency: MetricResult;
  errorRate: MetricResult;
  /** Successful requests in this deterministic scenario; this is not production uptime. */
  availability: MetricResult;
  monthlyCost: MetricResult;
  complexity: MetricResult;
  bottlenecks: Bottleneck[];
  nodeLoads: NodeLoad[];
  /** Abusive requests the rate limiter rejected during a spike. */
  shedRps: number;
  trace: string[];
  incident: SimulationIncident;
  durable: boolean;
}

export type ScenarioRuns = Partial<
  Record<SimulationIncident, SimulationResult>
>;

export interface StageObjective {
  id: string;
  label: string;
  /** `result` is the latest run; `runs` holds the latest run of each scenario. */
  evaluate: (
    architecture: Architecture,
    result: SimulationResult,
    runs: ScenarioRuns,
  ) => boolean;
}

export interface StageQuestion {
  prompt: string;
  options: readonly (readonly [id: string, label: string])[];
  correct: string;
}

export interface StageIncident {
  id: Exclude<SimulationIncident, "none">;
  title: string;
  description: string;
  button: string;
}

export interface CampaignStage {
  id: string;
  title: string;
  userCount: number;
  brief: string;
  interviewerPrompt: string;
  mission: { kicker: string; headline: string; summary: string };
  availableComponents: ComponentKind[];
  /** Databases added in this stage start without an index and show the toggle. */
  indexing: boolean;
  /** Merged over the learner's workload when the stage starts. */
  workloadOverrides?: Partial<WorkloadInput>;
  incidents: StageIncident[];
  questions?: { diagnosis: StageQuestion; tradeoff: StageQuestion };
  /** Component shown in the learning panel until the learner picks another. */
  focusKind: ComponentKind;
  continueLabel: string;
  /** Shown only on the last stage, where the campaign ends. */
  completion?: {
    headline: string;
    body: string;
    summary: (peakRps: string, users: number) => string;
  };
  comparisonNote: string;
  defaultWorkload: WorkloadInput;
  baseline: Architecture;
  reference: Architecture;
  objectives: StageObjective[];
}
