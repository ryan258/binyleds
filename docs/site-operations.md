# Storyscape site operations

Repository status as of 2026-11-14. The Cloudflare consultation backend and
operator inbox are implemented as an optional backend for the client profile.
The active host, deployed revision, and live intake and mail behavior still
need owner confirmation. For a static demonstration, leave intake disabled.
See [hosting configuration](hosting-ci-cd-gh-pages-setup.md) for build modes
and [readiness](readiness.md) for the acceptance ledger.

## Standard Cloudflare site stack

Every Cloudflare-hosted site Ryan builds uses the same stack unless he says
otherwise:

- **Images:** a public Backblaze B2 bucket on an `images.` subdomain, proxied
  through Cloudflare.
- **Mail:** a Zoho mailbox on the site's domain that forwards to Gmail (needs a
  paid Zoho plan).
- **Contact:** the Cloudflare form (`npm run build:cloudflare`) with Turnstile,
  a honeypot field, D1 storage, and an email notification to the Zoho mailbox.
  Leave `INTAKE_CONTACT_EMAIL` unset to keep the address off the public site;
  error messages then ask the visitor to retry instead of pointing to an email.

## November 21 handoff plan

**Target: Saturday, November 21, 2026.** TJ bought `thestoryscape.com` through
Squarespace. Move DNS to TJ's Cloudflare account for the Pages site and the
proposed `tj@thestoryscape.com` Zoho mailbox. Transfer the registration only
after the site and mailbox work. Confirm the address and launch scope with TJ.
Current DNS, mailbox, and deployment status still need verification.

| TJ owns | Ryan helps with |
| --- | --- |
| Registrar login, domain registration and renewals, and approval of nameserver changes | Inventory current records and prepare the website DNS changes |
| Cloudflare account, DNS zone, Pages project, any R2 bucket, and billing | Build and upload the standalone client site using his own invited login |
| Zoho Mail organization, mailbox, subscription, and recovery | Supply the setup steps and verify the website uses the approved address |
| Public site content, inquiry access and retention, and ongoing mailbox checks | Prepare the handoff and show TJ how to recover a saved inquiry if the form launches |

### Prepare before November 21

