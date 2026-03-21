export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}
