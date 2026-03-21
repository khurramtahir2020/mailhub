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
