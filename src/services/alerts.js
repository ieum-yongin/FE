
import { mockAlerts } from './mockAlerts'
import { api, USE_MOCK } from './apiClient'

// 기존 AlertsPage.jsx와의 호환성을 위해 유지
export { USE_MOCK }

// 알림 목록 조회
export async function getAlerts({ signal } = {}) {
  if (USE_MOCK) {
    return mockAlerts.map(alert => ({ ...alert }))
  }

  const data = await api.get('/api/alerts/', {
    signal,
  })

  // 배열 또는 Django REST Framework 페이지네이션 응답 지원
  const alerts = Array.isArray(data)
    ? data
    : data?.results

  if (!Array.isArray(alerts)) {
    throw new Error(
      '알림 목록 API 응답 형식을 확인해야 합니다.'
    )
  }

  return alerts
}

// 알림 상세 조회
export async function getAlertDetail(
  id,
  { signal } = {}
) {
  if (USE_MOCK) {
    const alert = mockAlerts.find(
      item => String(item.id) === String(id)
    )

    return alert ? { ...alert } : null
  }

  return api.get(
    `/api/alerts/${encodeURIComponent(id)}/`,
    { signal }
  )
}
