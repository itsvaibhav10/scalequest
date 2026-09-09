# ScaleQuest

Learn system design by building a request path, changing its workload, observing failure, and defending your choices.

ScaleQuest is a browser-based interview learning game for working developers. Its first playable chapter covers **requirements → 10 users → 100 users**. The rest of the 1K–1M journey is visible as a roadmap, not playable yet.

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
2. Add local data to a client/API architecture. Connect nodes by dragging handles or using the keyboard connection editor.
3. Run traffic and inspect latency, throughput, errors, scenario success, cost and complexity.
4. Increase daily users to expose saturation; reconnect or reset your design.
5. Answer authored diagnosis/trade-off questions and earn an explainable category score.
6. Unlock the restart mission. Observe memory loss, then introduce a database and rerun the incident.
7. Compare baseline, current and reference architectures under identical assumptions.
8. Inspect Why / How / What, including schema/pseudocode, trade-offs and when not to use each component.
9. Refresh to resume progress; use the reset control to start again.

Editing is designed for desktop. On narrow screens the canvas is replaced by a readable notice, while teaching content and results remain available.

## Documentation

- [Product design](docs/superpowers/specs/2026-09-06-scalequest-design.md): the broader vision and intended learning model.
- [Implementation plan](docs/superpowers/plans/2026-09-07-scalequest-playable-slice.md): the approved first chapter.
- [Implementation guide](docs/implementation-guide.md): what is actually built, where it lives, and why.
- [Implementation decisions](docs/implementation-log.md): corrections made while translating the plan into code.
- [Validation record](docs/manual-validation.md): checks performed and their results.

The implementation guide is the source of truth for current behavior. The design and plan describe additional future work and contain some original formulas superseded by the implementation decisions.

## Educational model

Values are **illustrative presets**, not cloud quotes or hardware benchmarks. For example, the API is assigned 500 RPS capacity and $40/month. That does not mean a real $40 server sustains this workload.

- Workload derives from daily active users and daily requests, not registered users.
- Latency uses a disclosed saturation heuristic, not measured latency samples.
- “Scenario success” means successful requests in one modeled scenario, not annual uptime.
- Restart represents the period **after the API process recovers**. A separate database preserves rows; it does not keep a stopped API available.
- This chapter simulates one synchronous path. Branching, replicas, queues, cache policies and multi-region behavior are future modules.
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
src/canvas        React Flow adapter, nodes and component palette
src/campaign      Brief and playable workspace
src/interview     Authored questions and feedback
src/learning      Golden Circle explanations
src/metrics       Workload controls, metrics and calculation trace
src/comparison    Baseline/current/reference comparison
src/ui            Buttons, icons and dialog
```

Campaign content is separate from simulation rules. Adding a “Cache” label alone cannot create cache behavior; a future chapter must implement its routing, hit/miss model and failure modes.

No tests were created per project instructions. Typecheck, lint, production build, direct disposable runtime probes and browser interaction checks are used for this delivery.

## Privacy and hosting

Progress is saved in this browser under `scalequest.progress.v1`. There is no analytics, auth or user-data upload. Google Fonts supplies optional typography; system fonts are the fallback. The app can be hosted as static files and does not provision infrastructure for each learner.

No deployment has been performed. An open-source license has not been chosen yet.
