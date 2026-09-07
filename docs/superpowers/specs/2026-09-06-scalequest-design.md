# ScaleQuest: System Design Interview Game

## 1. Product Summary

ScaleQuest is a browser-based learning game for working developers preparing for system design interviews. The learner starts with a deliberately simple API, increases its workload from 10 users to 1 million users, observes failures, changes the architecture, and explains the resulting trade-offs.

The first campaign is **Scale a Read API from 10 to 1 Million Users**. It teaches system design as an evolving response to measurable constraints instead of presenting a finished architecture diagram.

The application uses deterministic simulations. It does not provision a database, cache, queue, or cloud server for each learner. This keeps operating costs predictable and makes every result explainable and reproducible.

Working title: **ScaleQuest**. The name can change without affecting the product model.

## 2. Audience and Learning Outcome

The primary learner is a working developer who understands APIs and databases but does not yet have a structured system design method.

After completing the first campaign, the learner should be able to:

- clarify functional and non-functional requirements;
- convert user counts into workload estimates;
- identify the active bottleneck in an architecture;
- introduce scaling components only when justified;
- compare latency, availability, consistency, cost, and complexity;
- explain a design using an interview-ready narrative;
- recognize premature or irrelevant optimizations.

## 3. Product Principles

1. **Failure before solution:** A component is introduced only after the learner can observe the problem it addresses.
2. **Explain every number:** Metrics and scores expose their inputs and calculation path.
3. **Multiple valid designs:** The game evaluates constraints and trade-offs, not one exact diagram.
4. **No magic components:** Adding Redis, a queue, or replicas can create new costs and failure modes.
5. **Learning over cloud fidelity:** The model is realistic enough to teach reasoning but does not claim to predict a specific provider's production performance.
6. **Low operating cost:** Core simulation runs in the browser and requires no per-session infrastructure.
7. **Interview transfer:** Each stage ends with language the learner can reuse in a real interview.

## 4. MVP Scope

### Included

- One guided campaign: Scale a Read API.
- Traffic stages from 10 users to 1 million users.
- Requirements and capacity-estimation exercises.
- Interactive architecture canvas with stage-aware components.
- Deterministic load simulation and bottleneck detection.
- Baseline, current, and recommended architecture comparison.
- Golden Circle explanations for each decision.
- Rule-based interviewer prompts and scoring.
- Incident feed, progress, unlocks, and stage completion.
- Local browser persistence and progress reset.
- Desktop-first responsive UI.

### Excluded from the MVP

- Generative AI or an AI interviewer.
- Real Docker, Redis, Kafka, database, or cloud deployments.
- Authentication, teams, leaderboards, and multiplayer.
- Real-time cloud pricing or provider-specific guarantees.
- User-authored challenges or a public challenge marketplace.
- A fully open sandbox before the guided campaign is complete.
- Mobile architecture editing; small screens may provide a guided/read-only view.

## 5. First Campaign

The campaign uses a fictional product catalogue read API so the learner can focus on scaling a familiar request path.

Example contract:

```http
GET /api/products/:id
```

Example response:

```json
{
  "id": "prod_123",
  "name": "Noise Cancelling Headphones",
  "price": 19999,
  "currency": "INR",
  "available": true
}
```

### Campaign stages

| Stage | Workload | Primary lesson | Expected pressure |
| --- | ---: | --- | --- |
| 0 | Interview brief | Requirements and estimates | Ambiguous requirements |
| 1 | 10 users | Simplest viable architecture | Avoid premature optimization |
| 2 | 100 users | Durable persistence | In-memory data loss and restart |
| 3 | 1,000 users | Indexes and connection limits | Database latency and connection exhaustion |
| 4 | 10,000 users | Horizontal API scaling | Single-server throughput and availability |
| 5 | 100,000 users | Caching and read scaling | Database read saturation and hot keys |
| 6 | 1 million users | Resilience and traffic control | Peak traffic, failure domains, abuse, and visibility |

