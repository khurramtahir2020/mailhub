# Plan 2: Email Sending Core — Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all backend infrastructure for sending transactional emails via Amazon SES — domain verification, sender identities, templates, contacts, suppressions, the send API, SNS event ingestion, usage tracking, and cron jobs.

**Architecture:** Extend existing Fastify backend with new Drizzle tables, SES v2 SDK integration, SNS webhook receiver, Handlebars template rendering, and node-cron scheduled jobs. All synchronous — no queue.

**Tech Stack:** @aws-sdk/client-sesv2, handlebars, node-cron, existing Fastify + Drizzle + PostgreSQL stack

**Spec:** `docs/superpowers/specs/2026-03-21-mailhub-design.md` (Sections 4-6)

**Prerequisite:** Plan 1 (Foundation) complete. AWS account setup is part of this plan.

**Frontend:** Deferred to Plan 3. This plan is backend-only + API testing.

---

## File Structure (new/modified files)

```
apps/api/
├── package.json                          # MODIFY: add @aws-sdk/client-sesv2, handlebars
├── src/
│   ├── config.ts                         # MODIFY: add AWS env vars
│   ├── server.ts                         # MODIFY: register new routes + cron
│   ├── db/
│   │   └── schema.ts                     # MODIFY: add 8 new tables + relations
│   ├── routes/
│   │   ├── domains.ts                    # CREATE: domain CRUD + verify
│   │   ├── senders.ts                    # CREATE: sender identity CRUD
│   │   ├── templates.ts                  # CREATE: template CRUD with versioning
│   │   ├── emails.ts                     # CREATE: POST /emails/send
│   │   ├── messages.ts                   # CREATE: message list + detail
│   │   ├── contacts.ts                   # CREATE: contact list + detail
│   │   ├── suppressions.ts              # CREATE: suppression CRUD
│   │   ├── usage.ts                      # CREATE: usage stats
│   │   └── webhooks-ses.ts              # CREATE: SNS webhook receiver
│   ├── services/
│   │   ├── ses.ts                        # CREATE: SES v2 client wrapper
│   │   ├── dns.ts                        # CREATE: DNS lookup helpers
│   │   ├── sns.ts                        # CREATE: SNS signature verification
│   │   ├── contacts.ts                   # CREATE: contact upsert logic
│   │   ├── suppressions.ts              # CREATE: suppression check
│   │   ├── templates.ts                  # CREATE: Handlebars rendering
│   │   └── idempotency.ts               # CREATE: idempotency key check/store
│   ├── cron/
│   │   ├── index.ts                      # CREATE: cron scheduler setup
│   │   ├── domain-verify.ts             # CREATE: poll DNS for pending domains
│   │   ├── usage-aggregate.ts           # CREATE: no-op placeholder (usage tracked inline)
│   │   └── cleanup.ts                    # CREATE: expire idempotency keys
│   └── lib/
│       └── pagination.ts                 # CREATE: pagination helper

packages/shared/src/
├── types/
│   ├── domain.ts                         # CREATE
│   ├── sender.ts                         # CREATE
│   ├── template.ts                       # CREATE
│   ├── contact.ts                        # CREATE
│   ├── message.ts                        # CREATE
│   ├── suppression.ts                    # CREATE
│   └── email.ts                          # CREATE: send request/response types
├── constants/
│   └── blocked-domains.ts               # CREATE: free email provider blocklist
├── validation/
│   ├── domain.ts                         # CREATE
│   ├── sender.ts                         # CREATE
│   ├── template.ts                       # CREATE
│   ├── email.ts                          # CREATE: send request schema
│   └── suppression.ts                    # CREATE
└── index.ts                              # MODIFY: add new exports

infra/
├── iam-policy.json                       # CREATE
└── ses-setup.md                          # CREATE: AWS setup instructions
```

---

## Task 1: AWS Setup Documentation + Dependencies

**Files:**
- Create: `infra/iam-policy.json`
- Create: `infra/ses-setup.md`
- Modify: `apps/api/package.json` (add AWS SDK, handlebars)
- Modify: `apps/api/src/config.ts` (add AWS env vars)

- [ ] **Step 1: Create IAM policy**

```json
// infra/iam-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:CreateEmailIdentity",
        "ses:DeleteEmailIdentity",
        "ses:GetEmailIdentity",
        "ses:GetAccount",
        "ses:PutEmailIdentityDkimSigningAttributes"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Subscribe",
        "sns:ConfirmSubscription"
      ],
      "Resource": "arn:aws:sns:us-east-1:*:mailhub-ses-events"
    }
  ]
}
```

- [ ] **Step 2: Create AWS setup guide**

