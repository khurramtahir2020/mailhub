export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  unauthorized: (msg = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', msg),
  forbidden: (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg),
  notFound: (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} not found`),
  conflict: (msg: string) => new AppError(409, 'CONFLICT', msg),
  validation: (msg: string) => new AppError(400, 'VALIDATION_ERROR', msg),
  tenantSuspended: () => new AppError(403, 'TENANT_SUSPENDED', 'Tenant is suspended'),
} as const
