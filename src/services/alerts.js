
import { mockAlerts } from './mockAlerts'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '')

export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK !== 'false'

export async function getAlerts({ signal } = {}) {
  if (USE_MOCK) {
    return mockAlerts.map(alert => ({ ...alert }))
  }

  if (!BASE_URL) {
    throw new Error('백엔드 API 주소가 설정되지 않았습니다.')
  }

  const response = await fetch(
    `${BASE_URL}/api/alerts/`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    }
  )

  if (!response.ok) {
    throw new Error(
      `알림 목록 조회 실패: ${response.status}`
    )
  }

  const data = await response.json()

  const alerts = Array.isArray(data)
    ? data
    : data.results

  if (!Array.isArray(alerts)) {
    throw new Error('알림 데이터 형식이 올바르지 않습니다.')
  }

  return alerts
}

export async function getAlertDetail(id, { signal } = {}) {
  if (USE_MOCK) {
    return mockAlerts.find(
      alert => String(alert.id) === String(id)
    ) ?? null
  }

  if (!BASE_URL) {
    throw new Error('백엔드 API 주소가 설정되지 않았습니다.')
  }

  const response = await fetch(
    `${BASE_URL}/api/alerts/${encodeURIComponent(id)}/`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(
      `알림 상세 조회 실패: ${response.status}`
    )
  }

  return response.json()
}
