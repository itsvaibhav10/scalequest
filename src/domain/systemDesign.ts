export type ComponentKind =
  | "client"
  | "api-server"
  | "local-data"
  | "relational-database";

export type HealthStatus = "healthy" | "warning" | "critical";
export type SimulationIncident = "none" | "restart";

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
  capacityRps: number;
  baseLatencyMs: number;
  monthlyCostUsd: number;
  complexityPoints: number;
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
  | "duplicate-id"
  | "unknown-kind"
  | "invalid-workload"
  | "disconnected-path"
  | "disconnected-component"
  | "ambiguous-path"
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
  trace: string[];
  incident: SimulationIncident;
  durable: boolean;
}

export interface StageObjective {
  id: string;
  label: string;
  evaluate: (architecture: Architecture, result: SimulationResult) => boolean;
}

export interface CampaignStage {
  id: "requirements" | "ten-users" | "hundred-users";
  title: string;
  userCount: number;
  brief: string;
  interviewerPrompt: string;
  availableComponents: ComponentKind[];
  defaultWorkload: WorkloadInput;
  baseline: Architecture;
  reference: Architecture;
  objectives: StageObjective[];
}
