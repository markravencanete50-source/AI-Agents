# AI Company Office — Plan Audit

**Reviewed:** 30 September 2026. **Input:** Project plan v1 and backlog. **Output:** Project plan v2 and synchronized backlog.

## Verdict

The hybrid design is a reasonable fit for this single-owner business: Vercel hosts the interface, Supabase stores durable state, the laptop runs Codex/local models, Make connects business services, and Cloudinary handles media. The fifteen-role office remains the intended experience.

V1 was a useful architecture outline but left important execution choices open. V2 specifies missing controls, reduces early dependence on unproven model behavior, and demonstrates a real workflow before the complete office is polished.

**Planning verdict: ready for capability experiments, subject to explicit gates. Runtime verdict: unverified.** No code, account configuration, benchmark, send, deployment, or recovery test was performed in this audit.

## Findings and corrections

High priority means resolve before enabling the capability. Medium priority means include before the related milestone or routine operation. These are planning findings, not discovered vulnerabilities in an existing application.

| ID | Priority | V1 gap or ambiguity | Correction in v2 | Verification still required |
|---|---|---|---|---|
| A01 | High | A small local model owned COO planning without a bounded contract or quality threshold | Three templates, validated fields, execution limits, and clarification; evaluate before activation | Local-model cases and error review |
| A02 | High | Local Codex automation and custom-app subscription inference could be conflated | Separate access paths; make optional inference eligibility explicit | Actual SDK sign-in, quota handling, no paid fallback |
| A03 | High | Leases/cursors lacked atomic enqueue, result, and replay details | Durable queue plus application attempts, fencing, transactional events, and snapshot/catch-up | Crash windows, duplicates, stale workers, reconnects |
| A04 | High | Approval/idempotency lacked dispatch, timeout, revocation, and Make replay boundaries | Action state machine, canonical snapshots, atomic claims, non-retryable unknown outcomes | Concurrent callbacks, timeout, altered approvals, recovery |
| A05 | High | A commit could change during merge; approval records did not establish release enforcement | Final integrated commit, restricted dispatcher, staged deployment, conditional promotion, manual fallback | Account capabilities and attempted bypasses |
| A06 | High | Preview separation and direct database writes were under-specified | Isolated staging/production resources, preview access, restricted Data API/RPC writes | RLS/grants, secret boundaries, sandbox tests |
| A07 | Medium | Lead discovery/research lacked a concrete source-acquisition path | Supplied prospects/sites, bounded enrichment, explicit measurement gaps | Sources, fetching, deduplication, metric labels |
| A08 | Medium | Maintenance recurrence and missed-run handling were missing | Schedule/occurrence records, shared trigger, deduplication, coalescing | Laptop-off and missed-schedule tests |
| A09 | Medium | Full animation preceded the first business workflow | Small working office first; full fifteen-robot room next | Complete test-send workflow before expansion |
| A10 | Medium | Usability/reliability had no concrete pass conditions | Model, hardware, action, recovery, and department gates | Actual measurements and test results |
| A11 | Medium | Backup/retention lacked recovery targets and restored-action handling | Proposed retention/recovery targets; reconcile restored actions before dispatch | Database/media/local-state restore exercise |
| A12 | Medium | Infrastructure costs were not tied to environment and account-control decisions | Capability/cost inventory with explicit fallbacks | Actual entitlements and operating budget |

All twelve findings are addressed in the revised design. Implementation checks remain unstarted and are mapped to backlog items.

## Documentation checks

- Local SDK automation and subscription authentication support the proposed Codex adapter; the installed runtime remains untested. [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk), [authentication](https://learn.chatgpt.com/docs/auth).
- Custom ChatGPT plan usage has a distinct integration scope; eligibility cannot be inferred from an existing subscription. [Integration scope](https://developers.openai.com/siwc/token-sharing-open-source).
- Supabase's durable queue must be combined with application state and external-action reconciliation. [Queues](https://supabase.com/docs/guides/queues), [queue API](https://supabase.com/docs/guides/queues/api).
- Make webhook executions can overlap, requiring backend action claims. [Make webhooks](https://help.make.com/webhooks).
- Private-repository branch protection depends on the GitHub plan. [Branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- Deployment environment and promotion behavior require deliberate setup. [Vercel environments](https://vercel.com/docs/deployments/environments).
- Vercel Hobby is restricted to personal non-commercial use. [Hobby plan](https://vercel.com/docs/plans/hobby).
- Ollama documents Vulkan support, but performance on this laptop needs measurement. [Hardware support](https://docs.ollama.com/gpu).
- Google emphasizes normal SEO for its AI search features; ordinary search totals must not be presented as separate AI-only metrics. [Google AI features](https://developers.google.com/search/docs/appearance/ai-features).

The Supabase changelog was inspected. Its recent database upgrade notices concern features not assumed by this new design; implementation must still use current supported versions and migrations.

## Remaining unknowns

1. Codex SDK behavior with this subscription and intended laptop sandbox.
2. Local model quality and latency for representative business tasks.
3. Office frame performance while useful work runs.
4. Make/Gmail connection behavior and GitHub/Vercel account controls.
5. Operating budget and first client repository requirements.

These are explicit capability experiments or onboarding inputs. They cannot be marked verified by reading documentation.

## Current deliverables

- `PROJECT-PLAN.md`: authoritative v2 architecture and acceptance gates.
- `IMPLEMENTATION-BACKLOG.md`: ordered unstarted work and finding-to-task mapping.
- `PLAN-AUDIT.md`: this audit record.

Only planning documents were changed.