```markdown
// infra/ses-setup.md
# AWS Setup for MailHub

## 1. Create AWS Account
- Go to https://aws.amazon.com and create an account
- Enable MFA on root account

## 2. Create IAM User
- IAM → Users → Create user: `mailhub-ses-sender`
- Attach policy from `iam-policy.json` (create as custom policy)
- Create access key (CLI use case)
- Save Access Key ID and Secret Access Key

## 3. SES Configuration (us-east-1)
- SES → Configuration sets → Create: `mailhub-production`
- Add event destination:
  - Name: `mailhub-events`
  - Event types: Send, Delivery, Bounce, Complaint, Reject
  - Destination: SNS topic (create new: `mailhub-ses-events`)

## 4. SNS Subscription
- SNS → Topics → `mailhub-ses-events` → Create subscription
  - Protocol: HTTPS
  - Endpoint: `https://your-app-domain.com/api/v1/webhooks/ses`
  - (Subscription confirmation will be handled by the app)

## 5. Request SES Production Access
- SES → Account dashboard → Request production access
- Describe use case: "Transactional email SaaS for sending password resets, order confirmations, and notifications"
- Expected volume: Under 50,000 emails/month initially

## 6. Environment Variables
Add to your .env / Coolify environment:
```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
SES_CONFIGURATION_SET=mailhub-production
```
```

- [ ] **Step 3: Install AWS SDK and Handlebars**

Run: `cd /Users/macminipro/Documents/github/mailhub && pnpm --filter @mailhub/api add @aws-sdk/client-sesv2 handlebars`

- [ ] **Step 4: Update config.ts with AWS env vars**

Add to the envSchema in `apps/api/src/config.ts`:
```typescript
AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
AWS_REGION: z.string().default('us-east-1'),
SES_CONFIGURATION_SET: z.string().default('mailhub-production'),
```

Note: AWS vars are optional so the app can start without them (for frontend-only dev). SES calls will fail gracefully if not configured.

- [ ] **Step 5: Update .env.example**

Add AWS section:
```bash
# AWS SES
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
SES_CONFIGURATION_SET=mailhub-production
```

- [ ] **Step 6: Commit**

```bash
git add infra/ apps/api/package.json apps/api/src/config.ts .env.example pnpm-lock.yaml
git commit -m "feat: add AWS SDK, Handlebars deps, IAM policy, and SES setup guide"
```

---

## Task 2: Database Schema — Email Tables

**Files:**
- Modify: `apps/api/src/db/schema.ts`

Add 8 new tables and their relations to the existing schema file.

- [ ] **Step 1: Add domains table**

```typescript
export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  domain: text('domain').unique().notNull(),
  status: text('status').default('pending').notNull(),
  sesIdentityArn: text('ses_identity_arn'),
  verificationToken: text('verification_token'),
  dkimTokens: jsonb('dkim_tokens'),
  dnsRecords: jsonb('dns_records'),
  spfVerified: boolean('spf_verified').default(false).notNull(),
  dkimVerified: boolean('dkim_verified').default(false).notNull(),
  dmarcVerified: boolean('dmarc_verified').default(false).notNull(),
  dmarcPolicy: text('dmarc_policy'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('domains_tenant_id_idx').on(table.tenantId),
])
```

- [ ] **Step 2: Add sender_identities table**

```typescript
export const senderIdentities = pgTable('sender_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  domainId: uuid('domain_id').references(() => domains.id).notNull(),
  email: text('email').notNull(),
  name: text('name'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('sender_identities_tenant_email_idx').on(table.tenantId, table.email),
  index('sender_identities_tenant_id_idx').on(table.tenantId),
])
```

- [ ] **Step 3: Add templates and template_versions tables**

```typescript
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  currentVersion: integer('current_version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('templates_tenant_name_idx').on(table.tenantId, table.name),
  index('templates_tenant_id_idx').on(table.tenantId),
])

export const templateVersions = pgTable('template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => templates.id).notNull(),
  version: integer('version').notNull(),
  subject: text('subject').notNull(),
  htmlBody: text('html_body'),
  textBody: text('text_body'),
  variables: jsonb('variables'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('template_versions_template_version_idx').on(table.templateId, table.version),
])
```

- [ ] **Step 4: Add contacts table**

```typescript
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  email: text('email').notNull(),
  status: text('status').default('active').notNull(),
  suppressionReason: text('suppression_reason'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastEmailedAt: timestamp('last_emailed_at', { withTimezone: true }),
  totalSent: integer('total_sent').default(0).notNull(),
  totalDelivered: integer('total_delivered').default(0).notNull(),
  totalBounced: integer('total_bounced').default(0).notNull(),
  totalComplained: integer('total_complained').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('contacts_tenant_email_idx').on(table.tenantId, table.email),
  index('contacts_tenant_id_idx').on(table.tenantId),
])
```

- [ ] **Step 5: Add messages and message_events tables**

```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  fromEmail: text('from_email').notNull(),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  templateId: uuid('template_id').references(() => templates.id),
  templateVersion: integer('template_version'),
  status: text('status').default('accepted').notNull(),
  sesMessageId: text('ses_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('messages_tenant_contact_idx').on(table.tenantId, table.contactId),
  index('messages_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('messages_tenant_status_idx').on(table.tenantId, table.status),
  index('messages_ses_message_id_idx').on(table.sesMessageId),
])

