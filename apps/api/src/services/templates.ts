import Handlebars from 'handlebars'

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