- [ ] **Confirm access.** TJ uses an existing email for signup and recovery,
  keeps MFA recovery codes, and invites Ryan under his own Cloudflare login.
  TJ handles registrar and billing actions and confirms the Zoho plan.
  [Cloudflare member roles](https://developers.cloudflare.com/fundamentals/manage-members/roles/)
  · [Zoho plans](https://www.zoho.com/mail/help/adminconsole/subscription.html)
- [ ] **Prepare DNS and Pages.** Add the domain and create a Pages **Direct
  Upload** project in TJ's Cloudflare account. Compare imported DNS with Squarespace's records,
  especially any existing website or email records. Save the original records
  and, if a site is live, its known-good deployment for rollback. If DNSSEC is
  active, disable it at Squarespace ahead of the switch and allow the old DS
  record to clear.
  [Cloudflare DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [ ] **Rehearse the launch.** Review the [standalone client export](#build-the-standalone-upload)
  and test it in a Pages preview when authorized. TJ receives the built site
  and its third-party notices. Ryan keeps the Hugo workshop and Git repository
  and can generate a new export for future updates.

### Cutover checklist

- [ ] **Switch nameservers.** TJ opens **Squarespace → Domains →
  thestoryscape.com → DNS → Domain Nameservers → Use Custom Nameservers** and
  enters the two assigned Cloudflare nameservers. Wait for the Cloudflare zone
  to show **Active**. Squarespace allows up to 48 hours for the change.
  [Squarespace nameserver steps](https://support.squarespace.com/hc/en-us/articles/4404183898125-Review-change-or-reset-your-domain-s-nameservers)
- [ ] **Connect Zoho.** In Zoho Admin Console, add the domain, verify it using
  the TXT record in Cloudflare DNS, and create `tj@thestoryscape.com`. Use
  Zoho's exact MX, SPF, and DKIM values. Reconcile existing SPF and DMARC
  records and recreate any existing mailboxes or aliases before switching MX.
  Keep Cloudflare inbound Email Routing off on the main domain. Send a message
  from an outside account and reply from Zoho. To forward the mailbox to
  Gmail, TJ needs a paid Zoho plan such as Mail Lite: Zoho's help says new
  Free-plan accounts don't include forwarding. Set the forward in Zoho's
  **Settings → Email Forwarding**, confirm it from Gmail, and send another test.
  [Zoho email forwarding](https://www.zoho.com/mail/help/email-forwarding.html)
  [Zoho domain setup](https://www.zoho.com/mail/how-to/setup-my-domain-with-zoho-mail.html)
  · [Cloudflare email DNS](https://developers.cloudflare.com/email-service/configuration/domains/)
- [ ] **Connect Pages.** Upload the [production ZIP](#build-the-standalone-upload)
  in TJ's Pages project once the contact address is verified. Open **Custom
  domains** and add
  `thestoryscape.com`. Verify HTTPS, canonical URLs, redirects, and the public
  email link.
  [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

### After the site and Zoho mail work

- [ ] **Add the Backblaze B2 image host.** The bundled images launch with
  Pages. For the image library, TJ creates a public B2 bucket under their
  billing and serves it as `images.thestoryscape.com` through a proxied
  Cloudflare DNS record, following Backblaze's Cloudflare setup guide. Egress
  from B2 to Cloudflare is free under the Bandwidth Alliance. Upload one public
  image and verify its HTTPS URL. Moving site references to that host is a
  separate code change: the templates use bundled paths, and the CSP `img-src`
  must add the image host.
  [Backblaze and Cloudflare](https://www.backblaze.com/blog/backblaze-and-cloudflare-partner-to-provide-free-data-transfer/)
- [ ] **Transfer registration to Cloudflare Registrar.** Once the site and
  mail pass their checks and the Cloudflare zone is active, TJ checks domain
  eligibility. A recent registration or transfer can impose a 60-day lock.
  When eligible, TJ unlocks the domain in Squarespace, requests the transfer
  code, and enters it privately in their own Cloudflare account. TJ approves
  the transfer charge, checks renewal and payment settings after completion,
  and rechecks HTTPS and mail.
  [Squarespace transfer steps](https://support.squarespace.com/hc/en-us/articles/205812338-Transfer-a-domain-away-from-Squarespace)
  · [Cloudflare transfer requirements](https://developers.cloudflare.com/registrar/get-started/transfer-domain-to-cloudflare/)
- [ ] **Close the handoff.** TJ confirms access to the site, mailbox, and
  billing from their own login. Hand over the generated site, third-party
  notices, and deployment and rollback references, then remove Ryan's
  temporary access when the move is accepted.

### Build the standalone upload

Run this from the repository root.

```sh
npm run export:tj
```

The command creates `.local/handoff/thestoryscape-pages.zip` with `index.html`
at the archive root. It builds for `https://thestoryscape.com/` with
`tj@thestoryscape.com` as the contact address and keeps HTML, CSS, and
JavaScript readable. It checks the exact build inventory and includes only the
client site and the three third-party license notices. A successful run replaces
the previous ZIP. Keep a copy of the deployed ZIP for rollback.

Once the mailbox works and TJ has reviewed the public contact copy, drag the
ZIP directly into TJ's Pages **Direct Upload** project. Check the rights for
any included artwork before external use. [Reuse policy](../REUSE.md) ·
[Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

The static build displays an email contact and leaves the form disabled.
If TJ wants online form submissions later, prepare a separate Functions package
with its own bindings and verification. A Direct Upload project can use
Wrangler for that package. Git integration would require a new Pages project.

## Daily use and recovery

In Cloudflare mode, a successful consultation request returns a receipt after
D1 saves the validated inquiry. A separate background attempt sends a short
notification to the configured operator mailbox through the Cloudflare Email
Service REST API. Reply-To points to the client. The notification omits vision
and accommodation notes. Review complete inquiries in the authenticated CLI
below or the private D1 dashboard.

If the visitor loses the response, the same request ID and payload can be retried
without creating another inquiry. Session storage keeps the request ID and a
payload hash. Keep the page open to preserve the fields, or download a private
draft and restore it after a reload. The downloaded draft contains personal
data. It can only be restored against the same privacy notice version.
The form checks for a matching UUID in the server response before sending
the visitor to the next-steps page. If storage is blocked, keep the page open
or download a draft to preserve the request ID. If the original send is
unconfirmed, retry with its original details after verification, resolve it
through the contact address, or deliberately start a separate request. The
Cloudflare form uses JavaScript. The public contact address is the fallback.

From the repository root, load the target HTTPS `INTAKE_ORIGIN` and matching
`OPERATOR_TOKEN` through your private shell or secret manager.

```sh
npm run inbox -- i       # List up to 50 open inquiries
npm run inbox -- r 1     # Read inquiry 1 from that list
npm run inbox -- c 1     # Mark contacted AFTER you actually replied
npm run inbox -- i       # Refresh revisions after a status change
npm run inbox -- x 1     # Close the selected inquiry
npm run inbox -- n 1     # Retry its operator notification; can send email
```

Use `alias bi='npm run inbox --'` to shorten these commands to `bi i` or `bi r 1`.
The CLI caches IDs and revisions by origin in ignored `.local/` for 15 minutes.
List and read commands print private data in the terminal. `i closed` and `i all`
select other views. `i all 50` requests the next page of the all-inquiries view.
Refresh the list before changing status again. The inbox checks the revision
and rejects edits to closed records. Send client replies from your mail client
before marking an inquiry contacted.

The inbox list includes notification status and a stable error code when
available. To look for unfinished delivery across all inquiries, query the
matching D1 database.

```sql
SELECT id, created_at, notification_status, notification_attempts, notification_error
FROM consultations
WHERE purged_at IS NULL
  AND (
    notification_status IN ('pending', 'failed')
    OR (notification_status = 'sending' AND notification_lease_until < unixepoch() * 1000)
  )
ORDER BY created_at;
```

To retry ONE listed inquiry, set `INTAKE_ORIGIN` to the intended HTTPS site and
load `OPERATOR_TOKEN` from your secret manager into the shell environment, then:

```sh
npm run retry:notification -- INQUIRY_UUID
```

Use this command when you intend to send the operator notification.
`/api/notifications` handles retries and `/api/inbox` handles list, read, and
status updates. Both require the bearer token and a matching environment marker.
The delivery lease lasts 60 seconds and mail API requests time out after 10
seconds. `accepted` records that the provider reported delivery or queueing.
Confirm placement in the actual mailbox. Recovery skips accepted rows. If the
provider accepts mail before the status write fails, recovery can send a
duplicate after the lease expires. Match duplicates by inquiry ID.

## Site decisions still needed before launch

- Confirm `thestoryscape.com` and, if there is an active site, its registrar/DNS
  account, host, and known-good deployment ID. `hugo.yaml` still uses a
  placeholder base URL for the exemplar.
- Public contact address, verified notification sender, verified operator
  recipient, and a distinct verified preview recipient.
- Real Turnstile widgets for production and deployed preview hostnames.
- Separate D1 database IDs for production and preview, and mail API credentials.
- TJ's Zoho mailbox and authenticated From identity for human replies.
  Cloudflare Email Service handles application notifications separately.
- Retention duration and closure policy. Any purge is an operator decision.

Confirm provider eligibility, cost, sender validation, and delivery in the
actual account before enabling notifications.

## Build modes

Default builds and the GitHub Pages mirror disable intake. Netlify production
selects Netlify Forms and requires a fallback address. Netlify previews and
branch deploys disable intake. `npm run build:cloudflare` uses the client
profile, excludes the internal brand guide, and runs source and output checks.
Configure these values for the Cloudflare build.

| Variable | Production | Preview/local |
| --- | --- | --- |
| `HUGO_VERSION` | `0.164.0` Extended in hosted build | Same pinned version |
| `NODE_VERSION` | `22` (22.13+) | Same for hosted preview, Node 22.13+ locally |
| `INTAKE_ENV` | `production` | `preview` or loopback-only `local` |
| `PRODUCTION_URL` | Actual custom-domain HTTPS origin | Unused |
| `CF_PAGES_URL` | Unused | Deployment HTTPS origin or loopback for local |
| `TURNSTILE_SITE_KEY` | Real production site key | Real preview site key or local dummy key |
| `INTAKE_CONTACT_EMAIL` | Optional public contact (omit to hide) | Optional test contact (omit to hide) |
| `CONSENT_VERSION` | `cloudflare-intake-v1` after notice review | Must match runtime value |

The proposed Cloudflare Pages build command installs or reuses the pinned
native Dart Sass, runs the local site and intake checks, then builds the
Cloudflare output. It runs independently of the GitHub Actions validation job.

```sh
bash scripts/with-dart-sass.sh bash -e -c '
  bash scripts/check.sh
  npm run test:intake
  npm run build:cloudflare
'
```

Set the Pages output directory to `public`. The wrapper treats Hugo warnings
as failures and cleans the output destination. Production uses the custom
domain. Preview uses its deployment origin with noindex and no sitemap.

## Runtime configuration and local preview

`wrangler.local.jsonc` uses a zero database ID, loopback hostnames, and a public
dummy Turnstile secret. Use it only for local Wrangler commands. Record the
Wrangler version used for any release verification.

For local preview from the repository root, with Wrangler installed:

```sh
wrangler d1 migrations apply DB --local --config wrangler.local.jsonc
wrangler d1 execute DB --local --config wrangler.local.jsonc --command "INSERT OR IGNORE INTO intake_environment (singleton, environment) VALUES (1, 'local'); SELECT environment FROM intake_environment;"
INTAKE_ENV=local CF_PAGES_URL=http://localhost:8788 \
  INTAKE_CONTACT_EMAIL=test@example.com CONSENT_VERSION=cloudflare-intake-v1 \
  TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build:cloudflare
wrangler pages dev public --config wrangler.local.jsonc
```

Local mode calls Cloudflare's verification endpoint with the dummy token.
Local notifications record `failed/mail_configuration` and skip sending.
Use Wrangler D1 commands to inspect local rows. The operator CLI requires HTTPS
and the local fixture omits an operator token. For offline checks, run
`npm run test:intake`. The suite uses stubbed provider calls and in-memory
SQLite.

Configure independent Pages Production and Preview bindings in the dashboard.

| Runtime binding/variable | Purpose |
| --- | --- |
| `DB` | Corresponding D1 database, initialized with all three migrations and its matching environment marker |
| `INTAKE_ENV` | Explicit `production` or `preview`, matching the database marker |
| `TURNSTILE_HOSTNAMES` | Comma-separated exact site hostnames, no schemes or wildcard |
| `CONSENT_VERSION` | Same reviewed notice version as the form |
| `TURNSTILE_SECRET_KEY` | Secret for the corresponding real widget |
| `CF_ACCOUNT_ID` | Cloudflare account ID, 32 hexadecimal characters |
| `EMAIL_API_TOKEN` | Secret scoped to email sending in that account |
| `NOTIFICATION_FROM` | Fixed verified sender address |
| `NOTIFICATION_TO` | Verified operator destination; preview uses a test destination |
| `OPERATOR_TOKEN` | Separate random secret for each environment, at least 32 characters, for inbox and retry |

Keep secrets in the runtime environment. Missing intake security settings
block requests. Mail configuration failures preserve the inquiry for recovery.
Production and preview require real Turnstile keys. Set each widget's allowed
hostnames to the intended environment. The client sets the action to
`consultation`, and the worker checks it and the verified hostname on deployed
requests. Redeploy after binding changes.

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

Set Pages runtime bindings in the dashboard. Before an authorized remote
migration, check that the CLI config identifies the intended database.

```sh
wrangler d1 migrations apply DB --remote --config wrangler.production.jsonc
```

After applying migrations to the intended database, initialize its environment
marker once. Use this SQL for the production database.

```sql
INSERT INTO intake_environment (singleton, environment) VALUES (1, 'production');
SELECT environment FROM intake_environment WHERE singleton = 1;
```

Use `preview` in the separate preview database. SQLite triggers prevent changes
to an existing marker. Resolve a mismatch by correcting the binding. A database
at migration 0001 needs both 0002 and 0003 before serving this code. The local
`INSERT OR IGNORE` is repeatable. Confirm it returns `local`.

Migration 0003 rebuilds the consultation table and copies every existing column,
including notification and lead metadata. It replaces the two-guest minimum with
a positive-integer requirement. Confirm service capacity with the client. Back
up before an authorized remote migration and verify the migration on an isolated
copy first.

## Leads, retention, and recovery

Notifications and lead lifecycle are separate. Use the inbox to record contacted
or closed status; it updates timestamps and revisions together. Direct SQL changes
must also increment `operator_revision` to invalidate cached selectors. Reopening
is intentionally absent from the CLI; any future reopening workflow must clear
`closed_at` and preserve an auditable reason.

Retention duration remains an owner decision. Once approved, preview eligible
IDs with `lead_status = 'closed' AND closed_at < datetime('now', '-90 days')`
if the chosen duration is 90 days. Never substitute `created_at` or purge an open
lead. A targeted purge should clear approved fields, set `purged_at`, and retain
only the minimal receipt/delivery metadata needed by the approved policy. Purged
records cannot generate new notifications. No automatic destructive procedure
is installed. Include mailbox copies, exports, logs, and backups in the
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

1. Resolve the site decisions above and approve the public privacy copy and
   operator maintenance expectations. If there is a live host, keep it serving
   traffic during preparation.
2. Initialize isolated preview D1; configure real preview Turnstile and test
   notification destination. Verify browser errors, refresh/retry, Reply-To,
   database persistence, and manual notification recovery.
3. Record existing DNS records, nameservers, DNSSEC/registrar DS state, and
   the known-good deployment on the current host. If the current host is
   Netlify, record the Forms settings and automatic deploy configuration so
   rollback restores a working form.
4. Configure Cloudflare DNS and Zoho in a sequence that keeps the existing
   origin and mail working. Reconcile SPF for each sending name; verify
   MX, DKIM, and DMARC. Coordinate DNSSEC DS records if nameservers change.
5. Check that Zoho receives mail at the public address and sends with the
   intended From identity. If the app sends notifications, confirm their
   Reply-To directs a human reply to the inquiry sender.
6. Bind production D1 and secrets, apply the migration, build with the production
   custom domain, then perform the explicitly authorized production cutover.
7. Submit one authorized live test inquiry. Verify D1, inbox receipt, authentication
   headers, replies, CSP, redirects, canonical URLs, and preview isolation.
8. If rollback is needed, restore the recorded deployment and required DNS
   records. Allow for propagation. Preserve D1 with its migrated schema and
   retain access to inquiries on both hosts.

## Verification record

For a release check, the owner can run the full local gate on the pinned
toolchain.

```sh
npm run test:all
```

This runs source checks, production and preview output audits, module checks,
audit regressions, SQLite and provider mock tests, browser script harness
tests, and fixture builds for supported hosting modes. The October 5 review
used Hugo Extended 0.166.0. Verify the current source at the hosted pin of
0.164.0 before release, and record the source revision and tool versions with
the result. See the [October 5 review](project-review-2026-10-05.md) for the
historical results.

Open acceptance work includes the Wrangler runtime, deployed environment
bindings, Turnstile challenge and token expiry, mailbox placement and Reply-To,
browser draft restore, off-device backup restore, and rollback. Track those
results in the [readiness ledger](readiness.md).

Provider contract references:
[Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/),
[Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Turnstile test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
[Email REST contract](https://developers.cloudflare.com/api/resources/email_sending/methods/send/).
