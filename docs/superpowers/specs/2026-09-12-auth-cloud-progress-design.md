# ScaleQuest: Google authentication and cloud progress

Status: proposed implementation design; product direction approved, written specification awaiting review.

## Overview: Why / How / What

**Why:** a learner should resume their campaign after changing browsers or devices without losing the existing guest experience.

**How:** retain the deterministic browser simulation, use Supabase Auth for identity, and store one private progress snapshot per user and campaign in PostgreSQL. Keep local drafts as an offline fallback. Supabase owns passwords and OAuth sessions; ScaleQuest never handles a Google password.

**What:** Google sign-in/sign-out, optional guest mode, explicit guest-progress import, cloud restore and autosave, sync status, conflict resolution, database access policies, and documented deployment setup. This is a new subsystem, not a replacement of the simulator.

## Scope and alternatives

- Selected: Supabase Auth with Google OAuth and Supabase PostgreSQL. A single managed provider covers identity and persistence.
- Alternative: email/password on Supabase; deferred because public confirmation/reset emails need a production email provider and additional user flows.
- Excluded: custom authentication, separate application server, AI, multiplayer, leaderboards, additional campaign stages, realtime collaboration, paid plans, and automatic upgrades.
- Existing React/Vite, CSS, game reducer and validation patterns remain. Introduce only the Supabase client dependency required by this feature.

## Current implementation and ownership

`src/game/GameProvider.tsx` loads browser progress once and saves on game-state changes. `src/persistence/progressStorage.ts` validates versioned progress and preserves incompatible saves. `src/game/gameReducer.ts` owns the playable state. Reload currently discards derived simulation results, which users can regenerate.

Add focused auth and cloud-persistence modules; keep cloud side effects outside the pure reducer and simulator. Extend the reducer with a validated restore action. Reuse the current snapshot validation, with an explicit serialized representation excluding transient UI notices and simulation results. Do not claim restoration of derived result panels without rerunning the simulation.

## User experience

The header offers “Sign in to save progress” to guests and an account/sign-out control to signed-in users. Google consent is the signup flow for a new user and login for a returning user. A cancellation or callback failure shows a retryable message without discarding the guest draft.

Guest learning remains available without configuration or connectivity. Signed-in status distinguishes Loading progress, Saving, Saved, Offline/local draft, Save failed, and Conflict. Never label unsent changes as saved to cloud. Account identifiers and sync controls must be keyboard accessible and fit narrow layouts.

On login, fetch cloud progress before enabling cloud writes. Never upload the default initial state while restoration is pending. If a cloud save exists, restore it after validation. Offer guest import explicitly when a nonempty guest draft exists; show the current stage and saved timestamp of each choice. Never automatically replace an existing cloud save with guest data. Keep the original guest draft until the chosen import has succeeded.

Signing out cancels queued account writes, invalidates in-flight callbacks, clears the account draft from active UI, and restores the separate guest session. Warn before signing out with unsynced work; allow the user to cancel. Account A's draft must never become account B's or the guest's progress.

## Database and access model

Use Supabase-managed `auth.users`; do not duplicate profiles unless later product requirements need them. Add `public.campaign_progress`:

| Field | Purpose |
| --- | --- |
| `user_id` UUID | Owner; references `auth.users`, cascade on user deletion |
| `campaign_id` text | Supported campaign identifier |
| `snapshot` JSONB | Versioned, bounded serialized progress |
| `revision` bigint | Monotonically increasing concurrency token |
| `updated_at` timestamptz | Server-assigned save time |

Primary key: `(user_id, campaign_id)`. Enforce the supported campaign, snapshot object/version, a 128 KiB maximum serialized payload, and nonnegative revisions in database constraints. Client validation also checks the existing game-state bounds and semantics; cloud saves are untrusted inputs. Scores are personal learning state, not tamper-proof achievements.

