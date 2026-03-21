export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
} as const

export const SEND_LIMITS = {
  SANDBOX_DAILY: 50,
  PRODUCTION_DAILY_DEFAULT: 1000,
  PER_SECOND_PER_TENANT: 5,
} as const

export const API_KEY_PREFIX = 'mh_live_' as const
