import { pgTable, uuid, text, boolean, integer, timestamp, index, jsonb, date, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  auth0Sub: text('auth0_sub').unique().notNull(),
  email: text('email').notNull(),
  name: text('name'),
  isPlatformAdmin: boolean('is_platform_admin').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  status: text('status').default('active').notNull(),
  mode: text('mode').default('sandbox').notNull(),
  dailySendLimit: integer('daily_send_limit').default(50).notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspensionReason: text('suspension_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull(),
  scope: text('scope').default('send_only').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('api_keys_key_prefix_idx').on(table.keyPrefix),
  index('api_keys_key_hash_idx').on(table.keyHash),
  index('api_keys_tenant_id_idx').on(table.tenantId),
])

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_logs_tenant_created_idx').on(table.tenantId, table.createdAt),
])

// Drizzle relations (required for db.query.* relational API)
export const usersRelations = relations(users, ({ many }) => ({
  tenants: many(tenants),
}))

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

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, { fields: [apiKeys.tenantId], references: [tenants.id] }),
}))

// --- Email Tables ---

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

export const usageDaily = pgTable('usage_daily', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  date: date('date').notNull(),
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
  index('idempotency_keys_expires_at_idx').on(table.expiresAt),
])

// --- Email Relations ---

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
