import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { domains } from '../db/schema.js'
import { getDomainIdentity } from '../services/ses.js'
import { checkSpf, checkDmarc } from '../services/dns.js'
import pino from 'pino'

const logger = pino({ name: 'cron:domain-verify' })

export async function verifyPendingDomains() {
  try {
    const pendingDomains = await db.query.domains.findMany({
      where: eq(domains.status, 'pending'),
    })

    if (pendingDomains.length === 0) return

    logger.info({ count: pendingDomains.length }, 'Checking pending domains')

    for (const domain of pendingDomains) {
      try {
        // Check SES status
        let dkimVerified = false
        try {
          const identity = await getDomainIdentity(domain.domain)
          dkimVerified = identity.DkimAttributes?.Status === 'SUCCESS'
        } catch {
          // SES not configured or domain not found — skip SES check
        }

        // Check DNS
        const spfVerified = await checkSpf(domain.domain)
        const dmarcResult = await checkDmarc(domain.domain)

        // Update domain
        await db.update(domains)
          .set({
            spfVerified,
            dkimVerified,
            dmarcVerified: dmarcResult.exists,
            dmarcPolicy: dmarcResult.policy,
            ...(dkimVerified ? { status: 'verified' as const, verifiedAt: new Date() } : {}),
            updatedAt: new Date(),
          })
          .where(eq(domains.id, domain.id))

        logger.info({ domain: domain.domain, dkimVerified, spfVerified, dmarcVerified: dmarcResult.exists }, 'Domain check complete')
      } catch (err) {
        logger.error({ domain: domain.domain, err }, 'Failed to verify domain')
      }
    }
  } catch (err) {
    logger.error({ err }, 'Domain verification cron failed')
  }
}
