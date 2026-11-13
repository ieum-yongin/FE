
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'
).replace(/\/$/, '')

export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK !== 'false'

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiRequest(
  endpoint,
  { method = 'GET', body, headers = {}, ...options } = {}
) {
  const path = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError('백엔드에 연결하지 못했습니다. 서버 주소, HTTPS 및 CORS 허용 설정을 확인해 주세요.', 0)
  }

  const contentType =
    response.headers.get('content-type') || ''

  let data = null

  if (response.status !== 204) {
    data = contentType.includes('application/json')
      ? await response.json()
      : await response.text()
  }

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : `서버 요청 실패 (HTTP ${response.status})`

    throw new ApiError(message, response.status, data)
  }

  return data
}

export const api = {
  get(endpoint, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: 'GET',
    })
  },

  post(endpoint, body, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body,
    })
  },

  patch(endpoint, body, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    })
  },

  delete(endpoint, options = {}) {
    return apiRequest(endpoint, {
      ...options,
      method: 'DELETE',
    })
  },
}
