# Implementation status — 30 September 2026

The audited v2 plan is the full target. This implementation delivers a working office and internal execution foundation, with external effects disabled until configured and verified. It is not certified to handle every company operation autonomously.

| Area | Implemented and checked | Remaining |
|---|---|---|
| Office | 18 articulated robots, larger room, detailed keyboards, central CEO desk, smooth bounded walking/typing/blinking, dark mode, 500% zoom, immersive room-only view, robot work-card dialogs, list fallback, reduced motion | Sustained frame-time/memory benchmark alongside inference |
| Supabase | Named project connected; migrations applied; CEO allowlist, RLS, typed RPC operations, per-office pgmq queues, transactional events and snapshots | Auth callback URLs configured; real first CEO login awaits email sender rate-limit reset or custom SMTP; separate production project and backups |
| Worker | Serial Ollama handoffs, bounded public-page retrieval, typed outputs, pairing/revocation, heartbeat, 120s leases, attempt fencing, pause/cancel, interrupted-attempt limit | Paired CEO laptop and full real workflow; quota-specific retry state |
| Models | Installed-model inventory; actual qwen3.5:9b COO handoff in 82s; actual subscription Codex repository review in 91s; invalid/out-of-scope outputs rejected | Twenty-case quality evaluation; repeat representative task evaluation |
| Development | Principal, frontend, backend, QA and principal review steps; registered local repository keys; bounded tracked-file evidence; Codex read-only adapter | Isolated worktree edits, independently executed QA, repair budgets, worker-created PRs, gated releases |
| SEO/AEO/GEO | Eight bounded role handoffs, supplied public HTML evidence, explicit source gaps | Search Console/GA4, crawl breadth, current SERP evidence, measured performance/visibility and implementation |
| Leads | Supplied-site evidence, qualification handoff, explicit-recipient outreach proposal | Lead records, deduplication, do-not-contact rules, campaign scope, proved test send |
| Approvals | Immutable message snapshot/hash, 24h expiry, approve/reject/revoke, pause-aware dispatch, unknown result handling | Non-email action types, batch approvals, deployment approvals |
| Make/Gmail | Signed dispatch, five-minute signature check, database snapshot retrieval and atomic claim, bearer-authenticated provider callback, replay rejection | Dedicated disabled scenario configuration, Gmail connection, test recipient, scenario version binding |
| Cloudinary | Workspace-scoped authenticated upload signatures and verified metadata recording | Account settings, real upload, private signed delivery, media library and retention |
| Creative | Video/motion editor, graphic designer and social manager; dedicated expertise playbooks; three workflow routes applied and database-tested | Footage decoding, transcription, actual media rendering, visual design exports, social publishing/scheduling and dated analytics |
| Operations | Explicit task states, output/error inspection and manual recovery | Scheduled maintenance, uptime monitoring, restart-on-boot, backups, alerting, approvals for activation |

Verification includes twelve deterministic auth/worker/contract tests; database rollback fixtures covering stale/missing attempts, duplicate completion, approval hashes, dispatch and executor replay, callback finality, pause and identity isolation; API checks rejecting anonymous commands, cross-origin writes and unsigned Make requests; public-site retrieval; lint, TypeScript and production build.

The smaller qwen3:0.6b initial trial produced an unusable deliverable. A first 9B trial included an out-of-role email and was rejected. Role-specific generation schemas now omit email entirely when it is unauthorized; the subsequent 9B trial produced an internal checklist with clear limitations. These tests do not establish broad agent reliability.

`IMPLEMENTATION-BACKLOG.md` preserves the original planning baseline; its unchecked boxes are not a live progress tracker. This table is the current implementation record. Do not mark the full plan gates complete based on this foundation.

Latest office extension adds three creative roles to the original 15-role planning baseline. CEO presence is tied to the authenticated session; the anonymous demo labels the CEO avatar as a preview. Immersive mode opens via the Office navigation button and exits with Escape or browser Back. Browser rendering observed roughly 17–19 ms between frames in a brief check; this is not a sustained hardware benchmark.

Codex source reviews omit the web-source field and cite repository paths in the deliverable. Unsupported generation-schema URI formats are removed, with HTTP/HTTPS source validation enforced at runtime. Native app, browser, computer, plugin, hook, shell and multi-agent capabilities are disabled for the review subprocess; configured MCP servers are disabled without exposing their credentials. The subscription authentication is reused. A review surfaced a session-response race which was addressed with identity-generation checks and clearing snapshots and pairing credentials on identity change; real two-account UI testing awaits CEO setup.

The creative inference check produced a structured qwen3.5:9b editing brief in 219 seconds on CPU, explicitly listing missing footage, transcript, brand assets and music and making no render claim. Its first 180-second attempt timed out; the optional model smoke test now allows 300 seconds. A valid schema is not a creative-quality approval: its proposed production specifications and creative hypotheses still need human review. The worker retains its existing 15-minute handoff limit.

## Marketplace leads and Excel

Lead objectives run directly on Scout. The brief supplies service / ICP context; marketplace choices, age and maximum count bound discovery. Public OLJ search results and job descriptions provide factual evidence. WWR public RSS is optional and records coverage failures. The worker respects robots exclusions and request pacing, rejects private addresses and does not log in, send outreach or require Make. Structured rows are saved with the task; the authenticated RLS-protected export route generates an XLSX with Leads and Search log worksheets. Old text-only handoffs have no workbook; create a new lead objective. Company size / startup status must be verified before counting unknown listings as confirmed ICP matches.