Enable row-level security. No anonymous access to progress. Authenticated SELECT/INSERT/UPDATE policies require `auth.uid() = user_id`; UPDATE includes both ownership USING and WITH CHECK predicates. Restrict grants to the required operations. No service-role/secret key is shipped to the browser. No table-wide authenticated access or user-editable metadata authorization.

Use a security-invoker save function with a fixed search path for atomic revision-checked saves. It obtains identity from the authenticated session, not an arbitrary caller-supplied owner. Initial insertion succeeds only if the row is absent. Updates require the supplied expected revision and return the new server revision/time. Competing writes return a conflict instead of blind upsert. Revoke default PUBLIC function execution and grant only authenticated execution; underlying RLS remains active.

## Sync behavior and failure handling

Persist an account-scoped local draft promptly and debounce cloud saves by approximately one second. Serialize requests and keep the newest pending snapshot; acknowledgement of an older request must not mark a newer edit saved. Bound retry attempts and provide explicit retry; reconnect and page focus trigger reconciliation, not unconditional upload. Do not depend on unload-time requests succeeding.

Retain each local draft's last acknowledged server revision. On reload, compare it with the server before replaying offline work. If both local and remote have changed since that revision, pause cloud writes and let the learner choose “Use cloud version” or “Keep this device's version.” Refetch before applying a choice and save conditionally again; a further race remains a conflict. No automatic graph merge or timestamp-based last-writer-wins.

On account change, reject stale async results using an account/session generation guard. When cloud data is invalid or a read fails, preserve it and local drafts, report the problem, and do not overwrite it with a fresh campaign. A reset while signed in is an explicit revision-checked save of the initial campaign, subject to the same conflict rules.

## Configuration and release prerequisites

- Use a dedicated ScaleQuest Supabase project on a verified Free organization; do not repurpose the unrelated inactive project discovered in the connected account.
- Configure Google OAuth with minimal identity scopes. Google OAuth client secrets belong in Supabase provider configuration only.
- Configure the production site URL `https://scalequest-iota.vercel.app` and exact approved local/production callback URLs. Use a root-page callback so the static host needs no new route rewrite. Avoid broad production redirect wildcards.
- Frontend configuration uses the project URL and publishable key via Vite environment variables; document them in a non-secret example file. Keep all private credentials outside Git and the compiled bundle.
- Free-tier availability, organization quotas, Google consent setup and account access must be verified before provisioning. Do not accept paid upgrades or legal agreements on the user's behalf. If setup needs user action, report the exact step; do not claim the live feature is complete.
- Rebuild and redeploy the existing static Vercel app only after auth and data-access verification. The deployment is currently manual, not Git-integrated.

Supabase's pricing checked during design lists 50,000 monthly active users, 500 MB database storage and 5 GB egress on Free, with inactivity pausing and no automatic database backups. These are quotas, not a guarantee that all future usage is free. Batch small snapshots; do not upload every simulation event or pointer movement as an individual request.

## Verification and documentation

Per repository instructions, do not create or modify test files. Run existing lint, typecheck and build commands. Perform disposable runtime/database probes and browser checks for guest continuity, OAuth success/cancellation, first login, guest import, refresh, second-browser restore, logout/account switching, offline/retry, simultaneous saves, malformed saves and reset persistence. Verify unauthenticated access is denied and user A cannot read or modify user B's progress. Report any unverified scenarios honestly.

Update the implementation guide and README with schema, RLS rationale, sync rules, configuration, free-tier caveats and actual deployment status. Replace the current blanket “no auth or user-data upload” wording when the feature ships. Explain that signed-in progress and identity metadata now reach Supabase while simulation execution remains local.

## Completion criteria

A learner can optionally sign in with Google, save their own valid progress, sign in on another browser and resume the same campaign state. Existing guest data is preserved, account data is isolated, conflicting/offline changes cannot silently clobber newer saves, and the live Vercel application is verified against the configured Supabase project.

## References

- [Supabase pricing](https://supabase.com/pricing)
- [Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Production auth email limitations](https://supabase.com/docs/guides/auth/auth-smtp)
- [Existing implementation guide](../../implementation-guide.md)
