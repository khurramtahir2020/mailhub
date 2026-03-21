# MailHub — Transactional Email SaaS Design Spec

## Overview

MailHub is a multi-tenant SaaS that lets developers send, track, and manage transactional emails through Amazon SES, with a custom product layer and polished UI on top.

**Hard constraint:** Transactional email only. No newsletters, campaigns, cold email, bulk marketing, or promotional email. Every architecture and product decision enforces this.

## Context

- **Target users:** Developers
- **Scale:** Under 10 tenants, under 50k emails/month at launch
- **Billing:** Free/internal use for MVP — usage metering built in, no Stripe
- **Auth:** Auth0 Free tier (auth only, all RBAC in app DB)
- **Hosting:** Single Coolify-managed VPS (2-4 vCPU, 4-8GB RAM)
- **Database:** Existing PostgreSQL on Coolify, dedicated `mailhub` database
- **AWS:** No account yet — full setup needed

---

## 1. Tech Stack

| Concern | Choice | Justification |
|---|---|---|
| Frontend | React + Vite | No SSR needed — static SPA, zero runtime memory |
| Routing | React Router v7 | Standard client-side routing |
| Server state | TanStack Query | Caching, refetching, server state management |
| UI components | shadcn/ui + Tailwind CSS | Accessible, customizable, polished design baseline |
| Auth (frontend) | @auth0/auth0-react | Official Auth0 SPA SDK |
| Backend | Fastify (TypeScript) | Fastest Node.js framework, low memory, plugin architecture |
| ORM | Drizzle | Type-safe, SQL-first, lightweight migrations |
| Validation | Zod | Shared schemas between frontend and backend |
| Queue | None (MVP) | Direct processing + node-cron. Add BullMQ + Redis later. |
| Database | PostgreSQL (existing on Coolify) | Existing infra, no new container needed |
| Logging | Pino | Fastest Node.js logger, structured JSON, native Fastify integration |
| AWS | @aws-sdk/client-sesv2 | Tree-shakeable, only import what you use |
| Email templates | Handlebars | Simple, proven, safe with strict mode |
| Reverse proxy | Traefik (Coolify built-in) | Already running, auto HTTPS via Let's Encrypt |
| Static serving | @fastify/static | Serve React build from Fastify — no extra container |
| Monorepo | pnpm workspaces + Turborepo | Fast builds, shared types, single CI pipeline |

### Memory footprint estimate

