# ScaleQuest

Learn system design by building a request path, changing its workload, observing failure, and defending your choices.

ScaleQuest is a browser-based interview learning game for working developers. The campaign is one read API taken from 10 users to 1 million. Each chapter starts with something that breaks, and you earn the fix.

| Chapter | Daily users | What breaks                                                    | What you learn                                  |
| ------- | ----------- | -------------------------------------------------------------- | ----------------------------------------------- |
| Brief   | 10          | Nothing yet                                                    | Estimating peak requests per second             |
| 1       | 10          | Nothing                                                        | The simplest path, and what local data gives up |
| 2       | 100         | A restart erases products                                      | A database for durability                       |
| 3       | 1K          | The database fails far below its rating                        | An index on the lookup column                   |
| 4       | 10K         | One API server is both too small and a single point of failure | A load balancer and N+1 sizing                  |
| 5       | 100K        | Every read still reaches one database                          | A cache, or read replicas, and what each costs  |
| 6       | 1M          | A bot spike and a server failure                               | A rate limiter and redundancy                   |

## Run locally

Requires Node.js 22.12+ (verified with Node 22.22) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
```

The production output is `dist/`. Any static host can serve it. No API key, account, database, Docker installation or backend is needed. Runtime dependencies are React and React Flow; simulation is plain TypeScript in the browser.

## What you can do

1. Clarify the product-lookup contract and calculate peak requests per second.
2. Build on a canvas of isometric blocks. Connect them by dragging handles or with the keyboard list editor, set API and replica instance counts, and toggle the database index.
3. Run traffic and inspect latency, throughput, errors, scenario success, cost and complexity. Each block shows its own load, and requests ride the roads between blocks.
4. Run incidents where a chapter has them: API restart, server failure, bot traffic spike.
5. Answer authored diagnosis and trade-off questions and earn an explainable category score.
6. Compare baseline, current and reference architectures under identical assumptions. More than one design can pass; the cheaper one is not always the reference.
7. Inspect Why / How / What, including schema, pseudocode, trade-offs and when not to use each component.
8. Refresh to resume progress; use the reset control to start again.

Editing is designed for desktop. On narrow screens the canvas is replaced by a readable notice, while teaching content and results remain available.

## Documentation

- [Product design](docs/superpowers/specs/2026-09-06-scalequest-design.md): the broader vision and intended learning model.
- [Implementation plan](docs/superpowers/plans/2026-09-07-scalequest-playable-slice.md): the approved first chapter.
- [Implementation guide](docs/implementation-guide.md): what is actually built, where it lives, and why.
- [Implementation decisions](docs/implementation-log.md): corrections made while translating the plan into code.
- [Validation record](docs/manual-validation.md): checks performed and their results.
- [PRODUCT.md](PRODUCT.md): who the product is for, its positioning and constraints.
- [DESIGN.md](DESIGN.md): the visual system (isometric toybox): color, type, shape and rules.

The implementation guide is the source of truth for current behavior. The decisions log and validation record keep the original delivery and add a 2026-11-05 update for chapters 3 to 6, the graph simulator and the redesign. The design and plan describe additional future work and contain some original formulas superseded by the implementation decisions.

## Educational model

Values are **illustrative presets**, not cloud quotes or hardware benchmarks. For example, one API server instance is assigned 500 RPS capacity and $40/month. That does not mean a real $40 server sustains this workload.

- Workload derives from daily active users and daily requests, not registered users. Later chapters assume heavier use per visitor (500 lookups a day in chapters 3 to 5) and say so in their briefs.
- Traffic is pushed through the architecture graph in order. A component serves at most its capacity and the rest is lost. Where a path splits, traffic is shared in proportion to capacity.
- The p95 latency is the slowest route that carries at least 5% of requests, with each component slowed as it nears capacity. It is a disclosed heuristic, not measured latency.
- A cache answers a fixed share of reads (85%) and passes the rest on. An unindexed database is rated far lower than an indexed one. A rate limiter rejects abusive traffic and also wrongly rejects 0.5% of real requests.
- “Scenario success” means successful legitimate requests in one modeled scenario, not annual uptime.
- Restart represents the period **after the API process recovers**. A separate database preserves rows; it does not keep a stopped API available.
- A server-failure incident removes one API instance. A spike adds three times the normal peak as abusive traffic.
- Not modeled: queues, writes, cache invalidation, replication lag, multi-region behavior and failure of the load balancer itself.
- Component costs exclude traffic fees, backups, taxes, engineering time and provider-specific infrastructure.
- Scores evaluate authored choices and requirements. They do not evaluate free-form communication or predict interview outcomes.

## Structure

```text
src/domain        Types shared by content, simulation and UI
src/content       Component presets and authored campaign objectives
src/simulator     Pure graph validation, calculations, incident behavior
src/game          Reducer, context and progression commands
src/persistence   Versioned storage validation and recovery
src/scoring       Explicit learner evidence and score categories
src/canvas        React Flow adapter, isometric blocks, packet edges, palette, layout
src/styles        Design tokens and the four stylesheets
public/fonts      Self-hosted Bricolage Grotesque and Figtree (latin subset)
src/campaign      Brief and playable workspace
src/interview     Authored questions and feedback
src/learning      Golden Circle explanations
src/metrics       Workload controls, metrics and calculation trace
src/comparison    Baseline/current/reference comparison
src/ui            Buttons, icons and dialog
```

Campaign content is separate from simulation rules. Adding a component label alone cannot create its behavior; each kind needs a role in the simulator (`src/simulator`) and a definition in `src/content/components.ts`.

No tests were created per project instructions. Typecheck, lint, production build, direct disposable runtime probes and browser interaction checks are used for this delivery.

## Privacy and hosting

Progress is saved in this browser under `scalequest.progress.v1`. There is no analytics, auth or user-data upload. Fonts are self-hosted, so no request leaves the page for typography. The app can be hosted as static files and does not provision infrastructure for each learner.

## Vercel deployment

Production is a manual static upload of `dist/`, not a Git-connected deployment, so commits do not redeploy automatically. No backend or per-learner infrastructure was provisioned. Deployment protection was not changed.

Current production, deployed 2026-11-05 with the Vercel CLI (`vercel deploy dist --prod`):

- [Live production app](https://scalequest-iota.vercel.app)
- [Deployment dashboard](https://vercel.com/vaibhavjain5625-7834s-projects/scalequest/5RiwwfobDTSQHzCKdDYk6tCg53K2)
- Deployment ID: `dpl_5RiwwfobDTSQHzCKdDYk6tCg53K2`

This deployment is the six-chapter build with the toybox redesign (commit `1ad0ade`, docs after it). It does not include the later fix that stops the canvas hint overlapping the board border; that fix is committed and goes live on the next upload. Verified on the live domain: the asset hashes match the local build, the self-hosted font returns 200, the brief and chapter 1 open after entering an estimate, and the chapter 6 reference design gives 99.5% in the spike scenario and 99.36% with a server failure at $1,295, with every objective passing.

The previous production deployment (2026-09-09, the original two-chapter build, `dpl_9ej9YRBUt74fBFmHD9rM4unYMWD7`) is still available as a rollback candidate in the Vercel dashboard.

An open-source license has not been chosen yet.