The campaign does not force every common component into the read path. For example, a queue is normally the wrong answer for a synchronous product lookup. The game should explicitly reward recognizing this. Queues become central in a later write-heavy notification or flash-sale campaign.

## 6. Core Gameplay Loop

1. The interviewer presents a short brief.
2. The learner selects or enters assumptions.
3. The learner estimates traffic, storage, and availability needs.
4. The learner constructs the simplest architecture for the current stage.
5. The learner increases traffic or runs the supplied incident.
6. The simulator reports metrics and identifies observable symptoms.
7. The learner diagnoses the bottleneck and modifies the design.
8. The learner selects the reason and trade-off behind the decision.
9. The system scores the result and displays the Golden Circle explanation.
10. The next workload stage unlocks.

The learner can retry a stage without penalty. Learning mode has no timer. A timed interview mode can be added after the core campaign is stable.

## 7. Main Game Screen

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ ScaleQuest │ Campaign │ Stage/Users │ Budget │ System Health │ Score   │
├────────────┬──────────────────────────────────────┬─────────────────────┤
│ Component  │                                      │ Interviewer         │
│ palette    │         Architecture canvas          │                     │
│            │                                      │ Prompt / assumptions│
│ API        │   Client → Load Balancer → API       │ Decision history    │
│ Database   │                         ↓            │                     │
│ Cache      │                      Database        │ Why / How / What    │
│ Replica    │                                      │ Trade-offs          │
│ Rate limit │                                      │ When not to use     │
├────────────┴──────────────────────────────────────┴─────────────────────┤
│ Run │ Traffic │ p95 │ Throughput │ Errors │ Availability │ Cost │ Logs │
└─────────────────────────────────────────────────────────────────────────┘
```

### Major UI areas

- **Top bar:** campaign progress, current scale, budget, health, and score.
- **Component palette:** only currently learnable components are enabled; locked components explain when they become useful.
- **Architecture canvas:** nodes, connections, configuration, bottleneck highlights, and request animation.
- **Interviewer panel:** requirements, follow-up prompts, assumption log, and decision defense.
- **Golden Circle panel:** contextual explanation of the selected problem or component.
- **Simulation console:** workload controls, metrics, calculation details, incidents, and run history.
- **Comparison drawer:** Baseline vs Current vs Recommended with metric and topology differences.

## 8. Golden Circle Learning Model

Every meaningful architecture decision has the following explanation:

- **Why:** The measurable bottleneck or requirement that justifies the change.
- **How:** The mechanism by which the component changes request or data flow.
- **What:** The concrete architecture change, configuration, API behavior, or schema involved.
- **Trade-offs:** Cost, complexity, consistency, availability, and operational consequences.
- **When not to use:** Conditions under which the change would be premature or incorrect.

Example for caching:

```text
Why
Database reads are saturated and the catalogue is read-heavy.

How
Frequently requested products are served from faster temporary storage,
reducing database work.

What
Add cache-aside lookup between the API service and database, with a TTL
and explicit invalidation when product data changes.

Trade-offs
Stale reads, invalidation complexity, memory cost, hot keys, and cache stampede.

