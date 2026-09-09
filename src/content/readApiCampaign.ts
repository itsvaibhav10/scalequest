import type {
  Architecture,
  CampaignStage,
  WorkloadInput,
} from "../domain/systemDesign";

const graph = (
  dataKind: "local-data" | "relational-database",
): Architecture => ({
  nodes: [
    { id: "client", kind: "client", label: "Client", x: 40, y: 120 },
    { id: "api", kind: "api-server", label: "API server", x: 280, y: 120 },
    {
      id: "data",
      kind: dataKind,
      label: dataKind === "local-data" ? "Local data" : "Relational database",
      x: 520,
      y: 120,
    },
  ],
  edges: [
    { id: "client-api", source: "client", target: "api" },
    { id: "api-data", source: "api", target: "data" },
  ],
});

const empty: Architecture = { nodes: [], edges: [] };
const tenUserBaseline: Architecture = {
  nodes: [
    { id: "client", kind: "client", label: "Client", x: 40, y: 120 },
    { id: "api", kind: "api-server", label: "API server", x: 280, y: 120 },
  ],
  edges: [{ id: "client-api", source: "client", target: "api" }],
};
const baseWorkload: Omit<WorkloadInput, "activeUsers"> = {
  requestsPerUserPerDay: 100,
  peakMultiplier: 10,
  readRatio: 1,
  payloadKb: 2,
  targetP95Ms: 200,
  targetAvailabilityPercent: 99,
  monthlyBudgetUsd: 150,
};

export const readApiStages: CampaignStage[] = [
  {
    id: "requirements",
    title: "Clarify the read API",
    userCount: 0,
    brief:
      "Define measurable traffic, latency, read mix, payload, and budget assumptions for GET /api/products/:id.",
    interviewerPrompt:
      "Which assumptions would you clarify before drawing an architecture?",
    availableComponents: [],
    defaultWorkload: { ...baseWorkload, activeUsers: 10 },
    baseline: empty,
    reference: empty,
    objectives: [],
  },
  {
    id: "ten-users",
    title: "Serve 10 users",
    userCount: 10,
    brief:
      "Build the smallest connected read path that satisfies the current constraints.",
    interviewerPrompt:
      "What is the simplest design that meets these requirements, and what does it give up?",
    availableComponents: ["client", "api-server", "local-data"],
    defaultWorkload: { ...baseWorkload, activeUsers: 10 },
    baseline: tenUserBaseline,
    reference: graph("local-data"),
    objectives: [
      {
        id: "valid-path",
        label: "Create one valid request path",
        evaluate: (_architecture, result) => result.valid,
      },
      {
        id: "within-budget",
        label: "Stay within the monthly budget",
        evaluate: (_architecture, result) =>
          result.valid && result.monthlyCost.value <= 150,
      },
      {
        id: "latency-target",
        label: "Meet the p95 latency target",
        evaluate: (_architecture, result) =>
          result.valid && result.p95Latency.value <= 200,
      },
      {
        id: "scenario-success",
        label: "Keep scenario success at or above 99%",
        evaluate: (_architecture, result) =>
          result.valid && result.availability.value >= 99,
      },
    ],
  },
  {
    id: "hundred-users",
    title: "Survive a restart",
    userCount: 100,
    brief:
      "The API restarts after serving traffic. Preserve product data and still meet cost and latency constraints.",
    interviewerPrompt:
      "Which requirement changed, and which component addresses that requirement?",
    availableComponents: [
      "client",
      "api-server",
      "local-data",
      "relational-database",
    ],
    defaultWorkload: { ...baseWorkload, activeUsers: 100 },
    baseline: graph("local-data"),
    reference: graph("relational-database"),
    objectives: [
      {
        id: "valid-path",
        label: "Create one valid request path",
        evaluate: (_architecture, result) => result.valid,
      },
      {
        id: "within-budget",
        label: "Stay within the monthly budget",
        evaluate: (_architecture, result) =>
          result.valid && result.monthlyCost.value <= 150,
      },
      {
        id: "latency-target",
        label: "Meet the p95 latency target",
        evaluate: (_architecture, result) =>
          result.valid && result.p95Latency.value <= 200,
      },
      {
        id: "scenario-success",
        label: "Keep scenario success at or above 99%",
        evaluate: (_architecture, result) =>
          result.valid && result.availability.value >= 99,
      },
      {
        id: "restart-durable",
        label: "Keep data after an API restart",
        evaluate: (_architecture, result) =>
          result.valid && result.incident === "restart" && result.durable,
      },
    ],
  },
];
