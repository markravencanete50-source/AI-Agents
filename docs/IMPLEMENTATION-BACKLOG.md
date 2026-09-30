# AI Company Office — Implementation Backlog v2

**Status:** Planning only; every item is unstarted. **Audited:** 30 September 2026.

This backlog follows `PROJECT-PLAN.md` v2. `PLAN-AUDIT.md` explains the changes. Prove execution and one real workflow before polishing the complete office. All fifteen roles remain in the final scope.

## Phase 0 — Verify assumptions before the main build

- [ ] P0.1 Record the laptop environment, native Windows compatibility, and tool versions; choose a supported isolation boundary.
- [ ] P0.2 Verify Codex subscription authentication and SDK behavior in a temporary repository: sample change, streamed events, resume, cancellation, and quota/unavailable handling. Exclude separately billed API credentials.
- [ ] P0.3 Record eligibility for optional Sign in with ChatGPT inference; leave it disabled unless this topology has verified access.
- [ ] P0.4 Evaluate `qwen3.5:4b` on the 20-case screening set in plan Gate B. Save prompts, expected outputs, sources, latency, and actual results.
- [ ] P0.5 Benchmark fifteen animated robots with serial inference and QA; record frame times, peak memory, and cold/warm latency. Measure CPU and supported GPU behavior.
- [ ] P0.6 Verify project tools cannot read supervisor credentials or invoke privileged integrations. WSL2 and worktrees alone are insufficient isolation.
- [ ] P0.7 Inventory commercial Vercel hosting, Supabase environment separation, GitHub private-repository controls, Make/Gmail scopes, and Cloudinary private delivery without purchasing anything.
- [ ] P0.8 Select the first website repository, supplied lead fixture, source allowlist, test recipient, and template acceptance criteria.

**Gate:** Plan Gates A–C have evidence. Failed capabilities have an explicit reduced scope or manual fallback. Production integrations remain disabled.

## Phase 1 — Establish workflow and approval foundations

- [ ] P1.1 Create the repository/workspace packages, pin compatible dependencies, and commit the lockfile.
- [ ] P1.2 Separate staging/production configuration, data, and integration connections; specify preview access and first-deployment handling.
- [ ] P1.3 Implement Supabase Auth and trusted CEO membership with current authorization checks.
- [ ] P1.4 Define migrations for fifteen roles, projects, tasks/dependencies, jobs/runs, events, actions, approvals, attempts, and schedules.
- [ ] P1.5 Verify RLS, cross-project isolation, direct Data API writes, function grants, and backend authorization when privileged keys bypass RLS.
- [ ] P1.6 Define templates, validated contracts, tool allowlists, evidence requirements, model policies, and task/repair/time limits.
- [ ] P1.7 Implement scoped worker pairing/revocation, coordinated queue visibility and leases, fencing, heartbeats, cancellation, and global pause.
- [ ] P1.8 Use Supabase Queues behind authenticated operations. Verify atomic enqueue/state changes or implement an outbox; test duplicate delivery and result-before-ack recovery.
- [ ] P1.9 Implement transactional event history, consistent snapshots/cursors, catch-up, deduplication, and expired-cursor reload.
- [ ] P1.10 Add isolated Codex/Ollama adapters with resource limits, output validation, quota waiting, and redacted logs.
- [ ] P1.11 Implement canonical action snapshots, batch item hashes, approval/rejection/revocation, dispatch authorization, and atomic claims.
- [ ] P1.12 Implement action states, unknown-outcome reconciliation, pre-dispatch failures, and pause/revocation boundaries.
- [ ] P1.13 Add project memory, artifacts, Cloudinary upload authorization, private delivery, and retention rules.
- [ ] P1.14 Implement scheduled-occurrence deduplication, downtime coalescing, last-checked/next-due views, and one Make due-work trigger.
- [ ] P1.15 Verify interruption and negative-authorization cases before enabling external effects.

**Gate:** Plan Gates D–E pass against controlled fixtures. A scoped worker can complete an internal task but cannot approve or dispatch arbitrary actions.

## Phase 2 — Prove the first real business workflow

- [ ] P2.1 Implement template-based COO routing and clarification using the evaluated local model.
- [ ] P2.2 Import a small supplied lead list; collect bounded public evidence with rate, redirect, and private-network restrictions.
- [ ] P2.3 Store deduplication keys, sources, qualification rationale, missing data, and do-not-contact exclusions.
- [ ] P2.4 Produce grounded drafts; show recipients, body, attachments, evidence, and batch selection to the CEO.
- [ ] P2.5 Configure trusted Make/Gmail execution for a controlled test recipient; record connection health and reconnect behavior.
- [ ] P2.6 Implement authenticated delivery/callbacks, backend action retrieval, atomic dispatch claims, and scenario-version checks.
- [ ] P2.7 Test duplicate/parallel callbacks, altered payloads, expiry, revocation, send timeout, and Make replay. Unknown sends must pause for reconciliation.
- [ ] P2.8 Build a simple animated COO/lead room with task/approval panels and inactive entries for the other roles.
- [ ] P2.9 Demonstrate objective → evidence → draft → approval → test send → provider result, including worker restart and dashboard reconnect.

**Gate:** An approved test message reaches the recipient with recorded evidence. External prospect sending stays disabled until negative tests pass.

## Phase 3 — Expand to the full animated office

