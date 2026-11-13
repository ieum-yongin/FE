
import { mockAlerts } from './mockAlerts'
import { api, USE_MOCK } from './apiClient'

// 기존 AlertsPage.jsx와의 호환성을 위해 유지
export { USE_MOCK }

// 알림 목록 조회
export function normalizeAlert(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('알림 데이터 형식이 올바르지 않습니다.')
  const rawType = String(raw.type ?? raw.change_type ?? raw.change_direction ?? '').toLowerCase()
  const classification = String(raw.classification ?? '').toUpperCase()
  const rawStatus = String(raw.status ?? '').toLowerCase()
  const status = ['NEEDS_CHECK', 'NEEDS_REVIEW'].includes(classification)
    ? 'needs_review'
    : classification === 'EXPECTED'
      ? 'expected'
      : ['needs_review', 'expected'].includes(rawStatus)
        ? rawStatus
        : 'needs_review'
  const period = raw.period ?? raw.detected_period ?? (
    raw.change_start && raw.change_end
      ? `${raw.change_start} ~ ${raw.change_end}`
      : '기간 정보 없음'
  )
  return {
    ...raw,
    id: raw.id ?? raw.alert_id,
    stationId: raw.stationId ?? raw.station_id ?? raw.station?.id ?? null,
    stationName: raw.stationName ?? raw.station_name ?? raw.station?.name ?? '정류소명 미확인',
    type: ['increase', 'up', 'rise'].includes(rawType) ? 'increase' : ['decrease', 'down', 'fall'].includes(rawType) ? 'decrease' : 'unknown',
    status,
    period,
    ratio: raw.ratio ?? raw.change_ratio ?? raw.usage_ratio ?? null,
    latitude: raw.latitude ?? raw.station?.latitude ?? null,
    longitude: raw.longitude ?? raw.station?.longitude ?? null,
    // Mock 위치 비율은 지리 좌표로 변환하지 않습니다.
    x: raw.x ?? null, y: raw.y ?? null,
  }
}

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

  return alerts.map(normalizeAlert)
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

  return normalizeAlert(await api.get(
    `/api/alerts/${encodeURIComponent(id)}/`,
    { signal }
  ))
}

// 검토 등록 API: 전송 body 스키마는 백엔드 명세와 합의 후 사용하세요.
export async function postAlertReview(id, payload, { signal } = {}) {
  if (USE_MOCK) throw new Error('Mock 모드에서는 서버에 검토 결과를 저장하지 않습니다.')
  return api.post(`/api/alerts/${encodeURIComponent(id)}/reviews/`, payload, { signal })
}
