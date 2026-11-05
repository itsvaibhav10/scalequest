import type {
  Architecture,
  CampaignStage,
  ComponentKind,
  ScenarioRuns,
  SimulationResult,
  StageObjective,
  WorkloadInput,
} from "../domain/systemDesign";

interface Layers {
  limiter?: boolean;
  lb?: boolean;
  apis?: number;
  cache?: boolean;
  data?: "local-data" | "relational-database";
  indexed?: boolean;
  replicas?: number;
}

const labels: Record<ComponentKind, string> = {
  client: "Client",
  "rate-limiter": "Rate limiter",
  "load-balancer": "Load balancer",
  "api-server": "API server",
  cache: "Cache",
  "local-data": "Local data",
  "relational-database": "Relational database",
  "read-replica": "Read replicas",
};

/** Lays out the request path left to right, one column per layer. */
function build(layers: Layers): Architecture {
  const columns: { id: string; kind: ComponentKind; extra?: object }[] = [
    { id: "client", kind: "client" },
  ];
  if (layers.limiter) columns.push({ id: "limiter", kind: "rate-limiter" });
  if (layers.lb) columns.push({ id: "lb", kind: "load-balancer" });
  columns.push({
    id: "api",
    kind: "api-server",
    extra: layers.apis && layers.apis > 1 ? { count: layers.apis } : {},
  });
  if (layers.cache) columns.push({ id: "cache", kind: "cache" });
  const nodes: Architecture["nodes"] = columns.map((column, index) => ({
    id: column.id,
    kind: column.kind,
    label: labels[column.kind],
    x: 40 + index * 192,
    y: 120,
    ...column.extra,
  }));
  const edges: Architecture["edges"] = [];
  const link = (source: string, target: string) =>
    edges.push({ id: `${source}-${target}`, source, target });
  columns
    .slice(1)
    .forEach((column, index) => link(columns[index].id, column.id));
  const last = columns[columns.length - 1].id;
  const dataX = 40 + columns.length * 192;
  if (layers.data) {
    nodes.push({
      id: "data",
      kind: layers.data,
      label: labels[layers.data],
      x: dataX,
      y: layers.replicas ? 20 : 120,
      ...(layers.data === "relational-database" && layers.indexed !== undefined
        ? { indexed: layers.indexed }
        : {}),
    });
    link(last, "data");
  }
  if (layers.replicas) {
    nodes.push({
      id: "replicas",
      kind: "read-replica",
      label: labels["read-replica"],
      x: dataX,
      y: 240,
      count: layers.replicas,
    });
    link(last, "replicas");
  }
  return { nodes, edges };
}

const empty: Architecture = { nodes: [], edges: [] };
const baseWorkload: Omit<WorkloadInput, "activeUsers"> = {
  requestsPerUserPerDay: 100,
  peakMultiplier: 10,
  readRatio: 1,
  payloadKb: 2,
  targetP95Ms: 200,
  targetAvailabilityPercent: 99,
  monthlyBudgetUsd: 150,
};

const calm = (
  runs: ScenarioRuns,
  test: (result: SimulationResult) => boolean,
) => !!runs.none && runs.none.valid && test(runs.none);

/** The shared objectives of every scaling chapter, judged on normal traffic. */
const scalingObjectives = (budget: number): StageObjective[] => [
  {
    id: "valid-path",
    label: "Create a valid request path",
    evaluate: (_architecture, result) => result.valid,
  },
  {
    id: "within-budget",
    label: `Stay within the $${budget} monthly budget`,
    evaluate: (_architecture, _result, runs) =>
      calm(runs, (r) => r.monthlyCost.value <= budget),
  },
  {
    id: "latency-target",
    label: "Meet the p95 latency target on normal traffic",
    evaluate: (_architecture, _result, runs) =>
      calm(runs, (r) => r.p95Latency.value <= 200),
  },
  {
    id: "scenario-success",
    label: "Keep scenario success at or above 99% on normal traffic",
    evaluate: (_architecture, _result, runs) =>
      calm(runs, (r) => r.availability.value >= 99),
  },
];

const survives = (
  id: StageObjective["id"],
  label: string,
  incident: "node-failure" | "spike",
): StageObjective => ({
  id,
  label,
  evaluate: (_architecture, _result, runs) => {
    const run = runs[incident];
    return !!run && run.valid && run.availability.value >= 99;
  },
});

const tenUserObjectives: StageObjective[] = [
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
];

const stageWorkload = (
  activeUsers: number,
  overrides: Partial<WorkloadInput> = {},
): WorkloadInput => ({ ...baseWorkload, activeUsers, ...overrides });