- [ ] P3.1 Finalize the light office style, department layout, fifteen robot identities, desk locations, and licensed assets.
- [ ] P3.2 Add optimized geometry, animation clips, movement paths, and lightweight monitor thumbnails.
- [ ] P3.3 Map actual events to typing, handoffs, QA, approval waiting, failure, and idle states.
- [ ] P3.4 Add department/project navigation and one detailed artifact/code/report/preview panel.
- [ ] P3.5 Implement HTML nameplates, keyboard access, reduced motion, responsive panels, and a complete table/list view.
- [ ] P3.6 Label Demo mode and inactive capabilities; suspend background rendering without stopping the worker.
- [ ] P3.7 Repeat Gate C with real events and representative work; reduce detail/concurrency if needed.

**Gate:** Fifteen robots accurately reflect enabled capabilities. Every CEO operation also works outside the canvas.

## Phase 4 — Deliver the development department

- [ ] P4.1 Register the first repository, tools, environments, branch policy, and acceptance criteria.
- [ ] P4.2 Configure Principal Developer planning, frontend/backend contracts, file ownership, bounded rework, and integration review.
- [ ] P4.3 Use isolated worktrees and Codex sessions; begin sequentially and enforce repository scope.
- [ ] P4.4 Run relevant build, integration, browser, accessibility, and SEO checks; bind evidence to the tested commit.
- [ ] P4.5 Create isolated previews and select the final integrated commit before approval; recheck after integration changes.
- [ ] P4.6 Implement a narrow release dispatcher with commit/configuration/migration binding, staged production deployment, conditional promotion, and result IDs.
- [ ] P4.7 Verify agents cannot publish via Git credentials, deploy hooks, CI configuration, or Vercel credentials. Use CEO-native release until account controls are verified.
- [ ] P4.8 Demonstrate two maintenance tasks, production smoke checks, and separate code/database recovery.

**Gate:** Gate F passes for engineering. All four roles produce explicit outputs; changed or unapproved candidates cannot publish automatically.

## Phase 5 — Deliver the SEO/AEO/GEO department

- [ ] P5.1 Version eight role definitions; evaluate installed skills, licenses, dependencies, and paid-extension exclusions.
- [ ] P5.2 Implement registered-site/sitemap crawling with dated URL evidence and reproducible checks.
- [ ] P5.3 Use supplied competitor URLs and authorized sources; label unavailable volume, ranking, and backlink data.
- [ ] P5.4 Add content, AEO/GEO, and schema proposals with facts and visible-page consistency checks.
- [ ] P5.5 Connect authorized GSC/GA4 where available; distinguish measured outcomes from manual AI-citation samples.
- [ ] P5.6 Implement SEO QA, development handoffs, approval-linked publication, and baseline comparisons.
- [ ] P5.7 Demonstrate two audit/improvement tasks; reject invented metrics and guaranteed-ranking claims.

**Gate:** Gate F passes for SEO. Findings are traceable and publication uses the same CEO action gate.

## Phase 6 — Deliver the automation specialist

- [ ] P6.1 Register scenario versions, allowed effects, test fixtures, and failure/recovery paths.
- [ ] P6.2 Separate authoring credentials from trusted production execution connections.
- [ ] P6.3 Prepare inspectable proposals and controlled tests; bind activation to the approved configuration.
- [ ] P6.4 Compare deployed versions and handle drift; retain manual activation where enforcement is unverified.
- [ ] P6.5 Demonstrate two scenario changes with authenticated callbacks, duplicate handling, and failure recovery.

**Gate:** Gate F passes for automation. Scenario activation does not authorize arbitrary future external actions.

## Phase 7 — Prepare for daily operation

- [ ] P7.1 Exercise sleep, restart, internet loss, expired event retention, stale leases, and uncertain external responses.
- [ ] P7.2 Verify prompt-injection boundaries, credential isolation, preview separation, revocation, and global pause end to end.
- [ ] P7.3 Establish budgets and visibility for subscription availability, local load, Make credits, storage, and delivery.
- [ ] P7.4 Demonstrate database/media/local-state recovery; restored actions start paused for reconciliation.
- [ ] P7.5 Document startup, shutdown, resume, connection renewal, credential revocation, backup, release, and rollback.
- [ ] P7.6 Run department acceptance cases; record unsupported capabilities and measured limits.

**Gate:** Operating and recovery procedures are demonstrated. No silent separately billed model fallback exists.

## Audit traceability

| Finding | Primary coverage |
|---|---|
| A01 — COO/model responsibility | P0.4, P1.6, P2.1 |
| A02 — Subscription integration | P0.2–P0.3, P1.10 |
| A03 — Queue and event recovery | P1.7–P1.9, P1.15 |
| A04 — External action recovery | P1.11–P1.12, P2.6–P2.7 |
| A05 — Release enforcement | P0.7, P4.5–P4.8 |
| A06 — Environment and data access | P0.6, P1.2–P1.5, P7.2 |
| A07 — Research and measurement | P0.8, P2.2–P2.3, P5.2–P5.5 |
| A08 — Maintenance schedules | P1.14, P7.1 |
| A09 — Scope/build order | Phases 2–3 |
| A10 — Measurable gates | Phase 0, P3.7, department gates |
| A11 — Recovery and retention | P1.13, P7.4–P7.5 |
| A12 — Cost and account capabilities | P0.7, P7.3 |

Implementation remains a separate next step. This backlog records proposed work only.
