# Storyscape site operations

Status: local Cloudflare migration implementation, not a deployed service.
The exploratory `site-peripheral-plan.md` is retained unchanged as historical
input; this document describes the implementation and remaining launch decisions.

## Daily use and recovery

The visitor sends a consultation request. Success means D1 has saved the complete
validated inquiry. A separate background attempt sends a short notification to
the verified operator mailbox through Cloudflare Email Service. Reply-To points
to the client. Vision and accommodation notes stay in D1, out of notification
email. Gmail is the daily inbox; full inquiry review currently uses the private
D1 dashboard. There is no admin UI or unattended retry scheduler.

If the visitor loses the response, the same request ID and payload can be retried
without creating another inquiry. Only the ID and a payload hash are kept in
session storage, never the form contents. Keep the page open to preserve notes.
If storage is blocked, the page explains that reload loses the request ID.
Changed content after uncertain submission requires resolving the earlier send
or intentionally starting a separate request. JavaScript is required for this
intake; the configured public contact email provides the alternative.

Check pending/failed notifications whenever checking inquiries (at least daily
while actively accepting them). In the correct D1 database:

```sql
SELECT id, created_at, notification_status, notification_attempts, notification_error
FROM consultations
WHERE notification_status IN ('pending', 'failed')
   OR (notification_status = 'sending' AND notification_lease_until < unixepoch() * 1000)
ORDER BY created_at;
```

To retry ONE listed inquiry, set `INTAKE_ORIGIN` to the intended HTTPS site and
load `OPERATOR_TOKEN` from your secret manager into the shell environment, then:

```sh
npm run retry:notification -- INQUIRY_UUID
```

This sends external mail. Do not run it as a diagnostic without intent to send.
It authenticates to `/api/notifications`; it cannot list/read private records.
The delivery lease lasts 60 seconds; provider requests time out after 10 seconds.
`accepted` means the provider delivered or queued the recipient, not proof of
inbox placement. Already accepted inquiries are not resent. A send that succeeds
before its database acknowledgment fails may be repeated after lease recovery;
the stable inquiry ID identifies such duplicates. No exactly-once claim is made.

## Site decisions still needed before launch

- Actual production domain, current registrar/DNS account, and known-good Netlify
  deployment ID. `hugo.yaml` still correctly contains its placeholder base URL.
- Public contact address, verified notification sender, verified Gmail recipient,
  and a distinct verified preview recipient. No addresses have been invented.
- Real Turnstile widgets for production and deployed preview hostnames.
- Separate D1 database IDs for production and preview, and mail API credentials.
- Gmail outbound SMTP provider and authenticated sender identity. The application
  notification transport is Cloudflare Email Service; it is not Gmail SMTP setup.
- Approval of retention duration and closure policy. No purge job is enabled.

Cloudflare documents free sending to verified destination addresses on any plan.
This implementation sends only to the configured operator, never a client
autoresponse. Arbitrary-recipient sending requires a paid plan. Confirm account
eligibility and destination verification before enabling production. Source
checked 2026-09-19: [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/).

## Build modes

Existing Netlify builds remain unchanged. The static GitHub mirror retains its
warning and has a disabled submit button. Only `npm run build:cloudflare` opts
into the new markup and provider-specific privacy text. Cloudflare builds need:

| Variable | Production | Preview/local |
| --- | --- | --- |
| `HUGO_VERSION` | `0.164.0` Extended in hosted build | Same pinned version |
| `NODE_VERSION` | `22` | `22` (22.13+ for SQLite tests) |
| `INTAKE_ENV` | `production` | `preview` or loopback-only `local` |
| `PRODUCTION_URL` | Actual custom-domain HTTPS origin | Unused |
| `CF_PAGES_URL` | Not used as canonical domain | Current deployment origin; loopback for local |
| `TURNSTILE_SITE_KEY` | Real production sitekey | Real preview sitekey; dummy key only locally |
| `INTAKE_CONTACT_EMAIL` | Actual public contact | Actual test contact |
| `CONSENT_VERSION` | `cloudflare-intake-v1` after notice review | Must match runtime value |

