import { PAGINATION } from '@mailhub/shared'

export function parsePagination(query: any) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  }
}
