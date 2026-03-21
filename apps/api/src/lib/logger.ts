import pino from 'pino'

export function createLogger(level: string) {
  return pino({
    level,
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  })
}