export const messageEvents = pgTable('message_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  eventType: text('event_type').notNull(),
  rawEvent: jsonb('raw_event'),
  bounceType: text('bounce_type'),
  bounceSubtype: text('bounce_subtype'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('message_events_message_id_idx').on(table.messageId),
  index('message_events_tenant_created_idx').on(table.tenantId, table.createdAt),
])
```

- [ ] **Step 6: Add suppressions table**

```typescript
export const suppressions = pgTable('suppressions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  email: text('email').notNull(),
  reason: text('reason').notNull(),
  sourceMessageId: uuid('source_message_id').references(() => messages.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('suppressions_tenant_email_idx').on(table.tenantId, table.email),
  index('suppressions_email_idx').on(table.email),
])
```

Note: The partial unique index for global suppressions (`WHERE tenant_id IS NULL`) cannot be expressed in Drizzle schema. Add it as a raw SQL migration step after generating.

- [ ] **Step 7: Add usage_daily and idempotency_keys tables**

```typescript
export const usageDaily = pgTable('usage_daily', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  date: timestamp('date', { mode: 'date' }).notNull(),
  emailsSent: integer('emails_sent').default(0).notNull(),
  emailsDelivered: integer('emails_delivered').default(0).notNull(),
  emailsBounced: integer('emails_bounced').default(0).notNull(),
  emailsComplained: integer('emails_complained').default(0).notNull(),
  emailsRejected: integer('emails_rejected').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('usage_daily_tenant_date_idx').on(table.tenantId, table.date),
])

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  key: text('key').notNull(),
  messageId: uuid('message_id').references(() => messages.id),
  responseBody: jsonb('response_body'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idempotency_keys_tenant_key_idx').on(table.tenantId, table.key),
  index('idempotency_keys_expires_idx').on(table.expiresAt),
])
```

- [ ] **Step 8: Add all new relations**

```typescript
export const domainsRelations = relations(domains, ({ one, many }) => ({
  tenant: one(tenants, { fields: [domains.tenantId], references: [tenants.id] }),
  senderIdentities: many(senderIdentities),
}))

export const senderIdentitiesRelations = relations(senderIdentities, ({ one }) => ({
  tenant: one(tenants, { fields: [senderIdentities.tenantId], references: [tenants.id] }),
  domain: one(domains, { fields: [senderIdentities.domainId], references: [domains.id] }),
}))

export const templatesRelations = relations(templates, ({ one, many }) => ({
  tenant: one(tenants, { fields: [templates.tenantId], references: [tenants.id] }),
  versions: many(templateVersions),
}))

export const templateVersionsRelations = relations(templateVersions, ({ one }) => ({
  template: one(templates, { fields: [templateVersions.templateId], references: [templates.id] }),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [contacts.tenantId], references: [tenants.id] }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
  tenant: one(tenants, { fields: [messages.tenantId], references: [tenants.id] }),
  contact: one(contacts, { fields: [messages.contactId], references: [contacts.id] }),
  template: one(templates, { fields: [messages.templateId], references: [templates.id] }),
  events: many(messageEvents),
}))

export const messageEventsRelations = relations(messageEvents, ({ one }) => ({
  message: one(messages, { fields: [messageEvents.messageId], references: [messages.id] }),
  tenant: one(tenants, { fields: [messageEvents.tenantId], references: [tenants.id] }),
}))

export const suppressionsRelations = relations(suppressions, ({ one }) => ({
  tenant: one(tenants, { fields: [suppressions.tenantId], references: [tenants.id] }),
  sourceMessage: one(messages, { fields: [suppressions.sourceMessageId], references: [messages.id] }),
}))

export const usageDailyRelations = relations(usageDaily, ({ one }) => ({
  tenant: one(tenants, { fields: [usageDaily.tenantId], references: [tenants.id] }),
}))