Keep GitHub's build-and-validation check required before merging. Native Pages
Git builds do not wait for an unrelated Actions job. The proposed Pages build
command runs the same existing release gate, then intake tests, then the build:

```sh
bash scripts/check.sh && npm run test:intake && npm run build:cloudflare
```

Output is `public`. Production uses the actual custom domain, preview uses its
deployment URL and noindex/no sitemap. Both retain warning failures and clean
output. Analytics is not enabled; its CSP origins must be added if chosen later.

## Runtime configuration and local preview

`wrangler.local.jsonc` is LOCAL ONLY, with a zero database ID, loopback hostnames,
and Cloudflare's public dummy Turnstile secret. No real credentials are checked in.
It must never be used for remote migrations or deployment. Wrangler is an operator
prerequisite; use an installed, reviewed version and record it at cutover.

For local preview from the repository root, with Wrangler installed:

```sh
wrangler d1 migrations apply DB --local --config wrangler.local.jsonc
INTAKE_ENV=local CF_PAGES_URL=http://localhost:8788 \
  INTAKE_CONTACT_EMAIL=test@example.com CONSENT_VERSION=cloudflare-intake-v1 \
  TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build:cloudflare
wrangler pages dev public --config wrangler.local.jsonc
```

Local mode still verifies the dummy token with Cloudflare's test API; it does not
send mail. Local notifications become `failed/mail_configuration` by design.
For fully offline behavior checks, run `npm run test:intake`; provider calls are
stubbed and SQL is executed against isolated in-memory SQLite.

Configure Pages Production and Preview bindings independently in the dashboard:

| Runtime binding/variable | Purpose |
| --- | --- |
| `DB` | Corresponding D1 database, initialized with `migrations/0001_consultations.sql` |
| `INTAKE_ENV` | Explicit `production` or `preview`; not inferred from Hugo |
| `TURNSTILE_HOSTNAMES` | Comma-separated exact site hostnames, no schemes or wildcard |
| `CONSENT_VERSION` | Same reviewed notice version as the form |
| `TURNSTILE_SECRET_KEY` | Secret for the corresponding real widget |
| `CF_ACCOUNT_ID` | Cloudflare account ID, 32 hexadecimal characters |
| `EMAIL_API_TOKEN` | Secret scoped to email sending in that account |
| `NOTIFICATION_FROM` | Fixed verified sender address |
| `NOTIFICATION_TO` | Verified operator destination; preview uses a test destination |
| `OPERATOR_TOKEN` | Independent random secret of at least 32 characters for manual retry |

Never put secrets in Hugo params or static files. Missing intake security settings
fail closed; mail configuration failures preserve the inquiry for recovery. Test
keys are rejected in deployed environments. Provision a dedicated real preview
widget with the exact preview hostname and set its expected action to
`consultation` in the client/server contract. Redeploy after binding changes.

For remote CLI administration, create a separate ignored `wrangler.production.jsonc`
(and `wrangler.preview.jsonc`) containing the actual database identity, for example:

```json
{
  "name": "storyscape-production-operations",
  "d1_databases": [{
    "binding": "DB",
    "database_name": "ACTUAL_DATABASE_NAME",
    "database_id": "ACTUAL_DATABASE_UUID",
    "migrations_dir": "migrations"
  }]
}
```

These CLI files are not the source of Pages dashboard runtime configuration.
Check the target identity before an authorized remote migration:

```sh
wrangler d1 migrations apply DB --remote --config wrangler.production.jsonc
```

## Leads, retention, and recovery

