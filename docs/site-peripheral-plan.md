# Cloudflare-Centered Free-Tier Operations: Consultation Intake, Hosting, and Email Architecture

This document defines the operational architecture, risk boundaries, and
implementation specification for migrating this site's peripheral services to a
Cloudflare-centered stack with personal Gmail as the operator inbox.

It replaces the initial high-level exploratory draft with a hardened contract
centered on durable inquiry capture, explicit failure boundaries, strict input
validation, and practical day-2 operations.

---

## 1. System Boundaries & Provider Responsibilities

Operating a static site with an active consultation intake without paying for
managed form SaaS requires accepting operational responsibility for validation,
spam defense, database durability, notification delivery, and data retention.

The architecture relies on five distinct providers, each with defined roles:

```
[Domain Registrar] ──▶ [Cloudflare DNS / Edge / Pages / D1] ──▶ [SMTP Relay (Brevo / SMTP2GO)]
                             │                                           │
                             ▼                                           ▼
                      [GitHub Repo]                             [Personal Gmail Inbox]
                    (Builds & Source)                          (Operator Reading & Reply)
```

| Component | Provider / System | Responsibility & Free-Tier Boundary | Failure Mode & Recovery |
|---|---|---|---|
| **Domain Registration** | Existing Registrar | DNS delegation (annual domain registration fee applies). | Expired domain halts all traffic; keep registrar auto-renew active. |
| **Source & Version Control** | GitHub | Master code repository, branch tracking, audit scripts. | Protected by Git history and local clones. |
| **Edge Hosting & CDN** | Cloudflare Pages | Serves pre-rendered Hugo assets. Unmetered static bandwidth, 500 builds/mo. | Rollback to prior deployment in Cloudflare dashboard in 1 click. |
| **Consultation API** | Pages Functions | Edge serverless runtime (`/api/consultation`). 100k requests/day. | Return explicit HTTP status (400, 403, 500); never fail silently. |
| **Inquiry Storage** | Cloudflare D1 | Serverless SQLite. 5 GB storage, 100k writes/day, 5M reads/day. | Primary source of truth. Queryable via dashboard SQL or `wrangler`. |
| **Bot Mitigation** | Cloudflare Turnstile | Managed challenge. Free, non-interactive, privacy-focused. | Fails closed on invalid/missing token; fallback direct contact shown. |
| **Inbound Custom Email** | Cloudflare Email Routing | Forwards `table@yourdomain.com` -> Personal Gmail. | Forwarding log in Cloudflare dashboard; raw sender headers preserved. |
| **Outbound Email Relay** | Brevo or SMTP2GO | Authenticated SMTP relay for Gmail "Send mail as" and notifications. Free tiers: Brevo 300/day; SMTP2GO 1,000/mo. | If monthly quota exhausted, outbound replies fall back to direct mail or paid relay tier. |
| **Operator Interface** | Google Gmail (Personal) | Read inquiries, reply to clients using custom `Reply-To`. | Independent from web host; search and label rules organize leads. |

*Deferred from initial migration: Cloudflare KV (eventual consistency and 1k writes/day limit make it unsuited for spam tracking; banner state can remain static) and Cloudflare R2 (media and client artifacts remain in Git/local until asset volume demands separate public/private bucket authorization).*

---

## 2. The Consultation Intake Contract

The site's primary conversion mechanism is the bespoke consultation intake in
`layouts/consultation/single.html`. Under this architecture:

> **"Submission Received" strictly means "Durably Written to D1 SQL Storage."**

Notification delivery to Gmail is an asynchronous secondary concern. A failure
in email delivery must **never** drop an inquiry, and must **never** display a 500
error to a visitor whose inquiry was already safely recorded.

```
Visitor submits form
       │
       ▼
Pages Function (/api/consultation)
       │
       ├─▶ [1. Request Size & Method Check] ────(Violation)───▶ HTTP 405 / 413
       ├─▶ [2. Honeypot Validation] ────────────(Populated)───▶ Silent Redirect 303 (Bot trap)
       ├─▶ [3. Turnstile Token Validation] ─────(Missing/Bad)─▶ HTTP 403 Forbidden
       ├─▶ [4. Strict Field Validation] ────────(Invalid)─────▶ HTTP 400 Bad Request
       │
       ▼
 [5. Atomic Insert into Cloudflare D1]
       │
       ├─▶ (DB Down / Insert Fails) ──────────────────────────▶ HTTP 500 (Visitor alerted to retry or email directly)
       │
       ▼ (Durably Persisted — ID & Idempotency Key Generated)
       │
 [6. Attempt Email Notification to Host]
       │
       ├── Success ──▶ Update D1: notification_status = 'sent'
       └── Failure ──▶ Update D1: notification_status = 'failed', log error
       │
       ▼
 [7. Return Success Response]
       ├── Standard HTML: HTTP 303 Redirect to /thank-you/
       └── AJAX / Fetch:  HTTP 200 JSON { ok: true, id: inquiry_id }
```

