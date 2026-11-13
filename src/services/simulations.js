
import { api, API_BASE_URL, USE_MOCK } from './apiClient'

export const USE_SIMULATION_MOCK = USE_MOCK

// 실제 용인시 노선이 아닌 시연용 데이터
const MOCK_ROUTES = [
  {
    id: 'demo-route-1',
    number: '시연 노선 A',
    from: '기점 A',
    to: '종점 A',
    stops: 24,
  },
  {
    id: 'demo-route-2',
    number: '시연 노선 B',
    from: '기점 B',
    to: '종점 B',
    stops: 31,
  },
  {
    id: 'demo-route-3',
    number: '시연 노선 C',
    from: '기점 C',
    to: '종점 C',
    stops: 18,
  },
  {
    id: 'demo-route-4',
    number: '시연 노선 D',
    from: '기점 D',
    to: '종점 D',
    stops: 42,
  },
]

// 백엔드 응답 구조가 확정되면 필드명 조정
export function normalizeRoute(route) {
  if (!route || typeof route !== 'object' || Array.isArray(route)) {
    throw new Error('노선 데이터 형식이 올바르지 않습니다.')
  }

  const id = route.id ?? route.route_id

  if (id == null) {
    throw new Error('노선 ID가 없습니다.')
  }

  return {
    id,
    number: String(
      route.number ??
      route.route_number ??
      route.route_no ??
      '번호 미확인'
    ),
    from:
      route.from ??
      route.origin ??
      route.start_station ??
      '기점 정보 없음',
    to:
      route.to ??
      route.destination ??
      route.end_station ??
      '종점 정보 없음',
    stops:
      route.stops ??
      route.stop_count ??
      null,
  }
}

// 노선 목록 조회
export async function getRoutes({ signal } = {}) {
  if (USE_SIMULATION_MOCK) {
    return MOCK_ROUTES.map(route => ({ ...route }))
  }

  const data = await api.get('/api/routes/', { signal })

  const items = Array.isArray(data)
    ? data
    : data?.results

  if (!Array.isArray(items)) {
    throw new Error(
      '노선 목록 API 응답 형식을 확인해야 합니다.'
    )
  }

  return items.map(normalizeRoute)
}

// 시뮬레이션 생성
export async function createSimulation(
  routeIds,
  { signal } = {}
) {
  if (!Array.isArray(routeIds) || routeIds.length === 0) {
    throw new Error('노선을 하나 이상 선택해야 합니다.')
  }

  if (USE_SIMULATION_MOCK) {
    const routes = MOCK_ROUTES.filter(route =>
      routeIds.some(
        id => String(id) === String(route.id)
      )
    )

    return {
      id: 'demo-simulation',
      mode: 'mock',
      status: 'demo',
      selectedRoutes: routes,
      selectedRouteCount: routes.length,
      createdAt: new Date().toISOString(),
      impacts: null,
    }
  }

  // 임시 요청 형식: 백엔드 API 명세 확인 후 확정
  return api.post(
    '/api/simulations/',
    {
      route_ids: routeIds,
    },
    { signal }
  )
}

// 시뮬레이션 상세 조회
export async function getSimulation(
  id,
  { signal } = {}
) {
  if (USE_SIMULATION_MOCK) {
    throw new Error(
      'Mock 모드에서는 저장된 시뮬레이션을 조회하지 않습니다.'
    )
  }

  return api.get(
    `/api/simulations/${encodeURIComponent(id)}/`,
    { signal }
  )
}

// 결과 API는 위험도가 변경된 정류소만 페이지 단위로 반환합니다.
// 모든 페이지를 읽어야 지도 마커와 더보기 목록이 누락되지 않습니다.
export async function getSimulationStops(id, { signal } = {}) {
  if (USE_SIMULATION_MOCK) return { count: 0, results: [] }
  const endpoint = `/api/simulations/${encodeURIComponent(id)}/stops/`
  const first = await api.get(`${endpoint}?page=1&page_size=100`, { signal })
  if (Array.isArray(first)) return { count: first.length, results: first }
  if (!Array.isArray(first?.results)) throw new Error('정류소별 시뮬레이션 결과 형식이 올바르지 않습니다.')
  const count = Number(first.count)
  const pageSize = Number(first.page_size) || 100
  const pages = Number.isFinite(count) && count > 0 ? Math.ceil(count / pageSize) : 1
  if (pages > 100) throw new Error('시뮬레이션 정류소 페이지 수가 너무 많습니다.')
  const results = [...first.results]
  for (let page = 2; page <= pages; page++) {
    const next = await api.get(`${endpoint}?page=${page}&page_size=100`, { signal })
    if (!Array.isArray(next?.results)) throw new Error('추가 정류소 결과 형식이 올바르지 않습니다.')
    results.push(...next.results)
  }
  return { count: Number.isFinite(count) ? count : results.length, results }
}

// 바이너리 PDF 다운로드는 JSON 전용 api.get() 대신 fetch로 처리합니다.
export async function downloadSimulationPdf(id, { signal } = {}) {
  if (USE_SIMULATION_MOCK) throw new Error('시연용 모드에서는 PDF 보고서를 다운로드할 수 없습니다.')
  if (id == null || !/^\d+$/.test(String(id)) || Number(id) < 1) {
    throw new Error('유효한 시뮬레이션 ID가 없습니다.')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/simulations/${encodeURIComponent(id)}/export/`, {
      method: 'GET',
      headers: { Accept: '*/*' },
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new Error('PDF 서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.')
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null
    const messages = {
      SIMULATION_NOT_FOUND: '시뮬레이션 결과를 찾을 수 없습니다.',
      SIMULATION_NOT_COMPLETED: '분석이 완료된 후 PDF를 저장할 수 있습니다.',
      INVALID_REQUEST: 'PDF 다운로드 요청값을 확인해 주세요.',
    }
    throw new Error(data?.message || messages[data?.code] || `PDF 다운로드 실패 (HTTP ${response.status})`)
  }

  const blob = await response.blob()
  if (!blob.size || !(blob.type.includes('pdf') || (response.headers.get('content-type') || '').includes('pdf'))) {
    throw new Error('서버 응답이 PDF 파일이 아닙니다.')
  }

  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    // 브라우저 간 일관된 안전한 파일명 사용
    anchor.download = `simulation-${id}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    // 다운로드 시작 후 브라우저가 Blob URL을 읽을 수 있도록 지연 해제
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }
}