export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  tenant: one(tenants, { fields: [idempotencyKeys.tenantId], references: [tenants.id] }),
  message: one(messages, { fields: [idempotencyKeys.messageId], references: [messages.id] }),
}))
```

Also update `tenantsRelations` to add the new many relations:
```typescript
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  user: one(users, { fields: [tenants.userId], references: [users.id] }),
  apiKeys: many(apiKeys),
  domains: many(domains),
  senderIdentities: many(senderIdentities),
  templates: many(templates),
  contacts: many(contacts),
  messages: many(messages),
  suppressions: many(suppressions),
  usageDaily: many(usageDaily),
}))
```

- [ ] **Step 9: Generate and run migration**

Run:
```bash
cd /Users/macminipro/Documents/github/mailhub/apps/api
DATABASE_URL="postgres://postgres:8O6KYBDxRtLLBzYmAfE64SUCmbJ4Ze4zv3lZgYBzd7ow7mWzax86O5vfEbCfSFWU@46.225.116.194:5432/mailhub?sslmode=require" npx drizzle-kit generate
DATABASE_URL="postgres://postgres:8O6KYBDxRtLLBzYmAfE64SUCmbJ4Ze4zv3lZgYBzd7ow7mWzax86O5vfEbCfSFWU@46.225.116.194:5432/mailhub?sslmode=require" npx drizzle-kit migrate
```

After migration, add the partial unique index for global suppressions via raw SQL:
```bash
node --input-type=module -e "
import postgres from '../../node_modules/.pnpm/postgres@3.4.8/node_modules/postgres/src/index.js';
const sql = postgres('postgres://postgres:8O6KYBDxRtLLBzYmAfE64SUCmbJ4Ze4zv3lZgYBzd7ow7mWzax86O5vfEbCfSFWU@46.225.116.194:5432/mailhub?sslmode=require');
await sql.unsafe('CREATE UNIQUE INDEX IF NOT EXISTS suppressions_global_email_idx ON suppressions (email) WHERE tenant_id IS NULL');
console.log('Partial unique index created');
await sql.end();
"
```

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/db/ apps/api/drizzle/
git commit -m "feat: add email tables — domains, senders, templates, contacts, messages, events, suppressions, usage, idempotency"
```

---

## Task 3: Shared Types + Validation Schemas

**Files:**
- Create: `packages/shared/src/types/domain.ts`
- Create: `packages/shared/src/types/sender.ts`
- Create: `packages/shared/src/types/template.ts`
- Create: `packages/shared/src/types/contact.ts`
- Create: `packages/shared/src/types/message.ts`
- Create: `packages/shared/src/types/suppression.ts`
- Create: `packages/shared/src/types/email.ts`
- Create: `packages/shared/src/constants/blocked-domains.ts`
- Create: `packages/shared/src/validation/domain.ts`
- Create: `packages/shared/src/validation/sender.ts`
- Create: `packages/shared/src/validation/template.ts`
- Create: `packages/shared/src/validation/email.ts`
- Create: `packages/shared/src/validation/suppression.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create all type files**

Create types for Domain, SenderIdentity, Template, TemplateVersion, Contact, Message, MessageEvent, Suppression, UsageDaily, and the send email request/response types. Each file should mirror the DB schema fields as TypeScript interfaces.

Key types for `email.ts`:
```typescript
export interface SendEmailRequest {
  from: string
  to: string
  subject?: string
  html?: string
  text?: string
  template?: string
  template_version?: number
  variables?: Record<string, string>
  idempotency_key?: string
}

export interface SendEmailResponse {
  id: string
  status: string
  ses_message_id: string
  contact_id: string
}
```

- [ ] **Step 2: Create blocked domains list**

```typescript
// packages/shared/src/constants/blocked-domains.ts
export const BLOCKED_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
  'protonmail.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com',
  'live.com', 'msn.com', 'gmx.com', 'fastmail.com', 'tutanota.com',
  'hey.com', 'pm.me', 'proton.me', 'yahoo.co.uk', 'yahoo.co.in',
  'outlook.co.uk', 'hotmail.co.uk', 'googlemail.com', 'me.com',
  'mac.com', 'mail.ru', 'inbox.com', 'rocketmail.com', 'ymail.com',
])
```

- [ ] **Step 3: Create validation schemas**

`validation/domain.ts`:
```typescript
import { z } from 'zod'
export const createDomainSchema = z.object({
  domain: z.string().min(1).max(255).trim().toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/, 'Invalid domain format'),
})
```

`validation/sender.ts`:
```typescript
import { z } from 'zod'
export const createSenderSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  name: z.string().max(100).trim().optional(),
})
```

`validation/template.ts`:
```typescript
import { z } from 'zod'
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100).trim().regex(/^[a-z0-9-_]+$/, 'Name must be lowercase alphanumeric with hyphens/underscores'),
  description: z.string().max(500).trim().optional(),
  subject: z.string().min(1).max(500),
  html_body: z.string().optional(),
  text_body: z.string().optional(),
  variables: z.array(z.string()).optional(),
})

