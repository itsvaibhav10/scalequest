# What we built, and how to understand it

Current as of 2026-11-05. The campaign has six playable chapters, a graph-based simulator and the isometric toybox interface. Earlier notes about the original two-chapter build are kept in [implementation-log.md](implementation-log.md).

## The learning journey

The campaign starts with an ordinary catalogue lookup:

```http
GET /api/products/:id
```

You assume 10 daily active users, 100 lookups per user per day and a peak factor of 10.

```text
Average RPS = 10 × 100 / 86,400 = 0.01157
Peak RPS = 0.01157 × 10 = 0.11574
```

User count alone cannot tell you whether Redis or more servers are needed. The first useful action is to translate product activity into demand. Every chapter after that starts with something that breaks, and the learner earns the fix.

| Chapter | Daily users | Lookups per user per day | Peak RPS | Budget | The failure                                                                     | The fix                                                         |
| ------- | ----------: | -----------------------: | -------: | -----: | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1       |          10 |                      100 |     0.12 |   $150 | None; the simplest path is right                                                | Client → API → local data                                       |
| 2       |         100 |                      100 |     1.16 |   $150 | A restart erases products                                                       | A relational database                                           |
| 3       |          1K |                      500 |     57.9 |   $250 | An unindexed database is rated about 40 RPS and fails with 30.9% errors         | Turn on the index                                               |
| 4       |         10K |                      500 |    578.7 |   $400 | One API server is rated 500 RPS (13.6% errors), and losing it is a total outage | A load balancer and 3 API instances (survives losing one)       |
| 5       |        100K |                      500 |    5,787 | $1,000 | Scaling the API only moves the bottleneck: 82.7% errors at the database         | A cache ($635), or 5 replicas ($985)                            |
| 6       |          1M |                      100 |   11,574 | $1,500 | A bot spike and a server failure                                                | A rate limiter, 24 API instances, cache and 2 replicas ($1,295) |

Chapters 3 to 6 override the learner's workload with authored assumptions when they start. Each brief says so. The learner can still change daily users, lookups and the peak multiplier in the traffic console.

This is the Golden Circle in practice, using chapter 2 as the example:

- **Why:** preserve data when the API process restarts.
- **How:** store data in a separately managed durable system.
- **What:** replace API → Local data with API → Relational database.
- **Trade-off:** monthly component cost rises from $40 to $120, a network dependency is added, and base modeled latency increases from 52 ms to 62 ms.
- **When not to use:** a disposable experiment without a durability requirement can begin with local data.

## What each UI region does

| Region              | Implementation                             | Purpose                                                                             |
| ------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Level map           | app/App.tsx                                | One isometric tile per chapter; done, active and locked states                      |
| Brief               | campaign/CampaignIntro.tsx                 | Collects assumptions and checks the learner's RPS estimate                          |
| Toy box (palette)   | canvas/ComponentPalette.tsx                | Adds stage-allowed blocks; shows when locked blocks unlock                          |
| Board               | canvas/ArchitectureCanvas.tsx              | Moves and removes blocks, connects and deletes roads, offers a keyboard list editor |
| Blocks              | canvas/SystemNode.tsx, canvas/IsoBlock.tsx | One drawn silhouette per component, instance stepper, index toggle, load pill       |
| Roads and packets   | canvas/PacketEdge.tsx                      | Dotted edges; packets move after a run and slow down when the target is overloaded  |
| Layout              | canvas/layout.ts                           | Re-flows blocks into request-layer columns whenever one is added                    |
| Interview guide     | interview/InterviewerPanel.tsx             | Presents the stage's diagnosis and trade-off questions                              |
| Why panel           | learning/GoldenCirclePanel.tsx             | Explains internal behavior, schema, pseudocode and limitations                      |
| Traffic and results | metrics/                                   | Runs simulations, one button per incident, and exposes the calculation trace        |
| Comparison          | comparison/ComparisonDrawer.tsx            | Same workload for baseline, current and reference, with a scenario picker           |
| Completion          | campaign/GameWorkspace.tsx                 | Interview summary after the last chapter                                            |

Stage content (mission copy, questions, incidents, unlocks, objectives, baseline and reference designs) is data in `content/readApiCampaign.ts`. The reducer, scoring, palette, console and persistence read it; none of them hard-code a chapter.

The visual system is described in [DESIGN.md](../DESIGN.md) and the product record in [PRODUCT.md](../PRODUCT.md).

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
Validation + metrics + per-block load + causal trace
              ↓
