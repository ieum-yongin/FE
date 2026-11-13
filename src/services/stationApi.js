import { api, USE_MOCK } from './apiClient'

export const USE_STATION_MOCK = USE_MOCK

// Figma 시연용 데이터. 실제 정류소/통계로 취급하지 않습니다.
const mockStations = [
  { id: 'demo-1', name: '죽전역 (마을)', direction: '한신 길훈아파트 방면', risk: 'stable', riskLabel: '안정', averageBoarding: 270, averageAlighting: 190, routeCount: 8, transferRate: 69, rank: null, period: '2026.06.01 ~ 08.31', routes: ['시연 노선 A', '시연 노선 B'], x: 28, y: 31 },
  { id: 'demo-2', name: '기흥역', direction: '시연용 방면 정보', risk: 'warning', riskLabel: '주의', averageBoarding: 185, averageAlighting: 160, routeCount: 5, transferRate: 48, rank: null, period: '2026.06.01 ~ 08.31', routes: ['시연 노선 C'], x: 49, y: 47 },
  { id: 'demo-3', name: '용인시청·용인대역', direction: '시연용 방면 정보', risk: 'danger', riskLabel: '위험', averageBoarding: 120, averageAlighting: 95, routeCount: 2, transferRate: 24, rank: null, period: '2026.06.01 ~ 08.31', routes: ['시연 노선 D'], x: 66, y: 58 },
  { id: 'demo-4', name: '수지구청역', direction: '시연용 방면 정보', risk: 'stable', riskLabel: '안정', averageBoarding: 320, averageAlighting: 290, routeCount: 9, transferRate: 72, rank: null, period: '2026.06.01 ~ 08.31', routes: ['시연 노선 E', '시연 노선 F'], x: 29, y: 68 },
  { id: 'demo-5', name: '강남대역', direction: '시연용 방면 정보', risk: 'warning', riskLabel: '주의', averageBoarding: 210, averageAlighting: 175, routeCount: 4, transferRate: 41, rank: null, period: '2026.06.01 ~ 08.31', routes: ['시연 노선 G'], x: 73, y: 25 },
]

const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '')
const riskLabels = { danger: '위험', warning: '주의', stable: '안정', unknown: '자료 없음' }

function riskValue(value) {
  switch (String(value ?? '').toUpperCase()) {
    case 'DANGER': case 'HIGH': case 'RED': case '위험': return 'danger'
    case 'CAUTION': case 'WARNING': case 'MEDIUM': case 'YELLOW': case '주의': return 'warning'
    case 'SAFE': case 'STABLE': case 'LOW': case 'GREEN': case '안전': case '안정': return 'stable'
    default: return 'unknown'
  }
}

function emptyStation(id) {
  return { id, name: '정류소명 미확인', direction: '방면 정보 없음', risk: 'unknown', riskLabel: '자료 없음', averageBoarding: null, averageAlighting: null, routeCount: null, transferRate: null, rank: null, period: '자료 없음', routes: [], latitude: null, longitude: null, x: null, y: null }
}

export function normalizeStation(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('정류소 데이터 형식이 올바르지 않습니다.')
  const id = first(raw.id, raw.station_id, raw.stationId)
  if (id == null) throw new Error('정류소 ID가 없습니다.')
  const base = emptyStation(id)
  const riskRaw = first(raw.risk, raw.risk_level, raw.riskLevel)
  const risk = riskValue(riskRaw)
  return {
    ...base,
    name: first(raw.name, raw.station_name, raw.stationName, base.name),
    direction: first(raw.direction, raw.direction_name, base.direction),
    risk,
    riskLabel: first(raw.riskLabel, raw.risk_label, riskLabels[risk]),
    averageBoarding: first(raw.averageBoarding, raw.average_boarding, raw.average_daily_boarding, raw.avg_boarding) ?? null,
    averageAlighting: first(raw.averageAlighting, raw.average_alighting, raw.average_daily_alighting, raw.avg_alighting) ?? null,
    routeCount: first(raw.routeCount, raw.route_count) ?? null,
    transferRate: first(raw.transferRate, raw.transfer_rate) ?? null,
    rank: first(raw.rank, raw.boarding_rank) ?? null,
    period: first(raw.period, raw.analysis_period, base.period),
    routes: Array.isArray(raw.routes) ? raw.routes : [],
    latitude: first(raw.latitude, raw.lat, raw.station_latitude) ?? null,
    longitude: first(raw.longitude, raw.lng, raw.lon, raw.station_longitude) ?? null,
    x: null, y: null,
  }
}