export const updateTemplateSchema = z.object({
  subject: z.string().min(1).max(500),
  html_body: z.string().optional(),
  text_body: z.string().optional(),
  variables: z.array(z.string()).optional(),
})
```

`validation/email.ts`:
```typescript
import { z } from 'zod'
export const sendEmailSchema = z.object({
  from: z.string().min(1).max(500),
  to: z.string().email().max(255),
  subject: z.string().min(1).max(500).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  template: z.string().optional(),
  template_version: z.number().int().positive().optional(),
  variables: z.record(z.string()).optional(),
  idempotency_key: z.string().max(255).optional(),
}).refine(
  (data) => (data.subject && (data.html || data.text)) || data.template,
  { message: 'Provide either subject+body (html/text) for raw send, or template name for template send' }
)
```

`validation/suppression.ts`:
```typescript
import { z } from 'zod'
export const createSuppressionSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  reason: z.string().default('manual'),
})
```

- [ ] **Step 4: Update barrel exports**

Add all new exports to `packages/shared/src/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types, constants, and validation schemas for email features"
```

---

## Task 4: Pagination Helper + SES Service

**Files:**
- Create: `apps/api/src/lib/pagination.ts`
- Create: `apps/api/src/services/ses.ts`

- [ ] **Step 1: Create pagination helper**

```typescript
// apps/api/src/lib/pagination.ts
import { PAGINATION } from '@mailhub/shared'

export function parsePagination(query: any) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  }
}
```

- [ ] **Step 2: Create SES service wrapper**

```typescript
// apps/api/src/services/ses.ts
import {
  SESv2Client,
  SendEmailCommand,
  CreateEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  GetEmailIdentityCommand,
} from '@aws-sdk/client-sesv2'
import { config } from '../config.js'

const sesClient = new SESv2Client({
  region: config.AWS_REGION,
  credentials: config.AWS_ACCESS_KEY_ID ? {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
  } : undefined,
})

export async function createDomainIdentity(domain: string) {
  const command = new CreateEmailIdentityCommand({
    EmailIdentity: domain,
  })
  return sesClient.send(command)
}

export async function deleteDomainIdentity(domain: string) {
  const command = new DeleteEmailIdentityCommand({
    EmailIdentity: domain,
  })
  return sesClient.send(command)
}

export async function getDomainIdentity(domain: string) {
  const command = new GetEmailIdentityCommand({
    EmailIdentity: domain,
  })
  return sesClient.send(command)
}

export async function sendEmail(params: {
  from: string
  to: string
  subject: string
  html?: string
  text?: string
  configurationSet: string
  tags: { Name: string; Value: string }[]
}) {
  const command = new SendEmailCommand({
    FromEmailAddress: params.from,
    Destination: { ToAddresses: [params.to] },
    Content: {
      Simple: {
        Subject: { Data: params.subject },
        Body: {
          ...(params.html ? { Html: { Data: params.html } } : {}),
          ...(params.text ? { Text: { Data: params.text } } : {}),
        },
      },
    },
    ConfigurationSetName: params.configurationSet,
    EmailTags: params.tags,
  })

  const result = await sesClient.send(command)
  return result.MessageId!
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/pagination.ts apps/api/src/services/ses.ts
git commit -m "feat: add pagination helper and SES v2 service wrapper"
```

---

## Task 5: DNS, SNS, Contacts, Suppressions, Templates, Idempotency Services

**Files:**
- Create: `apps/api/src/services/dns.ts`
- Create: `apps/api/src/services/sns.ts`
- Create: `apps/api/src/services/contacts.ts`
- Create: `apps/api/src/services/suppressions.ts`
- Create: `apps/api/src/services/templates.ts`
- Create: `apps/api/src/services/idempotency.ts`

- [ ] **Step 1: Create DNS lookup helpers**

```typescript
// apps/api/src/services/dns.ts
import { promises as dns } from 'node:dns'

export async function checkSpf(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain)
    return records.flat().some(r => r.includes('amazonses.com'))
  } catch { return false }
}

export async function checkDmarc(domain: string): Promise<{ exists: boolean; policy: string | null }> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`)
    const dmarc = records.flat().find(r => r.startsWith('v=DMARC1'))
    if (!dmarc) return { exists: false, policy: null }
    const match = dmarc.match(/p=(none|quarantine|reject)/)
    return { exists: true, policy: match ? match[1] : null }
  } catch { return { exists: false, policy: null } }
}

export async function checkDkimCname(name: string): Promise<boolean> {
  try {
    await dns.resolveCname(name)
    return true
  } catch { return false }
}
```

- [ ] **Step 2: Create SNS signature verification**

