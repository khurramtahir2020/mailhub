import cron from 'node-cron'
import { verifyPendingDomains } from './domain-verify.js'
import { cleanup } from './cleanup.js'
import pino from 'pino'

const logger = pino({ name: 'cron' })

export function startCronJobs() {
  logger.info('Starting cron jobs')

  // Check pending domain DNS every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await verifyPendingDomains()
  })

  // Daily cleanup at 3am UTC
  cron.schedule('0 3 * * *', async () => {
    await cleanup()
  })
}