When not to use
At 10 users, when database latency is already within the target and the added
complexity does not solve an active constraint.
```

## 9. Simulation Model

### Inputs

- active users;
- requests per user per day;
- peak traffic multiplier;
- read/write ratio;
- payload size;
- latency objective;
- availability objective;
- monthly budget.

The UI shows the conversion from product assumptions to requests per second:

```text
average RPS = active users × requests per user per day ÷ 86,400
peak RPS = average RPS × peak multiplier
```

### Architecture representation

The architecture is a directed graph:

```ts
type Architecture = {
  nodes: ComponentInstance[];
  edges: Connection[];
};
```

Each component definition contains capabilities, capacity, base latency, cost, configuration bounds, accepted incoming connections, outgoing connection types, and failure behavior. Campaign content and simulation behavior remain separate: campaign stages reference reusable component definitions and rules.

### Simulation pipeline

1. Validate graph structure and required request path.
2. Convert workload assumptions into peak RPS and data volume.
3. Route workload through connected components.
4. Apply component capacity, hit-rate, replication, and failure rules.
5. Identify the first saturated or invalid boundary.
6. Calculate latency, throughput, error rate, availability, cost, and complexity.
7. Evaluate stage objectives and misconceptions.
8. Return metrics plus an inspectable explanation trace.

The simulator is deterministic: the same architecture, configuration, workload, and incident always produce the same result.

### Educational metrics

- **Throughput:** successfully processed requests per second.
- **p95 latency:** base path latency plus saturation penalties.
- **Error rate:** rejected, timed-out, or failed requests divided by offered requests.
- **Availability:** estimated request success under configured failure scenarios.
- **Monthly cost:** sum of component preset costs at the chosen scale.
- **Complexity:** weighted operational burden of components and connections.
- **Consistency risk:** qualitative level with an explicit cause.

Cost values are labelled as educational estimates and versioned with the component catalogue. They are not live provider quotes.

## 10. Component Catalogue for the First Campaign

- Client
- CDN
- DNS
- Rate limiter
- Load balancer
- API server
- In-memory/local data
- Relational database
- Database index
- Connection pool
- Read replica
- Cache
- Health check
- Metrics/logging

Queue, worker, object storage, search index, partitioning, and multi-region components may appear as locked previews. They are implemented when a campaign requires their behavior.

Each component has a details card containing Golden Circle content, configuration controls, supported connections, common failure modes, and interview follow-up questions.

## 11. Rule-Based Interviewer and Scoring

The interviewer is a finite-state campaign engine, not a chatbot. It advances when stage conditions are met and selects prompts from authored rules.

Example rules:

```text
If learner adds cache before database saturation:
  Ask: "Which current requirement justifies the cache?"
  Apply premature-optimization feedback.

If learner adds multiple API servers without a load balancer:
  Ask: "How does traffic reach each instance?"
  Keep routing objective incomplete.

If learner adds a queue to the synchronous read path:
  Ask: "Can the client wait for asynchronous processing here?"
  Explain why a queue does not solve this request.
```

### Score categories

| Category | Weight |
| --- | ---: |
| Requirements and assumptions | 20 |
| Capacity estimation | 15 |
| Bottleneck diagnosis | 20 |
| Architecture correctness | 20 |
| Trade-off reasoning | 15 |
| Cost and complexity discipline | 10 |

The learner receives category-level evidence, missed considerations, and a model interview explanation. There is no global leaderboard in the MVP.

## 12. Comparison Model

At each stage the learner can compare:

- **Baseline:** architecture at the beginning of the stage;
- **Current:** learner's current design;
- **Recommended:** one educational reference solution, clearly labelled as non-unique.

The comparison includes nodes added or removed, changed request flow, metric deltas, monthly cost delta, new failure modes, and the reason each change became justified.

An intentionally over-engineered example may be shown after stage completion to demonstrate that more components do not automatically produce a better design.

## 13. Technical Architecture

### MVP stack

- React and TypeScript for the application.
- Vite for local development and static production builds.
- `@xyflow/react` for the interactive node-and-edge canvas; this is the only specialized UI dependency justified by the MVP.
- Plain CSS with design tokens and component-scoped class naming.
- React context plus reducers for campaign and simulation state; no external state library initially.
- Versioned TypeScript/JSON content definitions for campaigns, components, prompts, and explanations.
- Browser `localStorage` for progress and settings.

The production build is a static site. No backend is required for the MVP. This allows inexpensive hosting on a static platform and prevents per-learner simulation infrastructure costs.

### Module boundaries

```text
src/
  app/                 routing and application shell
  game/                campaign state machine and progression
  simulator/           graph validation, workload model, metrics, rules
  canvas/              architecture editing and visualization
  content/             component catalogue and first campaign definitions
  learning/            Golden Circle and concept explanations
  scoring/             deterministic evaluation and feedback
  persistence/         versioned local progress
  ui/                  shared presentational components
