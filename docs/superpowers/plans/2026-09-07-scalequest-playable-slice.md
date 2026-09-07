# ScaleQuest First Playable Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a polished static React app where a working developer completes requirements and capacity estimates, constructs 10-user and 100-user read-API architectures, runs deterministic simulations, learns through Golden Circle explanations, receives rule-based feedback, and resumes local progress.

**Architecture:** Authored campaign content, pure simulation logic, campaign state, persistence, and React presentation stay separate. The learner edits a directed graph through @xyflow/react; a deterministic TypeScript engine returns validation, metrics, bottlenecks, explanation traces, and objective results. No backend or per-user infrastructure is required.

**Tech Stack:** React, TypeScript, Vite, @xyflow/react, plain CSS, browser localStorage, ESLint.

**Spec:** docs/superpowers/specs/2026-09-06-scalequest-design.md

## Global Constraints

- Core simulation runs in the browser and is deterministic.
- Build only stages 0-2 of the first campaign.
- Do not add authentication, AI, cloud services, a backend, multiplayer, or live provider pricing.
- @xyflow/react is the only specialized UI dependency; state uses React context and reducers.
- Use plain CSS with tokens and focused component classes.
- Cost and performance numbers are visible educational estimates.
- Multiple valid architectures are allowed; reference diagrams are never exact-match requirements.
- Do not create or modify test files unless the user explicitly authorizes tests.
- Validate with lint, typecheck, build, and documented manual scenarios.
- Optimize architecture editing for desktop widths of 1280px and above.

---

## Planned File Map

~~~text
package.json                         scripts and dependencies
src/
  main.tsx                           React entry
  app/App.tsx                        providers and view selection
  app/AppShell.tsx                   global shell and responsive guard
  app/app.css                        tokens and application layout
  domain/systemDesign.ts             shared serializable types
  content/components.ts              reusable component definitions
  content/readApiCampaign.ts         stages 0-2 and reference designs
  simulator/calculateWorkload.ts     assumptions-to-RPS conversion
  simulator/validateArchitecture.ts  graph validation
  simulator/simulate.ts              pure metrics pipeline
  simulator/explainResult.ts         causal trace generation
  game/gameReducer.ts                campaign transitions
  game/GameProvider.tsx              state and commands
  persistence/progressStorage.ts     versioned local progress
  canvas/ArchitectureCanvas.tsx      node-and-edge editor
  canvas/SystemNode.tsx              accessible component node
  canvas/ComponentPalette.tsx        stage-aware palette
  campaign/CampaignIntro.tsx         brief and estimates
  campaign/GameWorkspace.tsx         integrated game screen
  interview/InterviewerPanel.tsx     deterministic prompts
  learning/GoldenCirclePanel.tsx     Why/How/What teaching
  metrics/MetricsStrip.tsx           metric summary
  metrics/SimulationConsole.tsx      workload, run, trace, incidents
  comparison/ComparisonDrawer.tsx    baseline/current/reference
  scoring/calculateStageScore.ts     evidence-based scoring
  ui/Button.tsx                      shared button
  ui/Panel.tsx                       shared panel
  ui/StatusBadge.tsx                 accessible health status
docs/manual-validation.md            repeatable manual checks
~~~

## Shared Domain Contract

Create these once in src/domain/systemDesign.ts and import them everywhere.

~~~ts
export type ComponentKind =
  | 'client'
  | 'api-server'
  | 'local-data'
  | 'relational-database';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

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

export interface ValidationIssue {
  code: 'missing-client' | 'missing-api' | 'missing-data' | 'disconnected-path' | 'invalid-connection' | 'unsupported-cycle';
  message: string;
  nodeIds: string[];
}

export interface MetricResult {
  value: number;
  unit: 'rps' | 'ms' | 'percent' | 'usd' | 'points';
  status: HealthStatus;
  explanation: string;
}

export interface Bottleneck {
  componentId: string;
  severity: 'warning' | 'critical';
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
  availability: MetricResult;
  monthlyCost: MetricResult;
  complexity: MetricResult;
  bottlenecks: Bottleneck[];
  trace: string[];
}

export interface StageObjective {
  id: string;
  label: string;
  evaluate: (architecture: Architecture, result: SimulationResult) => boolean;
}

export interface CampaignStage {
  id: 'requirements' | 'ten-users' | 'hundred-users';
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
~~~

### Task 1: Scaffold the Static App and Visual Shell

**Files:**
- Create package/Vite/TypeScript/ESLint configuration and index.html.
- Create src/main.tsx, src/app/App.tsx, src/app/AppShell.tsx, src/app/app.css.
- Create src/ui/Button.tsx, Panel.tsx, StatusBadge.tsx.

**Produces:** AppShell, Button, Panel, and StatusBadge.

- [ ] **Step 1: Scaffold and install**

~~~bash
npm create vite@latest . -- --template react-ts
npm install
npm install @xyflow/react
~~~

Preserve the committed docs directory if the scaffold warns that the directory is non-empty.

- [ ] **Step 2: Set validation scripts**

~~~json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "typecheck": "tsc -b --pretty false",
  "preview": "vite preview"
}
~~~