```typescript
// apps/api/src/services/sns.ts
import { createVerify } from 'node:crypto'

const SNS_CERT_CACHE = new Map<string, string>()

async function fetchCertificate(url: string): Promise<string> {
  if (SNS_CERT_CACHE.has(url)) return SNS_CERT_CACHE.get(url)!

  // Validate URL is from AWS
  const parsed = new URL(url)
  if (!parsed.hostname.endsWith('.amazonaws.com')) {
    throw new Error('Invalid SNS certificate URL')
  }

  const response = await fetch(url)
  const cert = await response.text()
  SNS_CERT_CACHE.set(url, cert)
  return cert
}

function buildSignatureString(message: any): string {
  if (message.Type === 'Notification') {
    return [
      'Message', message.Message,
      'MessageId', message.MessageId,
      ...(message.Subject ? ['Subject', message.Subject] : []),
      'Timestamp', message.Timestamp,
      'TopicArn', message.TopicArn,
      'Type', message.Type,
    ].join('\n') + '\n'
  }
  // SubscriptionConfirmation
  return [
    'Message', message.Message,
    'MessageId', message.MessageId,
    'SubscribeURL', message.SubscribeURL,
    'Timestamp', message.Timestamp,
    'Token', message.Token,
    'TopicArn', message.TopicArn,
    'Type', message.Type,
  ].join('\n') + '\n'
}

export async function verifySnsSignature(message: any): Promise<boolean> {
  try {
    const cert = await fetchCertificate(message.SigningCertURL)
    const sigString = buildSignatureString(message)
    const verify = createVerify('SHA1')
    verify.update(sigString)
    return verify.verify(cert, message.Signature, 'base64')
  } catch {
    return false
  }
}

export async function confirmSubscription(subscribeUrl: string): Promise<void> {
  await fetch(subscribeUrl)
}
```

- [ ] **Step 3: Create contact upsert service**

```typescript
// apps/api/src/services/contacts.ts
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { contacts } from '../db/schema.js'

export async function upsertContact(tenantId: string, email: string) {
  const [contact] = await db.insert(contacts).values({
    tenantId,
    email: email.toLowerCase(),
    firstSeenAt: new Date(),
  }).onConflictDoUpdate({
    target: [contacts.tenantId, contacts.email],
    set: {
      lastEmailedAt: new Date(),
      totalSent: sql`${contacts.totalSent} + 1`,
      updatedAt: new Date(),
    },
  }).returning()

  return contact
}

export async function updateContactStats(
  contactId: string,
  field: 'totalDelivered' | 'totalBounced' | 'totalComplained',
) {
  await db.update(contacts)
    .set({
      [field]: sql`${contacts[field]} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
}

export async function suppressContact(contactId: string, reason: string) {
  await db.update(contacts)
    .set({
      status: 'suppressed',
      suppressionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
}
```

- [ ] **Step 4: Create suppression check service**

```typescript
// apps/api/src/services/suppressions.ts
import { eq, and, isNull, or } from 'drizzle-orm'
import { db } from '../db/client.js'
import { suppressions } from '../db/schema.js'

export async function isEmailSuppressed(tenantId: string, email: string): Promise<boolean> {
  const suppression = await db.query.suppressions.findFirst({
    where: or(
      and(eq(suppressions.tenantId, tenantId), eq(suppressions.email, email.toLowerCase())),
      and(isNull(suppressions.tenantId), eq(suppressions.email, email.toLowerCase())),
    ),
  })
  return !!suppression
}

export async function addSuppression(params: {
  tenantId: string | null
  email: string
  reason: string
  sourceMessageId?: string
}) {
  await db.insert(suppressions).values({
    tenantId: params.tenantId,
    email: params.email.toLowerCase(),
    reason: params.reason,
    sourceMessageId: params.sourceMessageId,
  }).onConflictDoNothing()
}
```

- [ ] **Step 5: Create template rendering service**

```typescript
// apps/api/src/services/templates.ts
import Handlebars from 'handlebars'

// Compile in strict mode to prevent prototype access
const compileOptions = { strict: true }

export function renderTemplate(
  subject: string,
  htmlBody: string | null,
  textBody: string | null,
  variables: Record<string, string>,
): { subject: string; html: string | undefined; text: string | undefined } {
  const renderedSubject = Handlebars.compile(subject, compileOptions)(variables)
  const html = htmlBody ? Handlebars.compile(htmlBody, compileOptions)(variables) : undefined
  const text = textBody ? Handlebars.compile(textBody, compileOptions)(variables) : undefined

  return { subject: renderedSubject, html, text }
}
```

- [ ] **Step 6: Create idempotency service**

```typescript
// apps/api/src/services/idempotency.ts
import { eq, and, gt } from 'drizzle-orm'
import { db } from '../db/client.js'
import { idempotencyKeys } from '../db/schema.js'

export async function checkIdempotencyKey(tenantId: string, key: string) {
  const existing = await db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.tenantId, tenantId),
      eq(idempotencyKeys.key, key),
      gt(idempotencyKeys.expiresAt, new Date()),
    ),
  })
  return existing?.responseBody ?? null
}

