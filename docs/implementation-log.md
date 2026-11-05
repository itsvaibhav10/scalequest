# Implementation record

Approved plan: docs/superpowers/plans/2026-09-07-scalequest-playable-slice.md

Working branch: vaibhav/scalequest-playable. The dedicated clean project checkout is used so the deliverable remains directly accessible in the user's project.

## Preflight decisions

- Tasks 1/5/6/7/8 share presentation files: controller owns UI/integration; domain/content/simulator is delegated with exclusive file ownership.
- Task 2 produces types used by 3–8: retain original names, explicitly extend incident and learner-answer state where the original plan omitted them.
- Task 4/6/7 need explicit learner evidence: score diagnosis and trade-off selections, not inferred communication quality from graph shape.
- Task 3 formula correction: scenario success is 100 minus errors, not annual availability. No claim of measured uptime or real p95 benchmark.
- Stage 2 persistence incident means after the API has restarted. A database preserves data, but does not make the restarting API continuously available.
- Graph model supports one synchronous request path in this slice. Ambiguous branching is explained as unsupported rather than silently choosing a favorable path.
- Stage progression preserves user reasoning; topology/workload edits invalidate results and stale completion eligibility.
- The 1M-user campaign remains the roadmap; this approved slice implements requirements, 10 users and 100 users.
- Each task is checked for its deliverable, with full independent review and browser verification at integration. No test files will be created.

## Progress

- Setup: feature branch and dependency configuration created.
- Domain, content, simulation: complete; independently reviewed.
- UI, persistence, interview, integration: complete.
- Review fixes: restart throughput status and causal trace corrected; scenario success objective added; completed-then-edited progress now restores safely.
- Verification: typecheck, lint, production build, 12 direct runtime probes and full browser journey passed. Detailed evidence in manual-validation.md.

## Delivery mapping

| Plan task       | Delivered                                                                      |
| --------------- | ------------------------------------------------------------------------------ |
| 1 — scaffold    | React/Vite/TypeScript, app shell, tokens, controls                             |
| 2 — content     | Four component definitions, three campaign stages, Golden Circle content       |
| 3 — simulation  | Validation, disclosed metrics, overload and restart behavior                   |
| 4 — progress    | Reducer/context, snapshot evidence, storage validation and recovery            |
| 5 — canvas      | Add/connect/move/delete, fitted graph, keyboard editor                         |
| 6 — teaching    | Brief, estimate, authored questions, Golden Circle tabs and completion summary |
| 7 — feedback    | Metrics, causal trace, six score categories, equal-workload comparison         |
| 8 — integration | Playable chapter, responsive fallback, documentation and verified static build |

Presentation composition was kept focused without empty AppShell/Panel abstractions. CSS is centralized; pure simulator files remain independent of React. Tasks were consolidated into one reviewed local feature commit rather than eight incidental implementation commits.

## Update, 2026-11-05: graph simulator, chapters 3 to 6, toybox redesign

Scope approved with the user: full read-API campaign plus a redesign. Out of scope: Google sign-in and cloud progress, backend or AI, other problem domains.

### Decisions

- The single-path simulator was replaced by a topological traffic-flow model. For one path with no scaling the output is identical to the original; this was verified against the committed original before building on it.
- Scaling is an instance count on a node, not many nodes. A canvas of 24 API blocks is unusable; one block with a count, plus stacked art as a hint, keeps the board readable.
- Authored per-chapter workloads. Strict proportional growth would need 10 times the servers per chapter and break the canvas. Each brief states its assumption.
- Incidents are separate scenarios, and objectives read the latest run of each (`runs`) rather than a single latest result.
- Stage content moved into data (mission copy, questions, incidents, unlocks, objectives). The reducer, scoring, palette, console and persistence no longer hard-code chapters.
- An old save that completed chapter 2 is advanced on load instead of being left on a completion screen.
- Visual direction: three directions were shown and the user picked the isometric toybox. Fonts are self-hosted instead of loaded from Google Fonts. Product and design records were added as `PRODUCT.md` and `DESIGN.md`.

### Corrections found while verifying

- Three read replicas are not enough at 100K: the data tier needs about six units of capacity. Five replicas pass at $985, so the cache ($635) is the cheaper reference.
- A 1% false-positive rate on the rate limiter put the best-case scenario success at exactly 99.00%, on the objective's knife edge. It is now 0.5%.
- A newly added block was placed on top of an existing one. Adding a block now re-flows all blocks by request layer.
- The keyboard list editor could not remove a connection. Each outgoing connection now has a disconnect button.
- The simulator trace joined parallel data blocks with an arrow, which implied they were serial. It now lists components in request order.
- Packets rendered at the canvas origin until their start delay passed; they are now hidden until they begin.
- The level-map connector ran through the labels, a flex selector hid the guide avatar, and the header overflowed at 390px. All fixed.

### Not done

- `docs/manual-validation.md` records original and current checks. Chapters 1 to 3 were checked through the simulator and stage scripts but not played through in the browser after the redesign.
- Mobile was checked in a 390px iframe, not on a device.