- [ ] **Step 3: Define tokens and shell**

~~~css
:root {
  color-scheme: dark;
  --sq-bg: #080b11;
  --sq-surface: #10151f;
  --sq-raised: #171e2b;
  --sq-border: #293244;
  --sq-text: #f4f7fb;
  --sq-muted: #98a3b6;
  --sq-accent: #7c9cff;
  --sq-healthy: #48d597;
  --sq-warning: #f2bd55;
  --sq-critical: #ff6b76;
  --sq-focus: #a9bbff;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
~~~

Create top status, left palette, centre canvas, right learning, and bottom simulation regions. Below 900px replace editing with a large-screen requirement message while keeping learning content available.

- [ ] **Step 4: Create UI primitives**

~~~ts
export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
}): React.ReactElement;

export function Panel(props: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement;

export function StatusBadge(props: {
  status: HealthStatus;
  label: string;
}): React.ReactElement;
~~~

StatusBadge renders text and a shape/icon as well as color.

- [ ] **Step 5: Validate and commit**

~~~bash
npm run typecheck
npm run lint
npm run build
git add package.json package-lock.json index.html vite.config.ts tsconfig*.json eslint.config.js src
git commit -m "feat: scaffold ScaleQuest application shell"
~~~

Expected: commands exit 0, dist/index.html exists, 1440px shell is usable, and the below-900px notice appears.

### Task 2: Add Domain Types and Campaign Content

**Files:**
- Create src/domain/systemDesign.ts.
- Create src/content/components.ts.
- Create src/content/readApiCampaign.ts.

**Produces:** shared types, componentDefinitions, readApiStages.

- [ ] **Step 1: Add the shared contract**

Copy Shared Domain Contract into systemDesign.ts. Persist objective IDs, never evaluator functions.

- [ ] **Step 2: Author component presets**

~~~ts
export const componentDefinitions: Record<ComponentKind, ComponentDefinition>;
~~~

| Kind | Capacity | Latency | Monthly cost | Complexity |
| --- | ---: | ---: | ---: | ---: |
| client | unlimited | 20 ms | $0 | 0 |
| api-server | 500 RPS | 30 ms | $40 | 2 |
| local-data | 500 RPS | 2 ms | $0 | 1 |
| relational-database | 1,000 RPS | 12 ms | $80 | 3 |

Represent the client's unlimited capacity as `Number.MAX_SAFE_INTEGER` and exclude client nodes from bottleneck selection.

Allow client to API, API to local data, and API to relational database. Every component gets full Golden Circle and failure-mode copy.

- [ ] **Step 3: Author stages 0-2**

~~~ts
const baseWorkload = {
  requestsPerUserPerDay: 100,
  peakMultiplier: 10,
  readRatio: 1,
  payloadKb: 2,
  targetP95Ms: 200,
  targetAvailabilityPercent: 99,
  monthlyBudgetUsd: 150,
};
~~~

Requirements collects assumptions; ten-users rewards the simplest connected path; hundred-users introduces API restart/data loss and requires durable relational storage. Reference graphs are comparison data only.

- [ ] **Step 4: Validate and commit**

~~~bash
npm run typecheck
npm run lint
git add src/domain src/content
git commit -m "feat: add ScaleQuest campaign content model"
~~~

### Task 3: Implement the Deterministic Simulator

**Files:**
- Create src/simulator/calculateWorkload.ts.
- Create src/simulator/validateArchitecture.ts.
- Create src/simulator/explainResult.ts.
- Create src/simulator/simulate.ts.

**Produces:** calculateWorkload, validateArchitecture, simulateArchitecture.

- [ ] **Step 1: Implement workload math**

~~~text
averageRps = activeUsers * requestsPerUserPerDay / 86400
peakRps = averageRps * peakMultiplier
peakReadRps = peakRps * readRatio
monthlyTransferGb = averageRps * 2592000 * payloadKb / 1000000
~~~

Keep full precision internally, round UI values to two decimals, and return formula strings with inputs.

- [ ] **Step 2: Validate the graph**

Check clients, API, data, node IDs, connection compatibility, a client-to-API-to-data path, and directed cycles. Return all issues in stable code order; learner mistakes never throw.

- [ ] **Step 3: Implement metrics**

~~~text
pathCapacity = minimum processing-node capacity on a valid path
throughput = min(peakRps, pathCapacity)
overloadRatio = max(0, peakRps - pathCapacity) / peakRps
errorRate = overloadRatio * 100
baseLatency = sum of path node latencies
saturation = peakRps / pathCapacity
latencyMultiplier = saturation <= 0.7 ? 1 : 1 + ((saturation - 0.7) * 4)
p95Latency = baseLatency * latencyMultiplier
availability = clamp(99 - errorRate, 0, 100)
monthlyCost = sum of instantiated component costs
complexity = sum of component complexity + edgeCount * 0.25
~~~

Invalid graphs return valid false, issues, zero throughput, critical health, and a validation trace.

- [ ] **Step 4: Add causal trace**

Order: workload conversion, path, capacity, saturation, latency, errors, availability, cost, first bottleneck. Name actual components and values.

- [ ] **Step 5: Run browser probes**

Temporarily call the engine from App.tsx. Verify same input twice gives identical JSON, missing edge returns an issue without exception, and valid 10/100-user designs stay within budget. Remove the temporary call.

- [ ] **Step 6: Validate and commit**

~~~bash
npm run typecheck
npm run lint
npm run build
git add src/simulator
git commit -m "feat: add deterministic architecture simulator"
~~~

### Task 4: Add Campaign State and Local Progress

**Files:**
- Create src/game/gameReducer.ts, src/game/GameProvider.tsx.
- Create src/persistence/progressStorage.ts.
- Modify src/app/App.tsx.

**Produces:** GameProvider, useGame, loadProgress, saveProgress, resetProgress.

- [ ] **Step 1: Define state**

~~~ts
export interface GameState {
  schemaVersion: 1;
  campaignId: 'scale-read-api';
  stageIndex: number;
  completedStageIds: string[];
  architecture: Architecture;
  workload: WorkloadInput;
  lastResult: SimulationResult | null;
  selectedLearningKind: ComponentKind | null;
  scoreByStage: Record<string, number>;
  progressNotice: string | null;
}
~~~

Actions set architecture/workload, show learning, store result, complete/reset stage, and dismiss notice. Clamp stages and block progression until objectives pass.

- [ ] **Step 2: Implement recoverable storage**

Use keys scalequest.progress.v1 and scalequest.progress.recovery. Parse in try/catch, verify schema and shapes, copy invalid raw data to recovery, use initial state, and show a dismissible notice.

- [ ] **Step 3: Expose commands**

~~~ts
export interface GameContextValue {
  state: GameState;
  stage: CampaignStage;
  dispatch: React.Dispatch<GameAction>;
  runSimulation: () => SimulationResult;
  canCompleteStage: boolean;
  completeStage: () => void;
  resetCampaign: () => void;
}
~~~

- [ ] **Step 4: Validate and commit**

Change state and refresh to verify restore. Corrupt the progress key in DevTools and verify safe recovery.

~~~bash
npm run typecheck
npm run lint
npm run build
git add src/game src/persistence src/app/App.tsx
git commit -m "feat: persist guided campaign progress"
~~~

### Task 5: Build the Architecture Canvas

**Files:**
- Create src/canvas/ArchitectureCanvas.tsx, SystemNode.tsx, ComponentPalette.tsx.
- Modify src/app/app.css.

**Produces:** editable ArchitectureCanvas and stage-aware ComponentPalette.

- [ ] **Step 1: Build custom nodes**

~~~ts
export interface SystemNodeData extends Record<string, unknown> {
  label: string;
  kind: ComponentKind;
  capacityLabel: string;
  status: HealthStatus;
  onLearn: (kind: ComponentKind) => void;
}
~~~

Show label, kind, capacity, status text/icon, handles, and Learn action.

- [ ] **Step 2: Build the palette**

Show all MVP cards, enable stage.availableComponents, explain locks, add nodes at deterministic offsets, and prevent duplicate client/local-data nodes in stages 1-2.

- [ ] **Step 3: Wire React Flow**

Use ReactFlow, Background, and Controls. Convert domain data only at this boundary. Validate compatibility before dispatching connections and explain invalid drops inline.

- [ ] **Step 4: Add evidence and accessibility**

Highlight issue/bottleneck nodes with text/icon plus color. Add a collapsible list of components and outgoing connections.

- [ ] **Step 5: Validate and commit**

Verify locked database, valid/reverse connections, persisted positions, edge deletion, and disconnected feedback.

~~~bash
npm run typecheck
npm run lint
npm run build
git add src/canvas src/app/app.css
git commit -m "feat: add interactive architecture canvas"
~~~

### Task 6: Add Interview and Golden Circle Learning

**Files:**
- Create src/campaign/CampaignIntro.tsx.
- Create src/interview/InterviewerPanel.tsx.
- Create src/learning/GoldenCirclePanel.tsx.
- Modify src/app/app.css.

**Produces:** stage-zero exercise, deterministic prompts, Golden Circle panel.

- [ ] **Step 1: Build brief and estimation**

Present GET /api/products/:id, response example, assumption controls, and visible average/peak RPS math before completion.

- [ ] **Step 2: Select prompts deterministically**

Use first match: invalid graph, bottleneck, over budget, objectives met, authored prompt. Show assumptions and decision history without free-text evaluation.

- [ ] **Step 3: Render Golden Circle**

Render Why, How, What, Trade-offs, and When not to use from components.ts. With no selection, explain the first bottleneck or next objective.

- [ ] **Step 4: Add completion feedback**

Show objectives, missed considerations, category score, and a deterministic model answer covering assumptions, scale, path, constraint, decision, and trade-off.

- [ ] **Step 5: Validate and commit**

~~~bash
npm run typecheck
npm run lint
npm run build
git add src/campaign src/interview src/learning src/app/app.css
git commit -m "feat: add guided interview learning panels"
~~~

### Task 7: Add Metrics, Scoring, and Comparison

**Files:**
- Create src/metrics/MetricsStrip.tsx, SimulationConsole.tsx.
- Create src/comparison/ComparisonDrawer.tsx.
- Create src/scoring/calculateStageScore.ts.
- Modify src/app/app.css.

**Produces:** metrics UI, calculation trace, comparison, calculateStageScore.

- [ ] **Step 1: Add evidence-based scoring**

~~~ts
export interface StageScore {
  total: number;
  categories: {
    requirements: number;
    estimation: number;
    diagnosis: number;
    architecture: number;
    tradeoffs: number;
    costDiscipline: number;
  };
  evidence: string[];
  missed: string[];
}
~~~

Use weights 20/15/20/20/15/10 and explicit predicates for assumptions, estimate, diagnosis, valid path, objectives, budget, and unnecessary components.

- [ ] **Step 2: Render metrics and controls**

Show throughput, p95, error rate, availability, cost, and complexity with value, unit, status word/icon, and explanation. Before Run, show Not simulated. Allow workload presets and numeric edits.

- [ ] **Step 3: Render evidence**

Show incident and expandable trace. Keep Run enabled for graph errors so the simulator can teach them.

- [ ] **Step 4: Add comparison**

Compare component/connection summaries, cost, complexity, and failure modes. Label Recommended as one valid reference, never the only correct design. Never replace the learner graph.

- [ ] **Step 5: Validate and commit**

Manually calculate one workload/cost from visible values, compare with UI, and rerun to confirm determinism.

~~~bash
npm run typecheck
npm run lint
npm run build
git add src/metrics src/comparison src/scoring src/app/app.css
git commit -m "feat: add simulation feedback and scoring"
~~~

### Task 8: Integrate and Document the Playable Slice

**Files:**
- Create src/campaign/GameWorkspace.tsx.
- Create docs/manual-validation.md.
- Modify src/app/App.tsx, src/app/AppShell.tsx, src/app/app.css, README.md.

**Produces:** complete stages 0-2 flow and contributor documentation.

- [ ] **Step 1: Compose the workspace**

Top: stage/users/budget/health/score. Left: palette. Centre: canvas. Right: interviewer and Golden Circle. Bottom: controls, metrics, incident, trace. Drawer: comparison. Stage 0 uses the intro before canvas.

- [ ] **Step 2: Add restrained feedback**

Animate the request path after Run, respect prefers-reduced-motion, and keep incidents concise. Do not add loot, streak pressure, or leaderboards.

- [ ] **Step 3: Add reset and recovery UI**

Provide a two-step campaign reset and dismissible recovery notice.

- [ ] **Step 4: Document the project**

README explains purpose, browser-only design, stage coverage, commands, module map, presets, estimate disclaimer, and links to the spec and manual checklist. Manual validation includes every probe named above.

- [ ] **Step 5: Run final acceptance**

~~~bash
npm run typecheck
npm run lint
npm run build
npm run dev
~~~

Verify:

~~~text
app opens without account or backend
requirements exercise exposes RPS math
10-user stage supports the simplest valid path
100-user incident explains durable storage
invalid graph reports issues without crashing
same run returns identical metrics
all Golden Circle sections are available
rule-based feedback includes evidence
refresh restores valid progress
corrupt progress recovers safely
desktop and reduced-motion behavior are usable
~~~

- [ ] **Step 6: Commit integration**

~~~bash
git add src README.md docs/manual-validation.md
git commit -m "feat: deliver ScaleQuest playable campaign"
~~~