export async function storeIdempotencyKey(params: {
  tenantId: string
  key: string
  messageId: string
  responseBody: any
}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  await db.insert(idempotencyKeys).values({
    tenantId: params.tenantId,
    key: params.key,
    messageId: params.messageId,
    responseBody: params.responseBody,
    expiresAt,
  }).onConflictDoNothing()
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/services/
git commit -m "feat: add DNS, SNS, contacts, suppressions, templates, and idempotency services"
```

---

## Task 6: Domain Routes

**Files:**
- Create: `apps/api/src/routes/domains.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create domain routes**

Implements:
- `POST /api/v1/tenants/:tenantId/domains` — validate domain, check blocklist, check uniqueness, call SES createEmailIdentity, store DNS records, return domain
- `GET /api/v1/tenants/:tenantId/domains` — list domains for tenant
- `GET /api/v1/tenants/:tenantId/domains/:domainId` — domain detail with DNS checklist
- `POST /api/v1/tenants/:tenantId/domains/:domainId/verify` — trigger immediate DNS check
- `DELETE /api/v1/tenants/:tenantId/domains/:domainId` — delete from SES + DB

All routes use `requireJwt`, `requireUser`, `requireTenantOwnership`.

Domain creation flow:
1. Parse and validate domain name
2. Check against BLOCKED_DOMAINS
3. Check uniqueness (domain column is unique across all tenants)
4. Call `createDomainIdentity(domain)` — SES returns DKIM tokens
5. Build dns_records JSONB with DKIM CNAMEs, SPF recommendation, DMARC recommendation
6. Store domain record with status 'pending'
7. Return domain with DNS records

Verify endpoint flow:
1. Call `getDomainIdentity(domain)` for SES verification status
2. Run DNS checks (checkSpf, checkDmarc, checkDkimCname for each token)
3. Update domain record with results
4. If DKIM verified by SES, set status = 'verified', verifiedAt = now()

- [ ] **Step 2: Register in server.ts**

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/domains.ts apps/api/src/server.ts
git commit -m "feat: add domain management routes with SES verification"
```

---

## Task 7: Sender Identity + Template Routes

**Files:**
- Create: `apps/api/src/routes/senders.ts`
- Create: `apps/api/src/routes/templates.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create sender identity routes**

- `POST /api/v1/tenants/:tenantId/senders` — validate email, verify domain is verified, check domain belongs to tenant, create sender
- `GET /api/v1/tenants/:tenantId/senders` — list senders
- `DELETE /api/v1/tenants/:tenantId/senders/:senderId` — delete sender

- [ ] **Step 2: Create template routes**

- `POST /api/v1/tenants/:tenantId/templates` — create template + version 1
- `GET /api/v1/tenants/:tenantId/templates` — list templates
- `GET /api/v1/tenants/:tenantId/templates/:templateId` — detail with current version content
- `PUT /api/v1/tenants/:tenantId/templates/:templateId` — create new version, bump currentVersion
- `GET /api/v1/tenants/:tenantId/templates/:templateId/versions` — list versions
- `GET /api/v1/tenants/:tenantId/templates/:templateId/versions/:version` — specific version
- `DELETE /api/v1/tenants/:tenantId/templates/:templateId` — delete template

Template creation stores subject, html_body, text_body, variables in template_versions table. PUT creates a new version with incremented version number.

- [ ] **Step 3: Register in server.ts**

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/senders.ts apps/api/src/routes/templates.ts apps/api/src/server.ts
git commit -m "feat: add sender identity and template management routes"
```

---

## Task 8: Email Send API

**Files:**
- Create: `apps/api/src/routes/emails.ts`
- Modify: `apps/api/src/server.ts`

This is the core route: `POST /api/v1/emails/send` (API key auth).

- [ ] **Step 1: Create email send route**

Implements the full sending flow from spec Section 6:

```
1. requireApiKey middleware (already checks tenant status)
2. Validate request body (sendEmailSchema)
3. Check daily send limit (query usage_daily for today)
4. Check idempotency key (if provided, return cached response)
5. Parse from address (RFC 5322 or plain email)
6. Validate sender against sender_identities (exact email match, domain verified)
7. Upsert contact
8. Check suppression (tenant + global)
9. If template send: load template + version, render with Handlebars
10. Call SES sendEmail (synchronous)
11. Store message record
12. Store idempotency key (if provided)
13. Increment usage_daily (upsert)
14. Return response
```

From address parsing:
```typescript
function parseFromAddress(from: string): { email: string; name?: string } {
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/)
  if (match) return { name: match[1], email: match[2].toLowerCase() }
  return { email: from.toLowerCase() }
}
```

- [ ] **Step 2: Register in server.ts**

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/emails.ts apps/api/src/server.ts
git commit -m "feat: add email send API with SES integration, idempotency, and suppression checks"
```

---

## Task 9: SNS Webhook + Event Processing