function readResults(data, label) {
  const result = Array.isArray(data) ? data : data?.results
  if (!Array.isArray(result)) throw new Error(`${label} API 응답에 results 배열이 없습니다.`)
  return result
}

// 목록 API는 페이지네이션 응답(count/page/page_size)을 반환합니다.
// 백엔드의 전체 정류소가 검색되도록 페이지를 순차적으로 조회합니다.
async function fetchStationList({ signal } = {}) {
  const firstPage = await api.get('/api/stations/', { signal })
  const items = readResults(firstPage, '정류소 목록')
  const count = Number(firstPage?.count)
  const pageSize = Number(firstPage?.page_size)
  if (!Number.isFinite(count) || !Number.isFinite(pageSize) || pageSize <= 0 || count <= items.length) return items
  const pages = Math.ceil(count / pageSize)
  if (pages > 1000) throw new Error('정류소 페이지 수가 너무 많습니다. 백엔드 페이지네이션 설정을 확인해 주세요.')
  const result = [...items]
  for (let page = 2; page <= pages; page += 1) {
    const next = await api.get(`/api/stations/?page=${page}`, { signal })
    result.push(...readResults(next, '정류소 목록'))
  }
  return result
}

function mockCopy(station) { return { ...station, routes: [...station.routes] } }

// 목록 검색에는 목록 API, 지도 마커에는 지도 API의 좌표/위험도 정보를 이용합니다.
export async function getStationList({ signal } = {}) {
  if (USE_STATION_MOCK) return mockStations.map(mockCopy)

  const [list, mapData] = await Promise.all([
    fetchStationList({ signal }),
    api.get('/api/stations/map/', { signal }),
  ])
  const mapItems = readResults(mapData, '지도 정류소')
  const byId = new Map()
  for (const item of list) {
    const normalized = normalizeStation(item)
    byId.set(String(normalized.id), normalized)
  }
  for (const item of mapItems) {
    const normalized = normalizeStation(item)
    const key = String(normalized.id)
    const existing = byId.get(key)
    if (!existing) {
      byId.set(key, normalized)
      continue
    }
    // 지도 API에 없는 필드는 목록 API의 값을 유지합니다.
    byId.set(key, {
      ...existing,
      latitude: normalized.latitude ?? existing.latitude,
      longitude: normalized.longitude ?? existing.longitude,
      risk: normalized.risk !== 'unknown' ? normalized.risk : existing.risk,
      riskLabel: normalized.risk !== 'unknown' ? normalized.riskLabel : existing.riskLabel,
      averageBoarding: normalized.averageBoarding ?? existing.averageBoarding,
      averageAlighting: normalized.averageAlighting ?? existing.averageAlighting,
    })
  }
  return [...byId.values()]
}

export async function getStationDetail(id, { signal } = {}) {
  if (USE_STATION_MOCK) return mockStations.find(station => String(station.id) === String(id)) ? mockCopy(mockStations.find(station => String(station.id) === String(id))) : null
  return normalizeStation(await api.get(`/api/stations/${encodeURIComponent(id)}/`, { signal }))
}

export async function getStationUsage(id, { signal } = {}) {
  if (USE_STATION_MOCK) {
    const station = mockStations.find(item => String(item.id) === String(id))
    return station ? { averageBoarding: station.averageBoarding, averageAlighting: station.averageAlighting, transferRate: station.transferRate } : null
  }
  const raw = await api.get(`/api/stations/${encodeURIComponent(id)}/usage/`, { signal })
  return { averageBoarding: first(raw?.averageBoarding, raw?.average_boarding, raw?.average_daily_boarding) ?? null, averageAlighting: first(raw?.averageAlighting, raw?.average_alighting, raw?.average_daily_alighting) ?? null, transferRate: first(raw?.transferRate, raw?.transfer_rate) ?? null, rank: first(raw?.rank, raw?.boarding_rank) ?? null }
}

export async function getStationExtraDetails(id, { signal } = {}) {
  if (USE_STATION_MOCK) return null
  return api.get(`/api/stations/${encodeURIComponent(id)}/details/`, { signal })
}

// 시뮬레이션 지도는 전체 정류소 목록의 수백 페이지를 조회하지 않고 지도 API만 사용합니다.
export async function getStationMap({ signal } = {}) {
  if (USE_STATION_MOCK) return mockStations.map(mockCopy)
  const data = await api.get('/api/stations/map/', { signal })
  return readResults(data, '지도 정류소').map(normalizeStation)
}
