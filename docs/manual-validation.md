# Validation record — 2026-11-05 update

Scope: graph simulator, chapters 3 to 6 and the isometric toybox redesign. No test files were committed; the scripts below were temporary and lived outside the repository.

## Commands

| Check | Observed result |
| --- | --- |
| npm run typecheck | Passed |
| npm run lint | Passed |
| npm run build | Passed; about 145.6 KB JavaScript gzip and 7.95 KB CSS gzip |
| Impeccable design detector over changed UI | One advisory (an animation name), fixed; second run returned no findings |
| Temporary engine script | 36 checks passed |
| Temporary stage script | All passed |

The engine script compared the new simulator with the committed original on chapters 1 and 2 (baseline and reference, with and without a restart) and on a saturated single path. Throughput, p95, errors, scenario success, cost and complexity were identical. It then checked the new scenarios and the validation rules:

- 1K: unindexed database fails with 30.9% errors at 57.9 peak RPS; indexed passes at p95 62 ms.
- 10K: one API gives 13.6% errors; load balancer with 3 API instances is healthy and survives a server failure; with 2 instances a failure leaves 86.4%.
- 100K: no cache gives 82.7% errors; cache passes at $635 and 104.8 ms; 5 replicas pass at $985; 3 replicas leave 30.9% errors.
- 1M: calm 99.5%; spike with limiter 99.5% with 34,722 RPS shed; spike without limiter 25.9%; server failure 99.36% with 24 instances and 95.04% with 23; cost $1,295; p95 97.2 ms.
- Validation: several API servers without a load balancer, a replica without a primary, local data behind several servers, a dead-end load balancer, zero instances and a cycle are all rejected.

The stage script plays every chapter as the interface would, running every incident the chapter offers. In each chapter the reference passes every objective and the baseline fails at least one.

## Browser workflow

Verified in Google Chrome against the Vite dev server at http://127.0.0.1:5173.

- [x] Seeded chapter 4 progress is accepted by the persistence validator and opens on chapter 4.
- [x] Added a load balancer, set the API to 3 instances, rewired with the keyboard list editor and ran a normal and a server-failure scenario. The page showed 578.7 RPS, $225, p95 64 ms and 100% in both, with all objectives passed.
- [x] Answering both questions and continuing advanced to chapter 5 and saved progress.
- [x] Chapter 5: API at 12 instances alone left 82.72% errors; adding a cache and rewiring gave 0% errors, $635 and p95 104.81 ms.
- [x] Chapter 6 reference: spike and server-failure buttons produced the expected numbers; completing the campaign showed the completion summary and survived a reload.
- [x] After the redesign, viewed the brief, chapter 5 baseline with per-block load pills, chapter 6 with seven blocks and branching data tier, the completion panel and the comparison dialog with its scenario picker.
- [x] A 390px-wide iframe of the app had no horizontal overflow after fixing the header.
- [ ] Reduced motion: the packet edges check the media query in code and skip packets, and the stylesheet disables animations, but this was not emulated in the browser.

A first pass at 390px reported 51px of horizontal overflow from the header actions; it was fixed and rechecked.

## Limits of this evidence

- Chapters 1 to 3 were checked through the simulator and stage scripts, not played in the browser after the redesign.
- Mobile was an iframe at 390px in desktop Chrome, not a device, and touch behavior was not tested.
- The console message check started after page load, so it does not prove the absence of load-time warnings.
- Contrast was reasoned from the palette (ink on ground above 4.5:1) and not measured with a tool.
- Hot reload briefly detached the page during one script run; a fresh reload was fine.
- The deployed site was not part of this validation. See the README for deployment status.

---

# Validation record — 2026-09-09

Scope: first playable chapter, stages 0–2. No automated test files were created.

## Commands

| Check                            | Observed result                                                               |
| -------------------------------- | ----------------------------------------------------------------------------- |
| npm install                      | 192 packages audited; 0 reported vulnerabilities                              |
| npm run typecheck                | Passed                                                                        |
| npm run lint                     | Passed                                                                        |
| npm run build                    | Passed; static dist output, ~137 KB JavaScript gzip                           |
| Direct disposable runtime probes | 12 checks passed, no persisted test scripts                                   |
| Independent source review        | Engine and state findings fixed; scoped re-review found no remaining blockers |