const stageThree = stageWorkload(1000, {
  requestsPerUserPerDay: 500,
  monthlyBudgetUsd: 250,
});
const stageFour = stageWorkload(10_000, {
  requestsPerUserPerDay: 500,
  monthlyBudgetUsd: 400,
});
const stageFive = stageWorkload(100_000, {
  requestsPerUserPerDay: 500,
  monthlyBudgetUsd: 1000,
});
const stageSix = stageWorkload(1_000_000, { monthlyBudgetUsd: 1500 });

const relational = {
  data: "relational-database",
  indexed: true,
} as const satisfies Layers;
const tenThousandReference = build({
  lb: true,
  apis: 3,
  ...relational,
});
const hundredThousandReference = build({
  lb: true,
  apis: 12,
  cache: true,
  ...relational,
});

export const readApiStages: CampaignStage[] = [
  {
    id: "requirements",
    title: "Clarify the read API",
    userCount: 0,
    brief:
      "Define measurable traffic, latency, read mix, payload, and budget assumptions for GET /api/products/:id.",
    interviewerPrompt:
      "Which assumptions would you clarify before drawing an architecture?",
    mission: {
      kicker: "MISSION 00 / REQUIREMENTS",
      headline: "Clarify the problem.",
      summary: "Agree on measurable assumptions before drawing anything.",
    },
    availableComponents: [],
    indexing: false,
    incidents: [],
    focusKind: "client",
    continueLabel: "Start",
    comparisonNote: "",
    defaultWorkload: stageWorkload(10),
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
    mission: {
      kicker: "MISSION 01 / FOUNDATIONS",
      headline: "Keep it simple.",
      summary: "Serve product lookups for 10 daily active users.",
    },
    availableComponents: ["client", "api-server", "local-data"],
    indexing: false,
    incidents: [],
    questions: {
      diagnosis: {
        prompt: "What is the constraint at this scale?",
        options: [
          ["capacity", "We need more API servers."],
          ["simple", "No capacity bottleneck: keep the request path simple."],
          ["queue", "Every read needs a queue."],
        ],
        correct: "simple",
      },
      tradeoff: {
        prompt: "What are you accepting with local data?",
        options: [
          ["volatile", "Low cost, but data is lost when the process restarts."],
          ["durable", "It is as durable as an external database."],
          ["free", "There are no operational trade-offs."],
        ],
        correct: "volatile",
      },
    },
    focusKind: "local-data",
    continueLabel: "Continue to 100 users",
    comparisonNote:
      "Nothing here is slow or expensive yet. The simplest path is the right one until a requirement changes.",
    defaultWorkload: stageWorkload(10),
    baseline: build({}),
    reference: build({ data: "local-data" }),
    objectives: tenUserObjectives,
  },
  {
    id: "hundred-users",
    title: "Survive a restart",
    userCount: 100,
    brief:
      "The API restarts after serving traffic. Preserve product data and still meet cost and latency constraints.",
    interviewerPrompt:
      "Which requirement changed, and which component addresses that requirement?",
    mission: {
      kicker: "MISSION 02 / PERSISTENCE",
      headline: "Make the data survive.",
      summary:
        "100 daily users. One new promise: a restart must not erase products.",
    },
    availableComponents: [
      "client",
      "api-server",
      "local-data",
      "relational-database",
    ],
    indexing: false,
    incidents: [
      {
        id: "restart",
        title: "Incident / API restart",
        description: "After the API comes back, can it still find the product?",
        button: "Run restart incident",
      },
    ],
    questions: {
      diagnosis: {
        prompt: "Why did the product disappear after restart?",
        options: [
          ["traffic", "100 users always overload one API server."],
          ["memory", "The product lived in process memory."],
          ["network", "Every restart requires a load balancer."],
        ],
        correct: "memory",
      },
      tradeoff: {
        prompt: "What does an external database change?",
        options: [
          ["uptime", "The API can never be unavailable again."],
          [
            "persist",
            "Data survives the API process; cost and a new dependency increase.",
          ],
          ["fast", "Every request automatically becomes faster."],
        ],
        correct: "persist",
      },
    },
    focusKind: "relational-database",
    continueLabel: "Continue to 1K users",
    comparisonNote:
      "A database costs more and may add latency. At this stage, the reason to add it is durable data, not throughput.",
    defaultWorkload: stageWorkload(100),
    baseline: build({ data: "local-data" }),
    reference: build({ data: "relational-database" }),
    objectives: [
      ...tenUserObjectives,
      {
        id: "restart-durable",
        label: "Keep data after an API restart",
        evaluate: (_architecture, result) =>
          result.valid && result.incident === "restart" && result.durable,
      },
    ],
  },
  {
    id: "thousand-users",
    title: "Query efficiently",
    userCount: 1000,
    brief:
      "Each visit now loads a catalogue page, about 500 lookups per user per day. Find out why the database fails and fix the query path.",
    interviewerPrompt:
      "The database is rated for 1,000 RPS but fails at under 60. What is different about how it finds a row?",
    mission: {
      kicker: "MISSION 03 / QUERIES",
      headline: "Make every lookup cheap.",
      summary:
        "1,000 daily users, about 500 lookups each. The database starts failing well below its rated capacity.",
    },
    availableComponents: [
      "client",
      "api-server",
      "local-data",
      "relational-database",
    ],
    indexing: true,
    workloadOverrides: {
      requestsPerUserPerDay: 500,
      peakMultiplier: 10,
      monthlyBudgetUsd: 250,
    },
    incidents: [],
    questions: {
      diagnosis: {
        prompt:
          "Why does a database that handles about 1,000 RPS fail at under 60 RPS here?",
        options: [
          [
            "scan",
            "Without an index every lookup scans the whole table, so each query costs far more.",
          ],
          ["users", "1,000 users is more than any database can serve."],
          ["api", "The API server needs a second instance."],
        ],
        correct: "scan",
      },
      tradeoff: {
        prompt: "What does adding an index cost?",
        options: [
          [
            "write",
            "Faster reads, but extra storage and slower writes, because every write updates the index too.",
          ],
          ["free", "Nothing. An index is always free."],
          ["stale", "Reads can return stale data."],
        ],
        correct: "write",
      },
    },
    focusKind: "relational-database",
    continueLabel: "Continue to 10K users",
    comparisonNote:
      "The index costs nothing in dollars here, yet it turns a failing database into one with room to spare. Fix the query before you buy hardware.",
    defaultWorkload: stageThree,
    baseline: build({ data: "relational-database", indexed: false }),
    reference: build({ ...relational }),
    objectives: [
      ...scalingObjectives(250),
      {
        id: "indexed",
        label: "Add an index to the product table",
        evaluate: (architecture) => {
          const databases = architecture.nodes.filter(
            (node) => node.kind === "relational-database",
          );
          return (
            databases.length > 0 && databases.every((n) => n.indexed !== false)
          );
        },
      },
    ],
  },
  {
    id: "ten-thousand-users",
    title: "Distribute requests",
    userCount: 10_000,
    brief:
      "Traffic is about 580 RPS at peak. One API server is rated for 500, and if it dies, everything dies with it.",
    interviewerPrompt:
      "Which component saturates first, and what happens to users when that one server fails?",
    mission: {
      kicker: "MISSION 04 / DISTRIBUTION",
      headline: "One server is not enough.",
      summary:
        "10,000 daily users send about 580 requests per second at peak. Capacity is one problem; a single point of failure is the other.",
    },
    availableComponents: [
      "client",
      "load-balancer",
      "api-server",
      "local-data",
      "relational-database",
    ],
    indexing: true,
    workloadOverrides: {
      requestsPerUserPerDay: 500,
      peakMultiplier: 10,
      monthlyBudgetUsd: 400,
    },
    incidents: [
      {
        id: "node-failure",
        title: "Incident / API server failure",
        description:
          "One API server stops responding at peak traffic. Do users notice?",
        button: "Run server failure",
      },
    ],
    questions: {
      diagnosis: {
        prompt: "Which component saturates first at 580 peak RPS?",
        options: [
          ["api", "The single API server, which is rated for 500 RPS."],
          ["db", "The database, which is rated for 1,000 RPS."],
          ["client", "The client, because it sends too many requests."],
        ],
        correct: "api",
      },
      tradeoff: {
        prompt: "What must be true before you can run several API servers?",
        options: [
          [
            "stateless",
            "They must keep no private state, and a load balancer becomes a new component to run.",
          ],
          [
            "nothing",
            "Nothing. Servers can be added without any other change.",
          ],
          ["memory", "They must share the same process memory."],
        ],
        correct: "stateless",
      },
    },
    focusKind: "load-balancer",
    continueLabel: "Continue to 100K users",
    comparisonNote:
      "Two servers cover the peak, but only three survive losing one. Capacity and redundancy are separate requirements.",
    defaultWorkload: stageFour,
    baseline: build({ ...relational }),
    reference: tenThousandReference,
    objectives: [
      ...scalingObjectives(400),
      survives(
        "survives-server-failure",
        "Survive the loss of one API server",
        "node-failure",
      ),
    ],
  },
  {
    id: "hundred-thousand-users",
    title: "Offload reads",
    userCount: 100_000,
    brief:
      "Traffic is about 5,800 RPS at peak. More API servers will not help once every read lands on one database.",
    interviewerPrompt:
      "After you add API capacity, what becomes the next bottleneck, and how can reads avoid reaching it?",
    mission: {
      kicker: "MISSION 05 / READS",
      headline: "Stop asking the database twice.",
      summary:
        "100,000 daily users send about 5,800 requests per second at peak. Scaling the API alone moves the bottleneck to the database.",
    },
    availableComponents: [
      "client",
      "load-balancer",
      "api-server",
      "cache",
      "local-data",
      "relational-database",
      "read-replica",
    ],
    indexing: true,
    workloadOverrides: {
      requestsPerUserPerDay: 500,
      peakMultiplier: 10,
      monthlyBudgetUsd: 1000,
    },
    incidents: [],
    questions: {
      diagnosis: {
        prompt:
          "You scaled the API to carry 5,800 RPS. What limits the design now?",
        options: [
          [
            "db",
            "The primary database is rated for 1,000 RPS, and every read still reaches it.",
          ],
          ["lb", "The load balancer, which cannot route this many requests."],
          ["none", "Nothing. API servers scale without limit."],
        ],
        correct: "db",
      },
      tradeoff: {
        prompt: "What do you accept in return for adding a cache?",
        options: [
          [
            "stale",
            "Some reads can be stale until entries expire, and there is another system to operate.",
          ],
          ["free", "Nothing. A cache is always correct and always free."],
          ["lost", "Writes are lost when the cache restarts."],
        ],
        correct: "stale",
      },
    },
    focusKind: "cache",
    continueLabel: "Continue to 1M users",
    comparisonNote:
      "Five replicas also work, but cost far more than one cache. Absorbing repeated reads is cheaper than serving each of them again.",
    defaultWorkload: stageFive,
    baseline: tenThousandReference,
    reference: hundredThousandReference,
    objectives: scalingObjectives(1000),
  },
  {
    id: "million-users",
    title: "Handle the unexpected",
    userCount: 1_000_000,
    brief:
      "Traffic is about 11,600 RPS at peak. Bots are about to send three times that, and a server will fail at the worst moment.",
    interviewerPrompt:
      "What breaks first in a spike, and which protections cost real users the least?",
    mission: {
      kicker: "MISSION 06 / RESILIENCE",
      headline: "Survive the unexpected.",
      summary:
        "1,000,000 daily users and about 11,600 peak requests per second. A bot spike and a server failure are both coming.",
    },
    availableComponents: [
      "client",
      "rate-limiter",
      "load-balancer",
      "api-server",
      "cache",
      "local-data",
      "relational-database",
      "read-replica",
    ],
    indexing: true,
    workloadOverrides: {
      requestsPerUserPerDay: 100,
      peakMultiplier: 10,
      monthlyBudgetUsd: 1500,
    },
    incidents: [
      {
        id: "spike",
        title: "Incident / bot traffic spike",
        description:
          "Abusive clients add three times the normal peak. Can real users still get through?",
        button: "Run traffic spike",
      },
      {
        id: "node-failure",
        title: "Incident / API server failure",
        description: "One API server stops responding at peak traffic.",
        button: "Run server failure",
      },
    ],
    questions: {
      diagnosis: {
        prompt:
          "Bots send three times normal traffic. Why does a bigger server fleet not save you?",
        options: [
          [
            "shared",
            "Abusive and real requests compete for the same capacity; rejecting the abuse early protects real users.",
          ],
          ["more", "It does. You only need three times as many servers."],
          ["db", "The database fixes it by rejecting bad requests."],
        ],
        correct: "shared",
      },
      tradeoff: {
        prompt: "What do you accept in return for a rate limiter?",
        options: [
          [
            "fp",
            "A small share of real users may be rejected, and the limits need tuning.",
          ],
          ["free", "Nothing. It never rejects a real user."],
          ["slow", "Every request becomes slower than before."],
        ],
        correct: "fp",
      },
    },
    focusKind: "rate-limiter",
    continueLabel: "Complete the campaign",
    comparisonNote:
      "Choose the spike or server-failure scenario above. Without the limiter, the same fleet serves roughly a quarter of real users during the spike.",
    defaultWorkload: stageSix,
    baseline: hundredThousandReference,
    reference: build({
      limiter: true,
      lb: true,
      apis: 24,
      cache: true,
      replicas: 2,
      ...relational,
    }),
    objectives: [
      ...scalingObjectives(1500),
      survives(
        "survives-spike",
        "Keep serving real users during a bot spike",
        "spike",
      ),
      survives(
        "survives-server-failure",
        "Survive the loss of one API server",
        "node-failure",
      ),
    ],
    completion: {
      headline: "You designed for the requirement.",
      body: "You began with one server and local memory, and finished with an architecture that stays correct, fast and available at a million users.",
      summary: (peakRps, users) =>
        `For ${users.toLocaleString("en-US")} daily users I expect about ${peakRps} peak requests per second. A rate limiter rejects abusive traffic first. A load balancer spreads the rest across API servers sized so that one can fail. A cache answers most reads, and the database tier with read replicas handles what is left. Each layer was added only when a measured constraint required it, and each costs money, complexity and a new failure mode.`,
    },
  },
];