**Files:**
- Create: `apps/api/src/routes/webhooks-ses.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create SNS webhook route**

`POST /api/v1/webhooks/ses` — NO auth middleware (authenticated via SNS signature).

Flow:
1. Parse SNS message from request body
2. Verify SNS signature
3. If SubscriptionConfirmation → confirm subscription (GET the SubscribeURL)
4. If Notification → parse SES event from Message field
5. Extract ses_message_id, tenant_id, message_id from SES tags
6. Look up message by ses_message_id
7. Idempotency: check if message_events already has this (message_id + event_type)
8. Store message_event
9. Update message status
10. For bounces: if Permanent → addSuppression + suppressContact
11. For complaints: always addSuppression + suppressContact
12. Update contact stats (totalDelivered, totalBounced, totalComplained)
13. Update usage_daily (emailsDelivered, emailsBounced, emailsComplained)

- [ ] **Step 2: Register in server.ts (no auth prefix)**

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/webhooks-ses.ts apps/api/src/server.ts
git commit -m "feat: add SNS webhook for SES event ingestion with bounce/complaint processing"
```

---

## Task 10: Messages, Contacts, Suppressions, Usage Routes

**Files:**
- Create: `apps/api/src/routes/messages.ts`
- Create: `apps/api/src/routes/contacts.ts`
- Create: `apps/api/src/routes/suppressions.ts`
- Create: `apps/api/src/routes/usage.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create message routes**

- `GET /api/v1/tenants/:tenantId/messages` — paginated, filterable by status, date range, email
- `GET /api/v1/tenants/:tenantId/messages/:messageId` — detail with event timeline (include message_events)

- [ ] **Step 2: Create contact routes**

- `GET /api/v1/tenants/:tenantId/contacts` — paginated, searchable by email, filterable by status
- `GET /api/v1/tenants/:tenantId/contacts/:contactId` — detail with stats
- `GET /api/v1/tenants/:tenantId/contacts/:contactId/messages` — messages for this contact

- [ ] **Step 3: Create suppression routes**

- `GET /api/v1/tenants/:tenantId/suppressions` — paginated
- `POST /api/v1/tenants/:tenantId/suppressions` — manually suppress (also suppresses the contact)
- `DELETE /api/v1/tenants/:tenantId/suppressions/:id` — remove suppression (also reactivates contact)

- [ ] **Step 4: Create usage routes**

- `GET /api/v1/tenants/:tenantId/usage` — daily breakdown for date range
- `GET /api/v1/tenants/:tenantId/usage/summary` — totals for current month

- [ ] **Step 5: Register all in server.ts**

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/messages.ts apps/api/src/routes/contacts.ts apps/api/src/routes/suppressions.ts apps/api/src/routes/usage.ts apps/api/src/server.ts
git commit -m "feat: add messages, contacts, suppressions, and usage routes with pagination"
```

---

## Task 11: Cron Jobs

**Files:**
- Create: `apps/api/src/cron/index.ts`
- Create: `apps/api/src/cron/domain-verify.ts`
- Create: `apps/api/src/cron/cleanup.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create domain verification cron**

```typescript
// apps/api/src/cron/domain-verify.ts
// Every 5 minutes: for each domain with status='pending',
// call getDomainIdentity, check DNS (SPF, DMARC, DKIM CNAMEs),
// update domain record. If SES says verified → set status='verified'.
```

- [ ] **Step 2: Create cleanup cron**

```typescript
// apps/api/src/cron/cleanup.ts
// Every 24 hours:
// 1. Delete expired idempotency keys (expiresAt < now)
// 2. Delete messages + message_events older than 30 days
// 3. Delete audit_logs older than 90 days
```

- [ ] **Step 3: Create cron scheduler**

```typescript
// apps/api/src/cron/index.ts
import cron from 'node-cron'
import { verifyPendingDomains } from './domain-verify.js'
import { cleanup } from './cleanup.js'

export function startCronJobs() {
  cron.schedule('*/5 * * * *', verifyPendingDomains)  // every 5 min
  cron.schedule('0 3 * * *', cleanup)                  // daily at 3am
}
```

- [ ] **Step 4: Register in server.ts**

Add after routes, before the listen call:
```typescript
import { startCronJobs } from './cron/index.js'
startCronJobs()
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/cron/ apps/api/src/server.ts
git commit -m "feat: add cron jobs for domain verification and data cleanup"
```

---

## Task 12: Build Verification + Code Simplifier

- [ ] **Step 1: Run TypeScript check**

Run: `cd /Users/macminipro/Documents/github/mailhub/apps/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run full build**

Run: `pnpm build`
Expected: All 3 packages build successfully

- [ ] **Step 3: Run code-simplifier**

Invoke the `code-simplifier` agent on all new files in apps/api/src/.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: code quality improvements from code-simplifier review"
```

---

## Summary

After completing all 12 tasks:

- 8 new database tables with migrations applied
- SES v2 integration (send, domain verification)
- SNS webhook for delivery/bounce/complaint events
- Domain management with DNS verification
- Sender identity management
- Template management with Handlebars rendering
- Email send API with full validation pipeline
- Contact auto-capture and suppression enforcement
- Idempotency key support
- Usage tracking
- Cron jobs for domain polling and data cleanup
- All routes paginated with standard response format

**Next:** Plan 3 — Frontend pages for domains, templates, contacts, messages, suppressions, usage dashboard.
