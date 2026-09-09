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
