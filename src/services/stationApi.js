
import { api, USE_MOCK } from './apiClient'

export const USE_STATION_MOCK = USE_MOCK

// 실제 통계가 아닌 시연용 데이터
const mockStations = [
  {
    id: 'demo-1',
    name: '죽전역 (마을)',
    direction: '한신 길훈아파트 방면',
    risk: 'stable',
    riskLabel: '안정',
    averageBoarding: 270,
    averageAlighting: 190,
    routeCount: 8,
    transferRate: 69,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 A', '시연 노선 B'],
    x: 28,
    y: 31,
  },
  {
    id: 'demo-2',
    name: '기흥역',
    direction: '시연용 방면 정보',
    risk: 'warning',
    riskLabel: '주의',
    averageBoarding: 185,
    averageAlighting: 160,
    routeCount: 5,
    transferRate: 48,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 C'],
    x: 49,
    y: 47,
  },
  {
    id: 'demo-3',
    name: '용인시청·용인대역',
    direction: '시연용 방면 정보',
    risk: 'danger',
    riskLabel: '위험',
    averageBoarding: 120,
    averageAlighting: 95,
    routeCount: 2,
    transferRate: 24,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 D'],
    x: 66,
    y: 58,
  },
  {
    id: 'demo-4',
    name: '수지구청역',
    direction: '시연용 방면 정보',
    risk: 'stable',
    riskLabel: '안정',
    averageBoarding: 320,
    averageAlighting: 290,
    routeCount: 9,
    transferRate: 72,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 E', '시연 노선 F'],
    x: 29,
    y: 68,
  },
  {
    id: 'demo-5',
    name: '강남대역',
    direction: '시연용 방면 정보',
    risk: 'warning',
    riskLabel: '주의',
    averageBoarding: 210,
    averageAlighting: 175,
    routeCount: 4,
    transferRate: 41,
    rank: null,
    period: '2026.06.01 ~ 08.31',
    routes: ['시연 노선 G'],
    x: 73,
    y: 25,
  },
]

function findMockStation(id) {
  return mockStations.find(
    station => String(station.id) === String(id)
  )
}

function emptyStation(id) {
  return {
    id,
    name: '정류소명 미확인',
    direction: '방면 정보 없음',
    risk: 'unknown',
    riskLabel: '자료 없음',
    averageBoarding: null,
    averageAlighting: null,
    routeCount: null,
    transferRate: null,
    rank: null,
    period: '자료 없음',
    routes: [],
    x: null,
    y: null,
  }
}

// Django API 응답 필드명은 백엔드 명세 확정 후 조정
export function normalizeStation(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('정류소 데이터 형식이 올바르지 않습니다.')
  }

  const id = raw.id ?? raw.station_id

  if (id == null) {
    throw new Error('정류소 ID가 없습니다.')
  }

  const base = emptyStation(id)

  return {
    ...base,
    name:
      raw.name ??
      raw.station_name ??
      base.name,
    direction:
      raw.direction ??
      base.direction,
    risk:
      raw.risk ??
      raw.risk_level ??
      base.risk,
    riskLabel:
      raw.riskLabel ??
      raw.risk_label ??
      base.riskLabel,
    averageBoarding:
      raw.averageBoarding ??
      raw.average_boarding ??
      null,
    averageAlighting:
      raw.averageAlighting ??
      raw.average_alighting ??
      null,
    routeCount:
      raw.routeCount ??
      raw.route_count ??
      null,
    transferRate:
      raw.transferRate ??
      raw.transfer_rate ??
      null,
    rank: raw.rank ?? null,
    period:
      raw.period ??
      base.period,
    routes: Array.isArray(raw.routes)
      ? raw.routes
      : [],
    x: null,
    y: null,
  }
}

// 정류소 목록
export async function getStationList({ signal } = {}) {
  if (USE_STATION_MOCK) {
    return mockStations.map(station => ({
      ...station,
      routes: [...station.routes],
    }))
  }

  const data = await api.get('/api/stations/', { signal })

  const list = Array.isArray(data)
    ? data
    : data?.results

  if (!Array.isArray(list)) {
    throw new Error(
      '정류소 목록 API 응답 형식을 확인해야 합니다.'
    )
  }

  return list.map(normalizeStation)
}

// 정류소 상세
export async function getStationDetail(
  id,
  { signal } = {}
) {
  if (USE_STATION_MOCK) {
    const station = findMockStation(id)

    return station
      ? {
          ...station,
          routes: [...station.routes],
        }
      : null
  }

  const raw = await api.get(
    `/api/stations/${encodeURIComponent(id)}/`,
    { signal }
  )

  return normalizeStation(raw)
}

// 정류소 이용 통계
export async function getStationUsage(
  id,
  { signal } = {}
) {
  if (USE_STATION_MOCK) {
    const station = findMockStation(id)

    return station
      ? {
          averageBoarding: station.averageBoarding,
          averageAlighting: station.averageAlighting,
          transferRate: station.transferRate,
        }
      : null
  }

  // 실제 응답 구조가 확정되면 정규화 함수 추가 예정
  return api.get(
    `/api/stations/${encodeURIComponent(id)}/usage/`,
    { signal }
  )
}