Notifications and lead lifecycle are separate. Find uncontacted inquiries with
`WHERE lead_status = 'new'`. After contacting a client, update that exact ID to
`lead_status = 'contacted', contacted_at = CURRENT_TIMESTAMP`. On closure, set
`lead_status = 'closed', closed_at = CURRENT_TIMESTAMP`. Reopening must clear
`closed_at` because the schema enforces consistent closure state.

Retention duration remains an owner decision. Once approved, preview eligible
IDs with `lead_status = 'closed' AND closed_at < datetime('now', '-90 days')`
if the chosen duration is 90 days. Never substitute `created_at` or purge an open
lead. A targeted purge should clear approved fields, set `purged_at`, and retain
only the minimal receipt/delivery metadata needed by the approved policy. Purged
records cannot generate new notifications. No automatic destructive procedure
is installed. Include Gmail contact metadata, exports, logs, and backups in the
policy; delete sensitive copies consistently and respect that policy on restore.

For an authorized production backup, create the ignored `inquiries-exports`
directory with private permissions and use an explicit remote target:

```sh
umask 077
mkdir -p inquiries-exports
wrangler d1 export DB --remote --config wrangler.production.jsonc \
  --output inquiries-exports/consultations.sql
```

Treat the export as sensitive. Store it in an owner-approved independent location.
Restore into a separate scratch database and compare inquiry IDs, counts, and
sampled field values before claiming recovery verified. JSON query output is
available through `d1 execute --json`; do not use an unsupported `--csv` flag.

## Cutover and rollback checklist

1. Resolve the site decisions above; approve public privacy copy and operator
   maintenance expectations. Keep the existing host serving traffic.
2. Initialize isolated preview D1; configure real preview Turnstile and test
   notification destination. Verify browser errors, refresh/retry, Reply-To,
   database persistence, and manual notification recovery.
3. Record all existing DNS records, nameservers, DNSSEC/registrar DS state, and
   the known-good Netlify deployment. Preserve its form capture and automatic
   deploy settings so rollback cannot accidentally serve migrated markup.
4. Configure Cloudflare DNS/email prerequisites in a sequence that keeps the
   existing origin working. Reconcile one SPF record with the chosen senders;
   verify DKIM/DMARC and inbound forwarding. Coordinate DNSSEC DS records.
5. Configure Gmail's outbound relay separately. Test From identity when replying
   to a notification as well as the client's Reply-To destination. Do not assume
   “reply from the address the message was sent to” chooses the business alias.
6. Bind production D1 and secrets, apply the migration, build with the production
   custom domain, then perform the explicitly authorized production cutover.
7. Submit one authorized live test inquiry. Verify D1, inbox receipt, authentication
   headers, replies, CSP, redirects, canonical URLs, and preview isolation.
8. If rollback is needed, restore the recorded Netlify deployment and required DNS
   records. Allow for propagation. Keep D1 and both inquiry sources available;
   do not delete the new database or roll its schema backward.

## Verification record

Local tests use Node 22's experimental SQLite module and mocked provider responses;
the browser-script tests use a DOM harness. A separate in-app browser smoke check
confirmed the delayed-widget timeout, visible retry action, and preservation of
typed notes while retrying verification on a loopback static preview. It did not
complete a live Turnstile challenge or submit to a deployed backend. Hosting checks
build all four relevant modes and inspect generated output. Local Hugo is 0.166.0
Extended; the hosted pin remains 0.164.0 and needs CI confirmation at that version.
Wrangler runtime, actual Turnstile behavior, mailbox delivery, DNS, off-device
restore, and production rollback remain external acceptance work.

Focused checks: `npm run test:intake` and `npm run test:hosting`.
At implementation review: 40 focused intake/frontend tests passed, all four
hosting mode checks passed, and `git diff --check` passed.
The existing full suite remains `npm run check`; run it locally before release.

Provider references checked 2026-09-19:
[Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/),
[build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/),
[Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
[Email REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/),
[email builder fields](https://developers.cloudflare.com/email-service/examples/email-sending/),
[D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/).
