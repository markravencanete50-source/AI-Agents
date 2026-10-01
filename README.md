# Orbit — AI company office

A private company dashboard with 18 animated robot teammates and a central CEO desk, a local agent worker, Supabase task queues, and exact-message CEO approvals. Uses subscription-authenticated Codex and installed Ollama models without a paid LLM API key.

This repository is being implemented in stages. See `docs/IMPLEMENTATION-STATUS.md` for verified functionality and remaining execution gates.

## Start

Use Node.js 24 LTS, then run from this repository:

```powershell
npm ci
Copy-Item apps/web/.env.example apps/web/.env.local
# Fill the two public Supabase values. Never use a service-role key here.
npm run dev
```

Open http://127.0.0.1:3000. The demonstration is clearly labeled and makes no external changes. Sign in with the configured CEO email to initialize a real office.

For actual agent work, pair a laptop in **Settings**, copy `apps/worker/.env.worker.example` to `apps/worker/.env`, and fill the public Supabase connection values and the one-time worker token. Keep Ollama running, then:

```powershell
npm run worker:check
npm run worker
```

Leave the worker running and the laptop awake. Closing the office browser does not stop the worker; putting the laptop to sleep does. The hosted dashboard never tries to reach localhost directly. The laptop polls Supabase using its revocable worker token.

## What works

- Eighteen articulated robots with desks, individual keyboard keys, department areas and a central CEO workstation. Dark mode persists locally; immersive Office fills the screen; click robots for work cards; scroll/pinch or use the overview controls to zoom up to 500%.
- Principal → frontend → backend → QA → principal development reviews; eight SEO specialist handoffs; COO-led lead and automation workflows, plus video/motion, graphic-design and social campaign handoffs.
- Real Supabase tasks, durable per-office queues, transactional events, live updates, pause, cancellation, worker pairing/revocation, heartbeat leases, and stale-attempt rejection.
- Click any teammate to inspect real task stages, waiting reasons, recent activity, saved work and streamed local-model drafts. Open work cards refresh every three seconds and disclose delayed connections. Worker RPCs retry transient transport failures within the lease window; ambiguous claims are never automatically repeated.
- CEO-only commands, RLS, immutable email snapshots, approval expiry, explicit dispatch, replay-resistant Make claims, and authenticated provider results.
- Bounded public website evidence, Ollama structured handoffs, and opt-in subscription Codex repository reviews.
- Cloudinary authenticated uploads and provider-verified media metadata when configured.

## Current boundaries

Coding roles produce **read-only repository reviews and proposed changes**. Automatic worktree edits, independent executed QA, PR creation by the worker, and production releases are not enabled. SEO has no Search Console, analytics, rank, or search-volume connection yet. Lead generation qualifies **supplied sites**; it does not discover a new lead database or send unapproved outreach. Automation produces scenario designs until an executor is configured and tested.

Make and Cloudinary remain disconnected until their server settings are provided. No email has been sent and no existing Make scenario has been altered. The one-machine worker runs a single handoff at a time. Both the local 9B model and subscription Codex produced valid handoffs in smoke tests; broader task-quality evaluations are still required. Creative roles produce text briefs and proposals; media decoding, rendering and platform publishing adapters are not yet connected.

## Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npx tsx tests/api-smoke.ts
npx tsx tests/website-smoke.ts
# Optional actual local inference; takes time and uses no paid LLM API:
npx tsx tests/model-smoke.ts
npx tsx tests/model-smoke.ts --video
# Subscription check; does not use an API key:
npx tsx tests/codex-smoke.ts
```

`tests/creative-database.sql` checks the three added workflow routes. `tests/database.sql` checks approvals, queue recovery, worker fencing, executor replays, callbacks, and tenant isolation inside a transaction that rolls back all fixtures. Run it against the named development Supabase project, not an unrelated database. CI runs deterministic tests, type checking, lint and the production build.

See [setup](docs/SETUP.md), [implementation status](docs/IMPLEMENTATION-STATUS.md), and the [audited plan](docs/PROJECT-PLAN.md).
