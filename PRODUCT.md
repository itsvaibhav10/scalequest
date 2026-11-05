# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Working developers who understand APIs and databases but have no structured method for system design, preparing for system design interviews. They study alone, in short sessions, on a laptop. The editing canvas is desktop; the brief, explanations and results must stay readable on a phone.

## Product Purpose
ScaleQuest teaches system design through a browser game. The learner starts with a deliberately simple read API for 10 users, raises the load up to 1 million users, watches the design fail under measurable constraints, changes the architecture, and explains the trade-offs. Success is a learner who can say why each component was added and what it costs, not one who memorised a finished diagram.

## Positioning
Break it, then fix it. Every chapter shows a measurable failure first (an unindexed database, a single server, a database that every read still reaches, a bot spike), and the learner earns the fix. The simulator is deterministic and explainable, with every number traceable to a disclosed formula. It is not a video course, a quiz bank or a static diagram library.

## Operating Context
Chapters run in order: requirements, 10, 100, 1K, 10K, 100K and 1M daily users. Each chapter has a brief, a component palette that unlocks over time, a canvas, a traffic console, optional incidents (restart, server failure, traffic spike), objectives, and interviewer-style questions with a score. Progress is stored in the browser only. There is no account, backend or AI service.

## Capabilities and Constraints
- Simulation is plain TypeScript in the browser: graph traffic flow, capacity per instance, cache hit ratio, index on or off, rate limiter, node failure and spike incidents.
- Numbers are illustrative presets, not cloud quotes or hardware benchmarks. Scenario success is not an uptime figure.
- Stack is React 19, Vite and React Flow with plain CSS. No Tailwind. Runtime dependencies stay minimal; none may be added without approval.
- Out of scope for now: Google sign-in and cloud progress (specified in `docs/superpowers/specs/2026-09-12-auth-cloud-progress-design.md`), other problem domains, multiplayer.
- Undecided: a Hinglish explanation toggle. The learner asked for it; it is a later round and not part of the current redesign.

## Brand Commitments
Name: ScaleQuest. The user chose a playful, game-like feel that must still read as credible interview preparation. UI copy is English; technical terms stay in English.

## Evidence on Hand
Product design and plans in `docs/superpowers/`, an implementation guide in `docs/`, and a working six-chapter campaign. There are no learner testimonials, usage data or benchmarks; none may be invented.

## Product Principles
- One new concept per chapter, introduced by a failure the learner can see.
- Every metric can be traced to its calculation.
- More components is not a better design; add a piece only for a constraint you can point to.
- A design that is cheaper and simpler than the reference is a valid answer.
- The reference solution is one valid design, not the only one.

## Accessibility & Inclusion
Keyboard operation of every canvas action (the list editor already provides it), visible focus, sufficient contrast, reduced-motion support for any animation, and results that never rely on color alone.