```

The simulator has no React dependency. It accepts serializable input and returns serializable results. This keeps learning rules independently understandable and makes a future server or CLI reuse possible without adding that infrastructure now.

### State flow

```text
Campaign content
      ↓
Game state ← architecture edits / learner answers
      ↓
Pure simulation engine
      ↓
Simulation result + explanation trace
      ↓
Metrics UI + interviewer rules + scoring
      ↓
Versioned local progress
```

## 14. Persistence and Versioning

Local progress stores:

- schema version;
- campaign and stage identifiers;
- completed objectives;
- current architecture and configuration;
- best category scores;
- unlocked concepts;
- user display preferences.

On invalid or incompatible saved data, the application keeps a recoverable backup, resets only the affected campaign state, and explains what happened. The user can export or reset progress in a later increment if needed; it is not required for the first playable slice.

## 15. Failure and Edge-Case Handling

- Disconnected request paths are rejected with a highlighted missing connection.
- Unsupported component connections are prevented in the canvas.
- Graph cycles that do not represent a supported pattern return a specific validation error.
- Invalid numeric configuration is clamped or rejected with an inline explanation.
- A saturated system still returns partial metrics and the first causal bottleneck.
- Corrupt local storage does not prevent the application from loading.
- Missing content identifiers render a safe fallback and preserve progress data.
- The recommended solution is never used as a hidden exact-match requirement.

## 16. Visual Direction and Accessibility

The visual language is a technical command centre rather than a children's game: dark neutral canvas, high-contrast metric states, restrained motion, and clear architecture icons. Gamification comes from missions, incidents, health, score, and unlocks rather than decorative badges everywhere.

Requirements:

- keyboard-accessible controls outside the freeform canvas;
- text alternatives and a list representation of the architecture;
- color is not the only signal for healthy, warning, and critical states;
- reduced-motion support;
- readable explanations and metrics at common laptop widths;
- desktop editing optimized for 1280px and wider.

## 17. Validation Strategy

Per project instructions, the initial implementation will not add test files unless explicitly requested. Validation will use:

- TypeScript type checking;
- linting;
- production build;
- deterministic manual scenarios for each campaign stage;
- manual verification of progress restore and corrupt-state recovery;
- keyboard and reduced-motion checks;
- comparison of displayed metrics with the visible calculation trace.

When automated tests are later authorized, the pure simulator and scoring modules are the highest-value first targets.

## 18. Delivery Slices

1. **Foundation:** application shell, design system, campaign map, and authored content for the first campaign.
2. **Playable vertical slice:** stages 0-2, architecture canvas, simulation run, Golden Circle panel, and local progress.
3. **Scale progression:** stages 3-6, additional components, incidents, comparisons, and scoring.
4. **Learning polish:** calculation inspector, model interview answer, accessibility, responsive behavior, and onboarding.
5. **Future campaigns:** flash-sale inventory, URL shortener, notifications, chat, feed, and file storage.

The first implementation plan should target the playable vertical slice, not all future campaigns at once.

## 19. Acceptance Criteria for the First Playable Slice

- A learner can open the app without creating an account.
- The learner can start the Scale a Read API campaign.
- The learner can complete requirements and capacity-estimation prompts.
- The learner can connect the components available in stages 1 and 2.
- Running the same architecture and workload produces the same result.
- The UI identifies a bottleneck and shows its calculation trace.
- Adding a justified component changes metrics, cost, and complexity.
- The Golden Circle panel explains the active decision.
- The learner receives rule-based feedback and a category score.
- Refreshing the page restores valid local progress.
- The production build works as a static site without a backend.

## 20. Future Expansion Boundaries

Future campaigns reuse the simulator interface but may add domain-specific rules. The flash-sale campaign will introduce atomic inventory reservation, idempotency, queues, workers, payment reconciliation, and overselling incidents. These concepts should not complicate the first read-API slice prematurely.

Authentication, cloud-synced progress, collaborative interviews, user-authored content, and AI coaching remain optional independent subsystems. Each requires its own design before implementation.
