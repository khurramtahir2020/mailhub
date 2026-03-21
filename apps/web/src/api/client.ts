type FetchOptions = RequestInit & {
  getToken?: () => Promise<string | undefined>
}

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { getToken, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)

  if (getToken) {
    const token = await getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  if (fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: response.statusText },
    }))
    throw error
  }

  return response.json()
}