### A. D1 Database Schema & Operations Contract

```sql
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  preferred_date TEXT,
  guest_count INTEGER NOT NULL,
  experience_level TEXT NOT NULL,
  occasion TEXT,
  desired_feeling TEXT,
  vision TEXT NOT NULL,
  boundaries TEXT,
  privacy_consent INTEGER NOT NULL,
  ip_country TEXT,
  user_agent TEXT,
  notification_status TEXT NOT NULL DEFAULT 'pending', -- 'sent', 'failed'
  notification_error TEXT,
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(notification_status);
CREATE INDEX IF NOT EXISTS idx_consultations_created ON consultations(created_at);
CREATE INDEX IF NOT EXISTS idx_consultations_idempotency ON consultations(idempotency_key);
```

#### Operational Queries for the Operator
* **Find pending or failed notifications:**
  ```sql
  SELECT id, name, email, city, created_at, notification_status, notification_error
  FROM consultations
  WHERE notification_status != 'sent'
  ORDER BY created_at DESC;
  ```
* **Review uncontacted leads:**
  ```sql
  SELECT id, name, email, guest_count, preferred_date, vision, created_at
  FROM consultations
  ORDER BY created_at DESC
  LIMIT 20;
  ```
* **Export inquiries to CSV via Wrangler:**
  ```sh
  npx wrangler d1 execute binyleds-db --command "SELECT * FROM consultations" --csv > inquiries_$(date +%F).csv
  ```
* **Data Retention & Privacy Purge:**
  Guest accommodation and boundary notes contain sensitive personal details. Purge boundaries and vision text on closed inquiries older than 90 days:
  ```sql
  UPDATE consultations
  SET boundaries = '[PURGED_PER_RETENTION_POLICY]',
      vision = '[PURGED_PER_RETENTION_POLICY]',
      updated_at = CURRENT_TIMESTAMP
  WHERE created_at < datetime('now', '-90 days');
  ```

---

### B. Strict Validation & Edge Function Specification (`functions/api/consultation.js`)

