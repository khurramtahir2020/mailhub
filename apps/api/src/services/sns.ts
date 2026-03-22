import { createVerify } from 'node:crypto'

const SNS_CERT_CACHE = new Map<string, string>()

async function fetchCertificate(url: string): Promise<string> {
  if (SNS_CERT_CACHE.has(url)) return SNS_CERT_CACHE.get(url)!
  const parsed = new URL(url)
  if (!parsed.hostname.endsWith('.amazonaws.com')) {
    throw new Error('Invalid SNS certificate URL')
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
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
  } catch { return false }
}

export async function confirmSubscription(subscribeUrl: string): Promise<void> {
  await fetch(subscribeUrl, { signal: AbortSignal.timeout(5000) })
}
