# Connecting your office

## Supabase

Project: `jgracyggqqdgqkhojzqg`. The migration files in `supabase/migrations` have been applied. Do not rerun `schema.sql` against the existing project. That file is a readable initial schema reference; migrations, including subsequent integration changes, are authoritative.

The public browser needs the project URL and **publishable** key only. No service-role credential is used anywhere in this application. The executor and worker have different revocable, database-scoped credentials. Neither can approve an action.

An administrator must configure the sole CEO email in the private settings table. This value is intentionally absent from the repository:

```sql
update app_private.settings
set value = 'YOUR_CEO_EMAIL'
where key = 'ceo_email';
```

Supabase Auth should allow email sign-in. Configure the Site URL and exact permitted callback URLs in Authentication → URL Configuration, including `http://127.0.0.1:3000/auth/callback` for local work and the verified deployment origin plus `/auth/callback` for hosted work. Do not add a blanket wildcard for all Vercel deployments. The app supports PKCE magic links and email OTP codes. If using codes, the email template must contain `{{ .Token }}`. The first login needs you to use the sign-in email; the agent should not impersonate your CEO session.

The database CEO allowlist prevents other signed-in identities from creating a company. RLS hides all company records from other identities. Realtime only publishes office events, and a snapshot refresh reconciles missed events every 15 seconds. This is not a complete event-sourced replay service or schedule engine.

## Local worker

Install/login to Codex using your ChatGPT subscription and keep Ollama running. No OpenAI API key is required or inherited by the Codex subprocess. Use your existing `qwen3.5:9b` model. Do not use the 0.6B model for business work: its first trial produced no usable deliverable.

Copy the worker example to `.env`, enter public Supabase settings, and paste the token generated in Office Settings. It is shown once; pair again if lost, then revoke the old laptop. The token is stored hashed in Supabase and stays outside prompts and GitHub.

Run `npm run worker:check`, then `npm run worker`. One handoff runs at a time, with a 15-minute limit. A heartbeat renews a 120-second lease every 30 seconds. An interrupted attempt becomes claimable after expiry; only the newest attempt can complete. Three interrupted attempts stop the task for review. Global pause blocks new claims and heartbeats. Worker revocation blocks all further requests.

For coding reviews, set `OFFICE_CODEX_ENABLED=true` only after subscription authentication is verified. Set `OFFICE_REPOSITORIES` to a JSON map such as `{"company-website":"C:/work/company-website"}`. Use that key in a development objective. The worker reads a bounded set of tracked source files, excludes likely credential files, and submits the evidence to a read-only Codex turn. Shell tools, connected apps, browser/computer actions, plugins, hooks, multi-agent tools, configured MCP servers and external searches are disabled. This mode proposes changes; it does not modify or deploy the project. It is not an approved isolation boundary for arbitrary executable project tools.

## Make + Gmail

Create a **new disabled scenario** dedicated to Orbit. Do not modify an existing company scenario. The intended flow is:

1. Custom webhook receives the raw JSON body and `x-office-signature` header.
2. HTTP POST the **unchanged raw body** and the signature to `/api/make/verify` at the hosted office origin.
3. Continue only for a successful response. Map recipient, subject and body from the returned **verified snapshot**, never from the original webhook payload.
4. Gmail sends the verified message using your selected Gmail connection.
5. HTTP POST `{ "id": "...", "hash": "...", "provider_id": "GMAIL_MESSAGE_ID" }` to `/api/make/result` with `Authorization: Bearer MAKE_CALLBACK_SECRET`.

Pair an executor from Office Settings. Store its one-time token as `MAKE_EXECUTOR_TOKEN` in Vercel. Generate separate strong random values for `MAKE_SIGNING_SECRET` and `MAKE_CALLBACK_SECRET`; the signing key belongs only on the office server, while the callback credential is also stored securely in the dedicated Make scenario. Set `MAKE_WEBHOOK_URL` to the new scenario's HTTPS `hook.euN.make.com` or `hook.usN.make.com` endpoint.

The webhook signature expires after five minutes. Database claiming checks the current approval, exact snapshot hash, workspace and pause state, then changes dispatching → executing atomically. A repeated verification is denied. The callback cannot create a new action or approve anything. Approval expires after 24 hours. Verify the whole flow with your own test recipient before activating it. Do not enable Make automatic retries on the Gmail send module. A timeout or missing result needs a Gmail/Make inspection and reconciliation; do not resend blindly. The app cannot undo an email once Gmail accepts it.

A Vercel-protected preview cannot receive calls from Make without an explicitly authorized access arrangement. Use an approved stable deployment origin and keep the scenario disabled until its verification and callback endpoints are reachable. Do not disable deployment protection or embed a bypass credential in a public blueprint.

These are integration contracts and server endpoints. A live Make scenario, Gmail OAuth connection, secure scenario settings and a test send are still required. There is no scenario-version enforcement or campaign suppression database yet; keep prospect campaigns disabled.

## Cloudinary

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` as server environment variables. Do not create an unsigned public upload preset. The office signs uploads scoped to its workspace folder with `type=authenticated`, uploads directly to Cloudinary, verifies the resulting resource through the authenticated Admin API, and records metadata in Supabase.

Private delivery URLs, a media-library screen, retention automation, usage budgets and deletion approvals are not implemented. A Cloudinary subscription/free tier does not imply unlimited storage or transformations. Do not put private client documents in a public delivery configuration.

## Vercel and GitHub

The monorepo uses root `vercel.json`: Next.js framework, `npm ci`, `npm run build`, output `apps/web/.next`. Only the browser application deploys; the worker runs on your laptop. Use Node 24 LTS. Public Supabase values must be set at build time. Other integration values are server-only.

The repository's default `main` initially contains the README; the implementation is on `codex/office-foundation` for review. Preview hosting verifies the application. Production execution must stay gated while remaining plan checks are incomplete. Do not grant the local worker GitHub merge, production Vercel or Supabase administrator credentials.