Objectives (judged per scenario) + explicit answers → score → progression
```

React does not live inside the simulator. A result can be reproduced from the same serialized inputs. React Flow positions do not affect calculations.

Architecture and workload edits invalidate every stored run. This prevents a learner from passing a new design using the result of an older one. Moving blocks preserves the results because the system's meaning has not changed.

Objectives are evaluated against the latest run of each scenario (`runs`), not only the most recent one. Chapters with incidents therefore require the learner to run each incident: for example chapter 6 needs a normal run, a spike run and a server-failure run.

## The simulation, without magic

### Components

Each kind has a role: source, gate (rate limiter), distributor (load balancer), compute (API), cache, or data. Definitions in `content/components.ts` supply capacity per instance, illustrative latency, cost, complexity and allowed connections. API servers and read replicas are scalable: a node carries an instance count that multiplies capacity, cost and complexity. A database has an `indexed` option; a missing value means indexed, so older saves keep their behavior.

| Component                      |      Capacity per instance | Latency | Cost per instance |
| ------------------------------ | -------------------------: | ------: | ----------------: |
| Rate limiter                   |                 50,000 RPS |    1 ms |               $20 |
| Load balancer                  |                 20,000 RPS |    2 ms |               $25 |
| API server                     |                    500 RPS |   30 ms |               $40 |
| Cache                          | 20,000 RPS (85% hit ratio) |    1 ms |               $50 |
| Local data                     |                    500 RPS |    2 ms |                $0 |
| Relational database, indexed   |                  1,000 RPS |   12 ms |               $80 |
| Relational database, unindexed |                     40 RPS |  150 ms |               $80 |
| Read replica                   |                  1,000 RPS |   12 ms |               $80 |

### Validation

The validator checks identifiers, compatible edges in the allowed direction, missing nodes, cycles, and that every block sits on a route from the client to data. It adds rules for the new components: several API servers need a load balancer, a replica needs a primary database, local data cannot be shared by more than one API instance, and instance counts must be whole numbers from 1 to 40. Requests flow client → rate limiter → load balancer → API → cache → data.

### Traffic flow

Traffic is pushed through the graph in topological order. For each node:

```text
served = min(offered, capacity)
Where a path splits, traffic is shared in proportion to each target's capacity.
Cache: hit ratio × served is answered; the rest goes on.
Rate limiter: rejects abusive traffic, and rejects 0.5% of legitimate traffic.
Scenario success = legitimate requests that finish ÷ legitimate peak
Errors = 100 − scenario success
```

The p95 estimate lists every route with its probability and latency, then takes the slowest route that carries at least 5% of requests. Each node's latency is multiplied by `1` while its load is at most 70% of capacity, and by `1 + (load − 0.7) × 4` above that.

```text
Monthly cost = sum of cost × instance count
Complexity = component points + 0.25 per extra instance + 0.25 per edge
```

Zero offered requests is handled without division by zero. Invalid graphs return validation issues and no successful throughput. Latency shown for an invalid graph is a zero sentinel with an explanation, not a claim of instant response. For a single path with no scaling the numbers are identical to the original simulator; this was checked against the committed original (see [manual-validation.md](manual-validation.md)).

The preset capacities are not based on real benchmarks. The latency multiplier is a learning heuristic, not a queueing-theory model, a real p95 calculation or a guarantee of production performance.

## Incidents are separate scenarios

`simulateArchitecture(graph, workload, incident)` takes one of four incidents:

- `none`: normal peak traffic.
- `restart`: lookups after API recovery. Local data path: rows disappeared, throughput is zero and errors are 100%. Database path: committed data remains and normal calculations apply.
- `node-failure`: one API instance is lost. With one instance this is a total outage; with N instances the capacity is N−1.
- `spike`: abusive traffic adds three times the legitimate peak. Without a rate limiter it competes for the same capacity (chapter 6 reference: 25.9% of real users served). With one, the abusive traffic is rejected (34,722 RPS shed) and real users are served at 99.5%.

This does not model outage duration, replica failover, database failure, load balancer failure, replication lag, cache invalidation, recovery point objectives or recovery time objectives.

## Scoring

| Evidence                                              | Maximum |
| ----------------------------------------------------- | ------: |
| Confirmed requirements                                |      20 |
| Initial peak-RPS estimate                             |      15 |
| Correct diagnosis choice                              |      20 |
| Valid architecture meeting objectives                 |      20 |
| Correct trade-off choice                              |      15 |
| Within budget, with no more blocks than the reference |      10 |

The initial estimate is captured as evidence when leaving the brief. Later traffic experiments do not erase that learning achievement. Every score category exposes its rule. Wrong choices can be revised without a retry penalty.

This is a guided campaign with a small design vocabulary; it does not pretend to evaluate all possible interview architectures. Free-form speech or writing evaluation is out of scope.

## Saving and recovery

The reducer state is saved locally. Transient simulation results (`lastResult` and `runs`) are intentionally cleared on refresh, so the learner reruns the current architecture. Chapter achievements and explicit answers are retained.

The loader validates schema version, stage progression against the campaign's stage list, which component kinds are unlocked, identifiers, graph shapes, optional instance counts and index flags, numeric ranges and learner evidence. A save that finished a chapter before later chapters existed is advanced to the next chapter on load. If saved data is incompatible, it attempts to preserve the raw data under `scalequest.progress.recovery` before starting fresh. If the recovery backup cannot be written, saving is suppressed to avoid overwriting that original. Storage errors produce a notice rather than crashing the game.

There is no account sync. Progress belongs to this browser and origin; localhost ports, preview ports and a deployed domain have separate storage.

## What's intentionally next

- Observability, queues and write paths. Flash-sale inventory needs a separate write and consistency model rather than a queue icon on this read-path model.
- Google sign-in and cloud progress: specified in `docs/superpowers/specs/2026-09-12-auth-cloud-progress-design.md`, not built.
- Other problem domains beyond the read API, and a sandbox that unlocks after the campaign.
- A Hinglish explanation toggle is recorded as undecided in `PRODUCT.md`.
- Chapter 6 puts seven blocks on the board; at narrow desktop widths the zoom drops and small labels are hard to read.