- PostgreSQL: existing (shared with other Coolify services)
- Fastify API + cron: ~150MB
- Frontend: 0MB runtime (static files)
- **Total new: ~150MB**

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    COOLIFY VPS                       │
│                                                      │
│  Traefik (Coolify built-in) → HTTPS + routing        │
│       │                                              │
│       ▼                                              │
│  Fastify Container                                   │
│    ├── Static React SPA (dashboard)                  │
│    ├── API routes (/api/v1/*)                        │
│    ├── SES webhook receiver (/api/v1/webhooks/ses)   │
│    └── Cron jobs (node-cron, in-process)              │
│       │                                              │
│       ▼                                              │
│  PostgreSQL (existing Coolify instance)               │
│    └── mailhub database                              │
└─────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
    Auth0 (Free)                   AWS SES + SNS
    - Login/signup                 - SendEmail API
    - Password reset               - Domain identity
    - MFA                          - Configuration set
    - JWT issuance                 - Event notifications
```

**Two containers to manage:** Fastify app (new) + PostgreSQL (existing).

### Request flows

**Dashboard login:** Browser → Auth0 Universal Login → JWT → Fastify validates JWT → serves data

**API email send:** Customer server → `POST /api/v1/emails/send` with `X-API-Key` → Fastify validates key (hashed lookup) → upsert contact → check suppression → render template → SES SendEmail → store message → return

**SES event ingestion:** SES → SNS topic → `POST /api/v1/webhooks/ses` → verify SNS signature → parse event → update message status → update contact stats → auto-suppress on hard bounce/complaint

**Cron jobs (in-process):**
- Every 5 min: poll DNS for pending domain verifications
- Every 1 hour: aggregate usage stats
- Every 1 hour: check bounce/complaint rates per tenant
- Every 24 hours: clean up expired idempotency keys
- Daily: check SES account quota

---

## 3. Auth0 Architecture

### Principle

Auth0 is a pure authentication layer. All authorization, tenant membership, and roles live in the app database.

### Auth0 setup (Free tier)

- **One SPA Application:** React dashboard
- **One API:** Audience `https://api.mailhub.com`
- **No Organizations** (requires paid plan)
- **No Auth0 roles** (RBAC in app DB)

### What lives where

| Concern | Location |
|---|---|
| User identity (email, password, MFA) | Auth0 |
| User profile (name, preferences) | App DB |
| Tenant ownership | App DB |
| API key management | App DB |
| Session tokens (JWT) | Auth0 issues, app validates |

### Two auth paths (never cross)

**Dashboard (humans):** Auth0 JWT → Fastify validates via JWKS → looks up user in app DB

**Send API (machines):** `X-API-Key` header → Fastify hashes key → looks up in `api_keys` table → resolves tenant. No Auth0 involved.

### Token strategy

- Access token: JWT, 1 hour expiry, validated via Auth0 JWKS (cached)
- Refresh token: rotation enabled, reuse detection enabled
- API keys: `mh_live_` prefix + 32 random bytes (base62). Only prefix + SHA-256 hash stored. Full key shown once at creation.

### Signup flow

1. Auth0 signup → JWT
2. `POST /api/v1/auth/signup-complete`
3. Backend creates user record (links `auth0_sub`) + first default tenant
4. User lands on dashboard

### Tenant model

- One user owns multiple tenants
- No team members, no invitations, no shared tenants
- Each tenant has its own domains, templates, API keys, contacts, messages
- Tenant switcher in frontend sidebar
- API keys scoped to specific tenant — key itself determines tenant context

---

## 4. Data Model

All tables use UUIDs as primary keys. Every tenant-scoped table has `tenant_id` with an index.

### users

```
id                UUID PK
auth0_sub         TEXT UNIQUE NOT NULL
email             TEXT NOT NULL
name              TEXT
is_platform_admin BOOLEAN DEFAULT false
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### tenants

```
id                UUID PK
user_id           UUID FK → users
name              TEXT NOT NULL
slug              TEXT UNIQUE NOT NULL
status            TEXT DEFAULT 'active'       -- active | suspended | deleted
mode              TEXT DEFAULT 'sandbox'      -- sandbox | production
daily_send_limit  INTEGER DEFAULT 50          -- 50 in sandbox, raised in production
reviewed_at       TIMESTAMPTZ
reviewed_by       UUID FK → users
suspended_at      TIMESTAMPTZ
suspension_reason TEXT
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### domains

```
id                 UUID PK
tenant_id          UUID FK → tenants
domain             TEXT NOT NULL UNIQUE       -- unique across ALL tenants
status             TEXT DEFAULT 'pending'     -- pending | verified | failed
ses_identity_arn   TEXT
verification_token TEXT
dkim_tokens        JSONB
dns_records        JSONB                     -- full DNS guidance with per-record verification status
spf_verified       BOOLEAN DEFAULT false
dkim_verified      BOOLEAN DEFAULT false
dmarc_verified     BOOLEAN DEFAULT false
dmarc_policy       TEXT                      -- none | quarantine | reject
verified_at        TIMESTAMPTZ
created_at         TIMESTAMPTZ
updated_at         TIMESTAMPTZ
```

### sender_identities

```
id          UUID PK
tenant_id   UUID FK → tenants
domain_id   UUID FK → domains
email       TEXT NOT NULL
name        TEXT
is_default  BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ

UNIQUE(tenant_id, email)
```

### templates

```
id              UUID PK
tenant_id       UUID FK → tenants
name            TEXT NOT NULL
description     TEXT
current_version INTEGER DEFAULT 1
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ

UNIQUE(tenant_id, name)
```

### template_versions

```
id          UUID PK
template_id UUID FK → templates
version     INTEGER NOT NULL
subject     TEXT NOT NULL
html_body   TEXT
text_body   TEXT
variables   JSONB
created_at  TIMESTAMPTZ

UNIQUE(template_id, version)
```

### api_keys

```
id          UUID PK
tenant_id   UUID FK → tenants
name        TEXT NOT NULL
key_prefix  TEXT NOT NULL
key_hash    TEXT NOT NULL
scope       TEXT DEFAULT 'send_only'    -- send_only | full_access
last_used_at TIMESTAMPTZ
is_revoked  BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ

INDEX(key_prefix)
```

### contacts

```
id                 UUID PK
tenant_id          UUID FK → tenants
email              TEXT NOT NULL
status             TEXT DEFAULT 'active'    -- active | suppressed
suppression_reason TEXT
first_seen_at      TIMESTAMPTZ
last_emailed_at    TIMESTAMPTZ
total_sent         INTEGER DEFAULT 0
total_delivered    INTEGER DEFAULT 0
total_bounced      INTEGER DEFAULT 0
total_complained   INTEGER DEFAULT 0
created_at         TIMESTAMPTZ
updated_at         TIMESTAMPTZ

UNIQUE(tenant_id, email)
```

### messages

```
id               UUID PK
tenant_id        UUID FK → tenants
contact_id       UUID FK → contacts
idempotency_key  TEXT
from_email       TEXT NOT NULL
to_email         TEXT NOT NULL
subject          TEXT NOT NULL
template_id      UUID FK → templates NULL
template_version INTEGER
status           TEXT DEFAULT 'accepted'    -- accepted | sent | delivered | bounced | complained | rejected
ses_message_id   TEXT
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ

UNIQUE(tenant_id, idempotency_key)
INDEX(tenant_id, contact_id)
INDEX(tenant_id, created_at)
INDEX(tenant_id, status)
INDEX(ses_message_id)
```

### message_events

```
id             UUID PK
message_id     UUID FK → messages
tenant_id      UUID FK → tenants
event_type     TEXT NOT NULL
raw_event      JSONB
bounce_type    TEXT
bounce_subtype TEXT
created_at     TIMESTAMPTZ

INDEX(message_id)
INDEX(tenant_id, created_at)
```

### suppressions

```
id                UUID PK
tenant_id         UUID FK → tenants NULL    -- null = global
email             TEXT NOT NULL
reason            TEXT NOT NULL
source_message_id UUID FK → messages NULL
created_at        TIMESTAMPTZ

UNIQUE(tenant_id, email)
INDEX(email)
```

### usage_daily

```
id                UUID PK
tenant_id         UUID FK → tenants
date              DATE NOT NULL
emails_sent       INTEGER DEFAULT 0
emails_delivered  INTEGER DEFAULT 0
emails_bounced    INTEGER DEFAULT 0
emails_complained INTEGER DEFAULT 0
emails_rejected   INTEGER DEFAULT 0
created_at        TIMESTAMPTZ

UNIQUE(tenant_id, date)
```

### audit_logs

```
id            UUID PK
tenant_id     UUID FK → tenants NULL
user_id       UUID FK → users NULL
action        TEXT NOT NULL
resource_type TEXT
resource_id   UUID
metadata      JSONB
ip_address    TEXT
created_at    TIMESTAMPTZ

INDEX(tenant_id, created_at)
```

### idempotency_keys

```
id            UUID PK
tenant_id     UUID FK → tenants
key           TEXT NOT NULL
message_id    UUID FK → messages
response_body JSONB
expires_at    TIMESTAMPTZ
created_at    TIMESTAMPTZ

UNIQUE(tenant_id, key)
INDEX(expires_at)
```

### Entity relationships

```
User (1) → owns → (many) Tenant
Tenant (1) → has → (many) Domain, SenderIdentity, Template, ApiKey, Contact, Message, Suppression, UsageDaily, AuditLog
Template (1) → has → (many) TemplateVersion
Contact (1) → has → (many) Message
Message (1) → has → (many) MessageEvent
```

---

## 5. Public API Design

All endpoints under `/api/v1`. Two auth methods: JWT (dashboard) and API key (programmatic).

### Auth & session

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/signup-complete | JWT | Create user + first tenant after Auth0 signup |
| GET | /auth/session | JWT | Return user profile + tenant list |

### Tenants

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /tenants | JWT | Create new tenant |
| GET | /tenants | JWT | List user's tenants |
| GET | /tenants/:tenantId | JWT | Tenant details |
| PATCH | /tenants/:tenantId | JWT | Update tenant name |
| DELETE | /tenants/:tenantId | JWT | Soft delete tenant |

### Domains

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /tenants/:tenantId/domains | JWT | Add domain, initiate SES verification |
| GET | /tenants/:tenantId/domains | JWT | List domains with status |
| GET | /tenants/:tenantId/domains/:domainId | JWT | Domain detail with DNS checklist |
| POST | /tenants/:tenantId/domains/:domainId/verify | JWT | Trigger immediate DNS check |
| DELETE | /tenants/:tenantId/domains/:domainId | JWT | Remove domain from SES |

### Sender identities

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /tenants/:tenantId/senders | JWT | Create sender on verified domain |
| GET | /tenants/:tenantId/senders | JWT | List senders |
| DELETE | /tenants/:tenantId/senders/:senderId | JWT | Delete sender |

### Templates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /tenants/:tenantId/templates | JWT | Create template (version 1) |
| GET | /tenants/:tenantId/templates | JWT | List templates |
| GET | /tenants/:tenantId/templates/:templateId | JWT | Template detail with current version |
| PUT | /tenants/:tenantId/templates/:templateId | JWT | Create new version |
| GET | /tenants/:tenantId/templates/:templateId/versions | JWT | List versions |
| GET | /tenants/:tenantId/templates/:templateId/versions/:version | JWT | Specific version |
| DELETE | /tenants/:tenantId/templates/:templateId | JWT | Delete template |

### Email sending

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /emails/send | API Key | Send transactional email (raw or template) |

**Request body (raw):**
```json
{
  "from": "noreply@notifications.example.com",
  "to": "user@gmail.com",
  "subject": "Your order shipped",
  "html": "<h1>Shipped!</h1>",
  "text": "Shipped!",
  "idempotency_key": "order-123-shipped"
}
```

**Request body (template):**
```json
{
  "from": "noreply@notifications.example.com",
  "to": "user@gmail.com",
  "template": "order-shipped",
  "template_version": 2,
  "variables": { "name": "John", "tracking_url": "..." },
  "idempotency_key": "order-123-shipped"
}
```

**Response (201):**
```json
{
  "id": "msg_uuid",
  "status": "sent",
  "ses_message_id": "...",
  "contact_id": "contact_uuid"
}
```

### Messages & contacts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /tenants/:tenantId/messages | JWT | Paginated message list (filterable) |
| GET | /tenants/:tenantId/messages/:messageId | JWT | Message detail with event timeline |
| GET | /tenants/:tenantId/contacts | JWT | Paginated contact list |
| GET | /tenants/:tenantId/contacts/:contactId | JWT | Contact detail with stats |
| GET | /tenants/:tenantId/contacts/:contactId/messages | JWT | Messages sent to contact |

### Suppressions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /tenants/:tenantId/suppressions | JWT | List suppressions |
| POST | /tenants/:tenantId/suppressions | JWT | Manually suppress address |
| DELETE | /tenants/:tenantId/suppressions/:id | JWT | Remove suppression |

### API keys

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /tenants/:tenantId/api-keys | JWT | Create key (returns full key once) |
| GET | /tenants/:tenantId/api-keys | JWT | List keys (prefix only) |
| DELETE | /tenants/:tenantId/api-keys/:keyId | JWT | Revoke key |

### Usage

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /tenants/:tenantId/usage | JWT | Daily breakdown (date range) |
| GET | /tenants/:tenantId/usage/summary | JWT | Current period summary |

### SES webhook (internal)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /webhooks/ses | SNS signature | Receive SES event notifications |

### Platform admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /admin/tenants | JWT + is_platform_admin | List all tenants |
| GET | /admin/tenants/:tenantId | JWT + is_platform_admin | Tenant detail |
| POST | /admin/tenants/:tenantId/suspend | JWT + is_platform_admin | Suspend tenant |
| POST | /admin/tenants/:tenantId/unsuspend | JWT + is_platform_admin | Unsuspend tenant |
| POST | /admin/tenants/:tenantId/promote | JWT + is_platform_admin | Promote sandbox → production |
| GET | /admin/usage | JWT + is_platform_admin | Platform-wide stats |

### API conventions

- Pagination: `?page=1&limit=50` → response includes `total` and `pages`
- Errors: `{ error: { code: "DOMAIN_NOT_VERIFIED", message: "..." } }`
- Dates: ISO 8601, always UTC
- IDs: UUIDs
- Versioning: URL path `/api/v1/`
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 6. SES Integration

### AWS setup (one-time)

- IAM user: `mailhub-ses-sender` with minimal policy
- SES configuration set: `mailhub-production` (shared across all tenants)
- SNS topic: `mailhub-ses-events` → HTTPS subscription to app endpoint
- SES region: `us-east-1`

### IAM policy (least privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:VerifyDomainIdentity",
        "ses:VerifyDomainDkim",
        "ses:DeleteIdentity",
        "ses:GetIdentityVerificationAttributes",
        "ses:GetIdentityDkimAttributes",
        "ses:GetSendQuota",
        "ses:GetSendStatistics"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Subscribe",
        "sns:ConfirmSubscription"
      ],
      "Resource": "arn:aws:sns:us-east-1:ACCOUNT_ID:mailhub-ses-events"
    }
  ]
}
```

### Sending flow

1. Validate API key → resolve tenant
2. Check tenant status (not suspended)
3. Check daily send limit
4. Check idempotency key
5. Validate sender (must match verified domain)
6. Upsert contact
7. Check suppression (tenant + global)
8. Render template (if template send)
9. Call SES SendEmail (synchronous, with tenant_id and message_id as tags)
10. Store message record
11. Store idempotency key
12. Increment usage_daily
13. Return response

### Event ingestion

SES → SNS → `POST /api/v1/webhooks/ses`:

1. Verify SNS signature
2. Handle subscription confirmation
3. Parse SES event
4. Extract identifiers from SES message tags
5. Idempotency check (skip duplicate events)
6. Store message_event
7. Update message status
8. Handle bounce (permanent → suppress, transient → log only)
9. Handle complaint (always suppress)
10. Update contact stats

### Domain verification

- `ses.verifyDomainIdentity()` → verification TXT token
- `ses.verifyDomainDkim()` → 3 DKIM CNAME tokens
- App generates full DNS guidance (DKIM, SPF, DMARC records to add)
- Cron polls DNS every 5 minutes for pending domains
- Checks: SES verification status, DKIM CNAMEs, SPF TXT, DMARC TXT
- Domain must be verified before any email can be sent from it

### DMARC guidance

| Status | Display | Recommendation |
|---|---|---|
| Missing | Red | Add DMARC record |
| p=none | Yellow | Upgrade to p=quarantine |
| p=quarantine | Green | Good |
| p=reject | Green | Best |

### Reputation protection

| Metric | Threshold | Action |
|---|---|---|
| Bounce rate | > 5% | Warning |
| Bounce rate | > 10% | Auto-suspend |
| Complaint rate | > 0.1% | Warning + review |
| Complaint rate | > 0.3% | Auto-suspend |
| Daily send limit | Exceeded | Reject sends |
| SES account quota | > 80% | Log warning |
| SES account quota | > 95% | Reject all sends |

---

## 7. Abuse Prevention

### Tenant lifecycle

```
signup → sandbox (50/day limit) → manual review → production (1000/day) → suspended (if abusive)
```

### Controls

| Control | Purpose |
|---|---|
| Auth0 email verification | No throwaway signups |
| Sandbox mode | New tenants can't blast immediately |
| Manual production review | Human gate before real volume |
| Domain verification | Must own sending domain |
| Free email domain blocklist | Can't register gmail.com etc. |
| Domain uniqueness across tenants | Prevent hijacking |
| Daily send limits | Hard cap on volume |
| Per-second throttle (5/sec/tenant) | Prevent API hammering |
| Suppression enforcement | Bad addresses auto-blocked |
| Bounce/complaint rate monitoring | Auto-suspend high offenders |
| Content pattern checks | Catch obvious spam/marketing content |
| Unsubscribe link rejection | Block newsletter-style emails |
| Volume spike detection | Flag 3x above 7-day average |
| Manual suspend/unsuspend | Admin override |

### Content checks (pre-send)

- Reject empty subject or body
- Flag ALL CAPS subjects
- Flag excessive exclamation marks
- Reject if body contains unsubscribe links (newsletter signal)
- Flag if body contains more than 5 URLs

---

## 8. Repo Structure

Monorepo with pnpm workspaces + Turborepo.

```
mailhub/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── Dockerfile
├── docker-compose.yml              # dev only (PostgreSQL)
├── .env.example
├── packages/
│   └── shared/
│       └── src/
│           ├── types/               # shared TypeScript types
│           ├── constants/           # roles, limits, blocked domains
│           └── validation/          # shared Zod schemas
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── server.ts
│   │       ├── config.ts
│   │       ├── db/                  # Drizzle schema + migrations
│   │       ├── routes/              # one file per resource
│   │       ├── middleware/          # auth, tenant scoping, rate limit
│   │       ├── services/            # business logic (SES, contacts, etc.)
│   │       ├── cron/                # scheduled jobs
│   │       └── lib/                 # errors, logger, DNS helpers
│   └── web/
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api/                 # API client
│           ├── hooks/               # TanStack Query hooks
│           ├── components/          # UI components by feature
│           └── pages/               # route pages
├── docs/
├── infra/                           # IAM policy, SES setup docs
└── scripts/                         # dev, migrate, seed scripts
```

---

## 9. Implementation Roadmap

### Week 1-2: Foundation

- Monorepo scaffolding (pnpm, Turborepo, TypeScript)
- Dockerfile (multi-stage build)
- Drizzle schema: users, tenants, api_keys
- Auth0 setup (SPA app + API)
- Fastify server with Pino logging
- JWT validation + API key auth middleware
- Auth routes (signup-complete, session)
- Tenant CRUD routes
- API key generation/revocation
- React + Vite + Tailwind + shadcn/ui setup
- Auth0 React SDK integration
- Login/signup flow
- Dashboard layout, tenant switcher
- API keys page
- Deploy to Coolify end-to-end

### Week 3-4: Email sending core

- AWS account + SES setup + sandbox exit request
- Domain verification (SES integration + DNS checks)
- Domain management routes + UI with DNS checklist
- Contact upsert, suppression check
- Email send route (raw + template)
- Idempotency handling
- SES event ingestion (SNS webhook)
- Bounce/complaint processing + auto-suppression
- Message storage + status updates
- Usage tracking

### Week 5-8: Product completeness

- Template CRUD with versioning + UI
- Contacts page (list, detail, message history)
- Messages page (list, filters, detail with event timeline)
- Suppressions page
- Usage dashboard with charts
- Sandbox/production tenant modes
- Abuse prevention (rate monitoring, content checks, auto-suspend)
- Admin panel (tenant list, review, suspend/unsuspend, promote)
- Sender identity management
- Audit logging throughout
- Frontend polish pass (frontend-design skill)
- Code quality pass (code-simplifier)
- Security review
- Production hardening

### Later: Scale improvements

- Redis + BullMQ for async sending
- Split worker container
- Outbound webhooks to customer apps
- Open/click tracking
- SMTP relay support
- Stripe billing integration
- Contact export
- Prometheus + Grafana
- Per-tenant SES configuration sets
- Dedicated IPs for high-volume tenants

---

## 10. Engineering Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | SES sandbox exit denied/delayed | Blocks all real sending | Apply early Week 3 with clear transactional use case. Expect 1-3 days. |
| 2 | Bad tenant tanks SES reputation | AWS suspends entire account | Sandbox mode, manual review, auto-suspend, daily caps, suppression enforcement |
| 3 | SNS webhook unreachable | Events stop, sending goes blind | Health monitoring, SNS retries 23 days, idempotent event processing |
| 4 | Auth0 Free tier limits | M2M token limit (2 apps) | Minimal Auth0 API calls, cache JWKS, all RBAC in app DB |
| 5 | Single server failure | Full platform outage | Coolify auto-restart, documented recovery, backups |
| 6 | Database growth on small VPS | Disk/performance issues | 30-day message retention, archival cron, proper indexes |
| 7 | SES API latency spikes | Slow customer API responses | 5s timeout, clear errors, idempotency keys for retry, add BullMQ later |
| 8 | Idempotency race condition | Duplicate email sends | PostgreSQL UNIQUE constraint + transaction wrapping |
| 9 | SNS signature spoofing | Fake events corrupt data | Verify SNS signatures, validate certificate URL |
| 10 | Domain hijacking between tenants | Cross-tenant impersonation | Domain uniqueness across all tenants (not per-tenant) |
| 11 | API key leaked | Unauthorized sending | Prefix enables GitHub scanning, rate limits, one-click revoke |
| 12 | Handlebars template injection | Code execution | Strict mode, no custom helpers, no triple-brace raw output |
| 13 | Memory pressure on VPS | App crashes | --max-old-space-size=512, stream large results, monitor via Coolify |
| 14 | Bad database migration | Data loss or downtime | Test against data copy, review SQL, never auto-run on start |
| 15 | Auth0 outage | Dashboard login blocked | API key sends unaffected, cache JWKS, existing sessions continue |

---

## 11. Implementation Skills

The following skills must be used during implementation:

- **frontend-design** — Invoke for every UI component and page. Build polished, premium UI from the start. Target: Resend/Linear/Vercel-level design quality.
- **code-simplifier** — Invoke after completing each major implementation step to refine code.
- **code-reviewer** — Invoke after completing each major project step to review against plan.
- **verification-before-completion** — Run verification before claiming any step is done.

---

## 12. Excluded from MVP (explicit)

- Billing / Stripe
- SMTP relay
- Outbound webhooks to customers
- Open/click tracking
- Custom IP pools
- Domain warmup automation
- ML-based anomaly detection
- Multi-region SES
- Batch send
- Scheduled/delayed sends
- Email preview API
- Team members / shared tenants / invitations / RBAC within tenant
