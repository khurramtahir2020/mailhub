import { Errors } from '../lib/errors.js'

export function validateEmailContent(subject: string, html?: string | null, text?: string | null) {
  const body = html || text || ''

  // Reject empty subject
  if (!subject || subject.trim().length === 0) {
    throw Errors.validation('Subject cannot be empty')
  }

  // Reject empty body
  if (!body || body.trim().length === 0) {
    throw Errors.validation('Email body cannot be empty')
  }

  // Reject unsubscribe links (newsletter signal)
  const lowerBody = body.toLowerCase()
  if (lowerBody.includes('unsubscribe') || lowerBody.includes('list-unsubscribe') || lowerBody.includes('opt-out') || lowerBody.includes('opt out')) {
    throw Errors.validation('Transactional emails should not contain unsubscribe links. This platform is for transactional email only.')
  }

  // Warn: ALL CAPS subject (log but don't reject)
  if (subject === subject.toUpperCase() && subject.length > 5) {
    return { warning: 'Subject is ALL CAPS — this may trigger spam filters' }
  }

  // Warn: too many URLs (more than 5)
  const urlCount = (body.match(/https?:\/\//g) || []).length
  if (urlCount > 5) {
    return { warning: `Email contains ${urlCount} URLs — transactional emails typically have fewer links` }
  }

  return null
}
