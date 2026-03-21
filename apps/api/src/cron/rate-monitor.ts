import { eq, and, gte } from 'drizzle-orm'
import { db } from '../db/client.js'
import { tenants, usageDaily } from '../db/schema.js'
import pino from 'pino'

const logger = pino({ name: 'cron:rate-monitor' })

export async function monitorRates() {
  try {
    const activeTenants = await db.query.tenants.findMany({
      where: eq(tenants.status, 'active'),
    })

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    for (const tenant of activeTenants) {
      try {
        // Get last 24h usage
        const usage = await db.query.usageDaily.findMany({
          where: and(
            eq(usageDaily.tenantId, tenant.id),
            gte(usageDaily.date, yesterday.toISOString().slice(0, 10)),
          ),
        })

        const totalSent = usage.reduce((sum, u) => sum + u.emailsSent, 0)
        if (totalSent === 0) continue

        const totalBounced = usage.reduce((sum, u) => sum + u.emailsBounced, 0)
        const totalComplained = usage.reduce((sum, u) => sum + u.emailsComplained, 0)
        const bounceRate = (totalBounced / totalSent) * 100
        const complaintRate = (totalComplained / totalSent) * 100

        // Auto-suspend on high rates
        if (bounceRate > 10) {
          await db.update(tenants).set({
            status: 'suspended',
            suspendedAt: new Date(),
            suspensionReason: `Auto-suspended: bounce rate ${bounceRate.toFixed(1)}% exceeded 10%`,
            updatedAt: new Date(),
          }).where(eq(tenants.id, tenant.id))
          logger.warn({ tenantId: tenant.id, bounceRate }, 'Tenant auto-suspended for high bounce rate')
        } else if (complaintRate > 0.3) {
          await db.update(tenants).set({
            status: 'suspended',
            suspendedAt: new Date(),
            suspensionReason: `Auto-suspended: complaint rate ${complaintRate.toFixed(2)}% exceeded 0.3%`,
            updatedAt: new Date(),
          }).where(eq(tenants.id, tenant.id))
          logger.warn({ tenantId: tenant.id, complaintRate }, 'Tenant auto-suspended for high complaint rate')
        } else {
          if (bounceRate > 5) logger.warn({ tenantId: tenant.id, bounceRate }, 'High bounce rate warning')
          if (complaintRate > 0.1) logger.warn({ tenantId: tenant.id, complaintRate }, 'High complaint rate warning')
        }
      } catch (err) {
        logger.error({ tenantId: tenant.id, err }, 'Failed to check rates for tenant')
      }
    }
  } catch (err) {
    logger.error({ err }, 'Rate monitoring cron failed')
  }
}
