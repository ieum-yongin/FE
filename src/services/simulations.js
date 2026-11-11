
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'
).replace(/\/$/, '')

export const USE_SIMULATION_MOCK =
  import.meta.env.VITE_USE_MOCK !== 'false'

// 실제 용인시 노선 데이터가 아닌 테스트 데이터
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

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(
      `API 요청 실패 (HTTP ${response.status})`
    )
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

function normalizeRoute(route) {
  return {
    id: route.id ?? route.route_id,
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

  const data = await request('/api/routes/', { signal })

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
      routeIds.some(id => String(id) === String(route.id))
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

  // 임시 요청 본문: 백엔드 팀과 필드명 협의 필요
  return request('/api/simulations/', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      route_ids: routeIds,
    }),
  })
}

// 저장된 시뮬레이션 조회
export async function getSimulation(id, { signal } = {}) {
  if (USE_SIMULATION_MOCK) {
    throw new Error(
      'Mock 모드에서는 저장된 시뮬레이션을 조회하지 않습니다.'
    )
  }

  return request(
    `/api/simulations/${encodeURIComponent(id)}/`,
    { signal }
  )
}

// 영향을 받는 정류소 조회
export async function getSimulationStops(
  id,
  { signal } = {}
) {
  if (USE_SIMULATION_MOCK) {
    return []
  }

  return request(
    `/api/simulations/${encodeURIComponent(id)}/stops/`,
    { signal }
  )
}
