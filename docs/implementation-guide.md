# What we built, and how to understand it

## The learning journey

This delivery is a small complete chapter. It starts with an ordinary catalogue lookup:

```http
GET /api/products/:id
```

You assume 10 daily active users, 100 lookups per user per day and a peak factor of 10.

```text
Average RPS = 10 × 100 / 86,400 = 0.01157
Peak RPS = 0.01157 × 10 = 0.11574
```

This is why user count alone cannot tell you whether Redis or more servers are needed. The first useful action is to translate product activity into demand.

The first canvas starts with Client → API. You add Local data and connect it. That gives the browser a complete request path to model. A disconnected graph produces a visible validation message rather than a made-up result.

In the second mission there are 100 daily users, but throughput is still modest: 1.1574 peak RPS. The reason to add a database is a **new durability requirement**. After an API restart, the old in-memory catalogue is gone. An external database retains committed product rows.

This is the Golden Circle in practice:

- **Why:** preserve data when the API process restarts.
- **How:** store data in a separately managed durable system.
- **What:** replace API → Local data with API → Relational database.
- **Trade-off:** monthly component cost rises from $40 to $120, a network dependency is added, and base modeled latency increases from 52 ms to 62 ms.
- **When not to use:** a disposable experiment without a durability requirement can begin with local data.

## What each UI region does

| Region               | Implementation                  | Purpose                                                               |
| -------------------- | ------------------------------- | --------------------------------------------------------------------- |
| Campaign progression | app/App.tsx                     | Shows playable stages and future milestones honestly                  |
| Brief                | campaign/CampaignIntro.tsx      | Collects assumptions and checks the learner's RPS estimate            |
| Component palette    | canvas/ComponentPalette.tsx     | Adds stage-allowed nodes; explains locked components                  |
| Graph editor         | canvas/ArchitectureCanvas.tsx   | Moves/removes nodes, connects/deletes edges, offers keyboard fallback |
| Interview guide      | interview/InterviewerPanel.tsx  | Presents diagnosis and trade-off choices                              |
| Golden Circle        | learning/GoldenCirclePanel.tsx  | Explains internal behavior, schema/pseudocode and limitations         |
| Traffic/results      | metrics/                        | Runs deterministic simulations and exposes the calculation trace      |
| Comparison           | comparison/ComparisonDrawer.tsx | Uses one workload and incident for all three designs                  |
| Completion           | campaign/GameWorkspace.tsx      | Gives an interview summary and makes the next scope visible           |

The generated visual reference guided the dark palette, diagram layout and periwinkle accent. Generated references are not product code: the real UI is accessible HTML and React Flow nodes. The reference image's invented AI/avatar elements were omitted because the approved product has no AI or account.

## The data flow

```text
Authored component and stage definitions
              ↓
Learner actions → reducer state → local progress
              ↓
Graph + workload + selected incident
              ↓
Pure simulateArchitecture()
              ↓
Validation + metrics + causal trace
              ↓
Objectives + explicit answers → score → progression
```

React does not live inside the simulator. A result can be reproduced from the same serialized inputs. React Flow positions do not affect performance calculations.

Architecture edits and workload edits invalidate the last run. This prevents a learner from passing a new design using the result of an older one. Moving nodes preserves the result because the system's meaning has not changed.

## The simulation, without magic

The component catalogue supplies capacities, illustrative latency, cost and complexity. The graph validator checks identifiers, compatible edges, missing nodes, disconnected components and ambiguous paths. This chapter accepts one complete Client → API → Data path.

For a valid path:

```text
Capacity = minimum processing capacity along the path
Throughput = min(offered peak RPS, capacity)
Errors = max(0, offered - capacity) / offered × 100
Scenario success = 100 - errors
Base latency = sum of node latency presets
Saturation = offered / capacity

Latency multiplier =
  1                                when saturation ≤ 0.7
  1 + (saturation - 0.7) × 4        otherwise

p95 estimate = base latency × multiplier
Monthly component cost = sum of instantiated component costs
Complexity = component points + 0.25 per edge
```

Zero offered requests is handled explicitly without division by zero. Invalid graphs return validation issues and no successful throughput. Latency shown for an invalid graph is a zero sentinel with an explanation, not a claim of instant response.

The preset capacities are not based on real benchmarks. The latency multiplier is a simple learning heuristic. In particular, it is not a queueing-theory model, real p95 calculation, or guarantee of production performance.

At 50,000 users with the default daily request and peak assumptions, peak demand is approximately 578.70 RPS. A 500-RPS API limits successful throughput and the model returns 13.6% errors. Meeting the 200 ms latency target alone is not enough: the scenario-success objective must also pass.

## Restart is a separate failure mode

Calling `simulateArchitecture(graph, workload, 'restart')` models lookups after API recovery:

- Local data path: rows disappeared; throughput is zero and errors are 100%.
- Database path: committed data remains; normal workload calculations apply.

This explains durability only. It does not model the duration of the outage, replica failover, database failure, recovery point objectives or recovery time objectives.

## Scoring

| Evidence                              | Maximum |
| ------------------------------------- | ------: |
| Confirmed requirements                |      20 |
| Initial peak-RPS estimate             |      15 |
| Correct diagnosis choice              |      20 |
| Valid architecture meeting objectives |      20 |
| Correct trade-off choice              |      15 |
| Focused design within budget          |      10 |

The initial estimate is captured as evidence when leaving the brief. Later traffic experiments do not erase that learning achievement. Every score category exposes its rule. Wrong choices can be revised without a retry penalty.

This is a guided chapter with a small design vocabulary; it does not pretend to evaluate all possible interview architectures. Free-form speech/writing evaluation is out of scope.

## Saving and recovery

The reducer state is saved locally. Transient simulation results are intentionally cleared on refresh, so the learner reruns the current architecture. Chapter achievements and explicit answers are retained.

The loader validates schema version, stage progression, component kinds, identifiers, graph shapes, numeric ranges and learner evidence. If saved data is incompatible, it attempts to preserve the raw data under `scalequest.progress.recovery` before starting fresh. If the recovery backup cannot be written, saving is suppressed to avoid overwriting that original. Storage errors produce a notice rather than crashing the game.

There is no account sync. Progress belongs to this browser and origin; localhost ports, preview ports and a deployed domain have separate storage.

## What's intentionally next

The rest of the approved campaign still needs implementation: indexes, connection pooling, load balancing, caches, replicas, rate limits, observability and resilience. A future sandbox should unlock after the full campaign rather than pretending the current three-node model can evaluate arbitrary architectures.

The current application establishes the UI, pure simulator boundary, authored explanations and progression mechanism needed for those chapters. Flash-sale inventory requires a separate write/consistency model rather than adding a queue icon to this read-path model.
