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