```javascript
/**
 * Consultation Form Intake Handler
 * Cloudflare Pages Function mounted at /api/consultation
 */

const ALLOWED_EXPERIENCE = new Set([
  'Mostly new players',
  'A mix of new and experienced players',
  'Mostly experienced players',
  'Not sure yet'
]);

const ALLOWED_FEELINGS = new Set([
  'Triumph',
  'Mystery and intrigue',
  'Laughter and warmth',
  'Quiet connection',
  'Not sure yet'
]);

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Enforce payload size limit (max 64 KB to protect edge memory)
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 65536) {
    return new Response('Payload Too Large', { status: 413, headers: corsAndSecurityHeaders() });
  }

  // 2. Ensure critical database binding is present
  if (!env.DB) {
    console.error('CRITICAL: D1 database binding (env.DB) is missing.');
    return new Response('Service Misconfiguration: Database unavailable.', {
      status: 500,
      headers: corsAndSecurityHeaders()
    });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return new Response('Invalid form data payload', { status: 400, headers: corsAndSecurityHeaders() });
  }

  // 3. Honeypot check: reject bots silently without hitting D1 or SMTP
  const honeypot = (formData.get('company-website') || '').trim();
  if (honeypot.length > 0) {
    return Response.redirect(new URL('/thank-you/', request.url), 303);
  }

  // 4. Cloudflare Turnstile Server-Side Validation (Required in Production)
  const turnstileToken = formData.get('cf-turnstile-response');
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;

  if (env.ENVIRONMENT === 'production' || turnstileSecret) {
    if (!turnstileSecret) {
      console.error('CRITICAL: TURNSTILE_SECRET_KEY is missing in production environment.');
      return new Response('Security configuration error', { status: 500, headers: corsAndSecurityHeaders() });
    }
    if (!turnstileToken) {
      return new Response('Verification challenge token missing. Please reload and try again.', {
        status: 403,
        headers: corsAndSecurityHeaders()
      });
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    const verifyFormData = new FormData();
    verifyFormData.append('secret', turnstileSecret);
    verifyFormData.append('response', turnstileToken);
    verifyFormData.append('remoteip', clientIp);

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: verifyFormData
    });

    const verifyOutcome = await verifyRes.json();
    if (!verifyOutcome.success) {
      console.warn('Turnstile verification rejected:', verifyOutcome['error-codes']);
      return new Response('Verification challenge failed. Please reload and resubmit.', {
        status: 403,
        headers: corsAndSecurityHeaders()
      });
    }
  }

  // 5. Strict Input Sanitization & Field Validation
  const name = (formData.get('name') || '').trim();
  const email = (formData.get('email') || '').trim().toLowerCase();
  const phone = (formData.get('phone') || '').trim() || null;
  const city = (formData.get('city') || '').trim();
  const preferredDate = (formData.get('preferred-date') || '').trim() || null;
  const guestCountRaw = formData.get('guest-count');
  const experienceLevel = (formData.get('experience-level') || '').trim();
  const occasion = (formData.get('occasion') || '').trim() || null;
  const desiredFeeling = (formData.get('desired-feeling') || '').trim() || null;
  const vision = (formData.get('vision') || '').trim();
  const boundaries = (formData.get('boundaries') || '').trim() || null;
  const privacyConsent = formData.get('privacy-consent');

  // Length and presence constraints
  if (!name || name.length > 100) return validationError('Name is required and must be under 100 characters.');
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) return validationError('A valid email address is required.');
  if (phone && phone.length > 30) return validationError('Phone number exceeds 30 characters.');
  if (!city || city.length > 100) return validationError('Location is required and must be under 100 characters.');
  if (occasion && occasion.length > 200) return validationError('Occasion must be under 200 characters.');
  if (!vision || vision.length < 5 || vision.length > 4000) return validationError('Vision is required (5 to 4000 characters).');
  if (boundaries && boundaries.length > 2000) return validationError('Boundaries notes must be under 2000 characters.');

  // Guest count validation: strict integer between 2 and 20
  if (!/^\d+$/.test(String(guestCountRaw))) return validationError('Guest count must be an integer.');
  const guestCount = parseInt(guestCountRaw, 10);
  if (guestCount < 2 || guestCount > 20) return validationError('Guest count must be between 2 and 20 guests.');

  // Enumerated choices validation
  if (!ALLOWED_EXPERIENCE.has(experienceLevel)) return validationError('Invalid tabletop experience selection.');
  if (desiredFeeling && !ALLOWED_FEELINGS.has(desiredFeeling)) return validationError('Invalid desired feeling selection.');

  // Exact consent checkbox validation
  if (privacyConsent !== 'on' && privacyConsent !== 'true') {
    return validationError('You must agree to the privacy note to submit a consultation request.');
  }

  // Date validation (ISO 8601 YYYY-MM-DD if present)
  if (preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return validationError('Preferred date must be in YYYY-MM-DD format.');
  }

  // 6. Idempotency Key Generation (deduplicates identical double-clicks/retries within 5 minutes)
  const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  const rawKey = `${email}|${guestCount}|${city}|${timeWindow}`;
  const keyBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
  const idempotencyKey = Array.from(new Uint8Array(keyBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  // 7. Atomic Insert into Cloudflare D1
  let recordId;
  try {
    const insertResult = await env.DB.prepare(`
      INSERT INTO consultations (
        idempotency_key, name, email, phone, city, preferred_date,
        guest_count, experience_level, occasion, desired_feeling,
        vision, boundaries, privacy_consent, ip_country, user_agent,
        notification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'pending')
      ON CONFLICT(idempotency_key) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, notification_status
    `).bind(
      idempotencyKey, name, email, phone, city, preferredDate,
      guestCount, experienceLevel, occasion, desiredFeeling,
      vision, boundaries,
      request.headers.get('CF-IPCountry') || null,
      request.headers.get('User-Agent') || null
    ).first();

    recordId = insertResult?.id;
  } catch (dbErr) {
    console.error('FATAL: D1 Database insert failed:', dbErr);
    return new Response(
      'Unable to record your consultation request due to a database error. Please contact us directly at our email.',
      { status: 500, headers: corsAndSecurityHeaders() }
    );
  }

  // 8. Secondary Notification Dispatch (Decoupled from Durability)
  let notificationSent = false;
  let notificationError = null;

  try {
    const hostRecipient = env.HOST_NOTIFICATION_EMAIL;
    const verifiedSender = env.VERIFIED_SENDER_EMAIL || 'inquiries@binyleds.com';

    if (hostRecipient && env.SEND_EMAIL) {
      const emailBody = [
        `New Private Consultation Inquiry #${recordId}`,
        `================================================`,
        `Name:             ${name}`,
        `Email:            ${email} (Reply to this message directly)`,
        `Phone:            ${phone || 'None provided'}`,
        `Location/City:    ${city}`,
        `Preferred Date:   ${preferredDate || 'Flexible / Not set'}`,
        `Expected Guests:  ${guestCount}`,
        `Experience Level: ${experienceLevel}`,
        `Occasion:         ${occasion || 'None stated'}`,
        `Desired Feeling:  ${desiredFeeling || 'None selected'}`,
        ``,
        `Guest Vision / Tone:`,
        vision,
        ``,
        `Accommodations / Boundaries:`,
        boundaries || 'None stated',
        ``,
        `--`,
        `Recorded in D1 ID: ${recordId} | Timestamp: ${new Date().toISOString()}`
      ].join('\n');

      await env.SEND_EMAIL.send({
        to: hostRecipient,
        from: verifiedSender,
        replyTo: email, // CRITICAL: Allows host to click Reply in Gmail directly to the client
        subject: `[Consultation Request] ${name} (${city}) - ${guestCount} guests`,
        text: emailBody
      });

      notificationSent = true;
    }
  } catch (mailErr) {
    console.error('Notification dispatch failed (inquiry remains safely in D1):', mailErr);
    notificationError = mailErr.message || String(mailErr);
  }

  // Update notification status asynchronously in D1
  if (recordId) {
    try {
      await env.DB.prepare(`
        UPDATE consultations
        SET notification_status = ?,
            notification_error = ?,
            notification_attempts = notification_attempts + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(notificationSent ? 'sent' : 'failed', notificationError, recordId).run();
    } catch (updateErr) {
      console.error('Failed to update notification status in D1:', updateErr);
    }
  }

  // 9. Respond to Client
  const accepts = request.headers.get('Accept') || '';
  if (accepts.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true, id: recordId }), {
      status: 200,
      headers: { ...corsAndSecurityHeaders(), 'Content-Type': 'application/json' }
    });
  }

  // Standard HTML form POST redirect
  return Response.redirect(new URL('/thank-you/', request.url), 303);
}

function validationError(msg) {
  return new Response(msg, {
    status: 400,
    headers: { ...corsAndSecurityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

function corsAndSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}
```

---

## 3. Browser Integration, Headers & Redirects

Cloudflare Pages divides response rules into static asset rules (`_headers` and
`_redirects`) and Function response headers.

### A. Redirect Syntax Correction (`static/_redirects`)
In Cloudflare Pages, the status code comes **third**:
```text
/consult    /consultation/    301
/book       /consultation/    301
```
*(Contrast with Netlify where `status` is a key in `netlify.toml`).*

### B. Content Security Policy Compatibility (`static/_headers`)
The existing CSP defined in `netlify.toml` will block Cloudflare Turnstile and
Web Analytics unless explicitly expanded to allow their domains:

```text
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com; frame-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```

### C. Frontend Markup & Turnstile Widget (`layouts/consultation/single.html`)

```html
<!-- Include Turnstile script in head or above form -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<form
  class="consultation-form"
  name="private-consultation"
  method="POST"
  action="/api/consultation"
  aria-labelledby="consultation-form-title"
>
  <!-- Bot Honeypot -->
  <p class="form-honeypot" aria-hidden="true" style="display:none;">
    <label>Leave empty: <input name="company-website" tabindex="-1" autocomplete="off"></label>
  </p>

  <!-- Input fields ... (name, email, city, guest-count, vision, etc.) -->

  <!-- Turnstile Non-Interactive Challenge -->
  <div class="field field--full">
    <div
      class="cf-turnstile"
      data-sitekey="{{ site.Params.turnstileSiteKey }}"
      data-theme="dark"
      data-size="flexible"
    ></div>
    <noscript>
      <p class="field-help" style="color: var(--color-gold);">
        JavaScript is required to verify this submission. If you prefer, email us directly.
      </p>
    </noscript>
  </div>

  <button class="button button--primary form-submit" type="submit">Request a private consultation</button>
</form>
```

---

## 4. Preserving Hugo Build Safeguards & Environment Isolation

The site's current deployment workflow relies on rigorous build gates. Cloudflare
Pages builds must preserve these exact flags rather than running a bare `hugo`.

### A. Cloudflare Pages Build Command
* **Build command:**
  ```sh
  hugo --gc --minify --panicOnWarning --cleanDestinationDir --baseURL "$CF_PAGES_URL"
  ```
* **Environment variables:**
  * `HUGO_VERSION = 0.164.0`
  * `HUGO_ENV = production` (or `staging` on preview branches)

### B. Environment Isolation (Production vs. Preview)
Cloudflare Pages supports separate configuration bindings for **Production**
versus **Preview** deployments:

| Setting | Production (`main` branch) | Preview Deployments (PRs / branches) |
|---|---|---|
| **D1 Database Binding** | `DB` -> `binyleds-production-d1` | `DB` -> `binyleds-preview-d1` |
| **Notification Recipient** | `HOST_NOTIFICATION_EMAIL` -> `ryan@...` | `HOST_NOTIFICATION_EMAIL` -> `ryan+test@...` |
| **Turnstile Keys** | Live domain sitekey & secret | Cloudflare test keys (`1x00000000000000000000AA` always passes) |
| **Indexability** | `index, follow` + sitemap | `noindex, nofollow` |

### C. Staging Mirror Preservation
The GitHub Pages mirror (`ryan258.github.io/binyleds/`) remains a purely static
showcase. The warning banner in `layouts/consultation/single.html` must remain
active when compiled for GitHub Pages (`hugo.Environment == "staging"`), alerting
visitors that the static mirror does not accept submissions.

---

## 5. Gmail Workflow Realities & Verification

While connecting Cloudflare Email Routing (inbound) and an SMTP relay (outbound)
allows conducting business from Gmail:

1. **Reply-To vs. From Alignment:** When the notification email arrives in Gmail,
   the notification was sent *to* you with `Reply-To: client@example.com`.
   Clicking "Reply" in Gmail addresses the client directly.
2. **"Send Mail As" SPF/DKIM Alignment:** When you compose or reply as
   `table@yourdomain.com`, Gmail connects over TLS (port 587) to your authenticated
   relay (Brevo or SMTP2GO).
3. **The "Sent Via" Caveat:** Google's own documentation notes that certain
   recipients (particularly strict Microsoft Outlook / Exchange servers) may
   inspect envelope headers and display `"table@yourdomain.com via brevo.com"`
   unless reverse DNS (PTR) matches the custom domain. This is normal for
   virtual relays and does not expose your personal Gmail address, but must be
   tested during cutover.

---

## 6. Phased Implementation & Rollback Roadmap

```
Phase 1: Local Contract & Schema Preparation
  ├── 1. Apply D1 schema locally using wrangler d1 execute --local
  ├── 2. Implement functions/api/consultation.js with strict validation
  ├── 3. Create static/_headers and static/_redirects (verify syntax)
  └── 4. Run local test suite (scripts/check.sh)

Phase 2: Preview Environment Verification (Cloudflare Pages Preview)
  ├── 5. Connect repo to Cloudflare Pages; configure build command
  ├── 6. Bind preview D1 database (binyleds-preview-d1)
  ├── 7. Test negative cases:
  │       ├─ Missing Turnstile token -> 403 Forbidden
  │       ├─ Malformed email / invalid guest count -> 400 Bad Request
  │       ├─ Database binding missing -> 500 Misconfiguration
  │       └─ Honeypot populated -> Silent 303 redirect
  ├── 8. Test positive cases:
  │       ├─ Valid submission records durably in D1
  │       ├─ Notification dispatches to test email with working Reply-To
  │       └─ Rapid duplicate submission triggers idempotency de-duplication
  └── 9. Verify CSP allows Turnstile script and analytics beacon without console errors

Phase 3: DNS & Email Cutover
  ├── 10. Document all existing DNS records before nameserver change
  ├── 11. Point domain nameservers to Cloudflare
  ├── 12. Enable DNSSEC in Cloudflare DNS tab
  ├── 13. Enable Cloudflare Email Routing; test forwarding to personal Gmail
  ├── 14. Configure Brevo/SMTP2GO relay; add DKIM and SPF records to Cloudflare DNS
  └── 15. Configure Gmail "Send mail as" and send test email to external address

Phase 4: Production Cutover & Rollback Verification
  ├── 16. Bind production D1 database (binyleds-production-d1)
  ├── 17. Update layouts/consultation/single.html to point to /api/consultation
  ├── 18. Submit live production test inquiry and verify end-to-end receipt in Gmail
  └── ROLLBACK PLAN: If edge function or email fails unexpectedly, revert DNS
      to Netlify records; Netlify forms resume capturing submissions immediately.

Phase 5: Day-2 Maintenance
  ├── 19. Weekly check for any failed notifications (SELECT WHERE notification_status = 'failed')
  └── 20. Quarterly D1 CSV export and 90-day privacy retention cleanup
```