ESLint 9 is installed as a development tool and npm emitted its upstream support/deprecation notice. It does not affect the production artifact; lint completed successfully.

## Browser workflow

Verified using the Codex in-app browser at http://127.0.0.1:5173.

- [x] Opens without credentials or a backend.
- [x] Brief estimates: entered 0.12 peak RPS for default assumptions, confirmed requirements, entered stage 1.
- [x] Database is locked in stage 1.
- [x] Initial missing-data graph produces visible validation errors and blocks progression.
- [x] Added Local data, connected API using accessible connection editor, ran simulation.
- [x] Correct diagnosis and trade-off choices produced 100/100 and enabled the next stage.
- [x] New stage resets scroll and supplies the 100-user durability requirement.
- [x] API restart with local data produced zero throughput and 100% errors.
- [x] Removed local data, added relational database, connected API, reran restart.
- [x] Database restart produced 0% errors, $120 component cost and 62 ms modeled latency.
- [x] Comparison showed baseline local-data errors 100%, current/reference database errors 0% under the same restart scenario.
- [x] Golden Circle What tab displayed schema and parameterized SELECT pseudocode.
- [x] Edge selection + Backspace removed an edge; keyboard reconnection restored it.
- [x] Correct stage-2 choices enabled chapter completion.
- [x] Completion heading and achievement survived a fresh page reload.
- [x] Desktop at 1440×1000 has no page horizontal overflow.
- [x] Mobile at 390×844 has no page horizontal overflow and shows the intended non-editing fallback.
- [x] Reduced-motion emulation reported both rendered edge animations as none; temporary emulation was cleared.

During active code edits, Vite hot replacement briefly invalidated the provider context. Fresh reload after integration was successful; this was not observed in the production bundle. Initial full-page browser screenshots had stitching artifacts, so retained evidence uses clean viewport captures.

## Direct runtime checks

1. Fresh state passes persistence validation.
2. Corrupt JSON is preserved under recovery key before reset.
3. Failed recovery backup suppresses saving and protects original.
4. Stage-0 checkbox-only state remains valid.
5. Confirmed estimate snapshot survives persistence.
6. Identical input returns byte-identical simulation JSON.
7. Default peak RPS is 0.1157407407 and local path costs $40.
8. 50K-user overload fails the success objective.
9. Completed chapter state validates.
10. Completed chapter followed by reset validates.
11. Completed chapter followed by workload edit validates.
12. Restart gives local data loss and durable database recovery.

These probes used bundled pure modules and an in-memory storage substitute, not real learner data.

## Visual review

Reference: [generated workspace reference](assets/workspace-reference.png).

Observed browser renders: [desktop](assets/workspace-desktop.png), [mobile](assets/workspace-mobile.png).

Both reference and rendered artifacts were inspected with the image viewer. The implementation follows the approved screen structure; intentional differences from the generated image are listed rather than treated as exact pixel fidelity.

| Comparison point | Result / decision                                                                   |
| ---------------- | ----------------------------------------------------------------------------------- |
| Layout           | Palette / canvas / interviewer, top campaign strip and lower simulation retained    |
| Palette          | Dark navy surfaces, periwinkle primary action and semantic mint/amber/error colors  |
| Typography       | Explicit control typography; teaching answers increased to 12px after first review  |
| Canvas           | Code-native interactive cards/edges; fitted view keeps all three components visible |
| Copy             | Removed generated AI interviewer, account/avatar and incorrect invented metrics     |
| Scope            | Higher-scale milestones clearly locked; first chapter scope shown in brief/footer   |
| Motion           | Request-flow animation has reduced-motion override                                  |
| Small screen     | Readable teaching fallback and stacked metrics, 390px layout without page overflow  |

## Remaining scope and limits

- 1K–1M missions and sandbox are roadmap features.
- One synchronous path is supported; arbitrary distributed graphs are not evaluated.
- Rules-based choices evaluate structured evidence, not natural-language interview performance.
- Illustrative numbers are not provider pricing, measured latency or uptime predictions.
- No deployed website, CI pipeline, cross-browser matrix or production service exists yet.
