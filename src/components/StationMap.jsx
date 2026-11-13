import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import StationMarker from './StationMarker'
import busIconUrl from '../assets/figma/station-bus.svg'
import 'leaflet/dist/leaflet.css'
import './StationMap.css'

// 실제 정류소는 위도·경도로 표시하고, Mock x/y 좌표는 별도 레이어에 유지합니다.
const YONGIN_CENTER = [37.2411, 127.1776]
const CLUSTER_PIXEL_SIZE = 92
const UNCLUSTER_AT_ZOOM = 16

const RISK_CLASSES = {
  danger: 'danger',
  warning: 'warning',
  stable: 'stable',
}

function getPosition(station) {
  const latValue = station.latitude ?? station.lat
  const lngValue = station.longitude ?? station.lng ?? station.lon
  if (latValue == null || lngValue == null || latValue === '' || lngValue === '') return null
  const lat = Number(latValue)
  const lng = Number(lngValue)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return [lat, lng]
}

function getDemoPoint(station) {
  const x = Number(station.x)
  const y = Number(station.y)
  if (station.x == null || station.y == null) return null
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (x < 0 || x > 100 || y < 0 || y > 100) return null
  return { x, y }
}

function getBoarding(station) {
  const n = Number(station.averageBoarding)
  return station.averageBoarding != null && Number.isFinite(n)
    ? `${Math.round(n).toLocaleString('ko-KR')}명`
    : '자료 없음'
}

function markerIcon(station, isSelected) {
  const risk = RISK_CLASSES[station.risk] || 'unknown'
  // 정류소명 등 API 문자열을 HTML에 넣지 않습니다.
  return L.divIcon({
    className: 'ieum-leaflet-icon',
    iconSize: [58, 85],
    iconAnchor: [29, 29],
    html: `<div class="ieum-marker ${risk} ${isSelected ? 'selected' : ''}"><img class="ieum-marker-bus" src="${busIconUrl}" alt="" /></div><span class="ieum-marker-count">${getBoarding(station)}</span>`,
  })
}

function clusterIcon(count) {
  const sizeClass = count >= 100 ? 'large' : count >= 10 ? 'medium' : 'small'
  const size = count >= 100 ? 62 : count >= 10 ? 56 : 50
  return L.divIcon({
    className: 'ieum-cluster-leaflet-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="ieum-cluster ${sizeClass}"><span class="ieum-cluster-number">${count.toLocaleString('ko-KR')}</span><span class="ieum-cluster-label">정류소</span></span>`,
  })
}

function FlyToStation({ station }) {
  const map = useMap()
  useEffect(() => {
    if (!station) return
    const position = getPosition(station)
    if (!position) return
    map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.7 })
  }, [map, station])
  return null
}

function GeoMarkerLayer({ stations, selectedStation, onSelect }) {
  const map = useMap()
  const [view, setView] = useState(() => ({
    zoom: map.getZoom(),
    bounds: map.getBounds(),
  }))

  // 지도 이동/확대가 끝난 뒤 화면에 보이는 정류소만 클러스터링합니다.
  const refreshView = () => setView({ zoom: map.getZoom(), bounds: map.getBounds() })
  useMapEvents({ zoomend: refreshView, moveend: refreshView })
  useEffect(() => {
    refreshView()
    // 지도의 최초 크기·좌표가 설정된 뒤 경계를 다시 읽습니다.
  }, [map])

  const selectedId = selectedStation?.id == null ? null : String(selectedStation.id)
  const { singles, clusters } = useMemo(() => {
    const singles = []
    const clusters = []
    const buckets = new Map()
    const zoom = view.zoom
    const bounds = view.bounds?.isValid() ? view.bounds.pad(0.2) : null

    for (const station of stations) {
      const position = getPosition(station)
      if (!position) continue
      const isSelected = selectedId != null && String(station.id) === selectedId
      if (bounds && !bounds.contains(position) && !isSelected) continue
      if (zoom >= UNCLUSTER_AT_ZOOM || isSelected) {
        singles.push({ station, position })
        continue
      }
      const point = map.project(position, zoom)
      const key = `${Math.floor(point.x / CLUSTER_PIXEL_SIZE)}:${Math.floor(point.y / CLUSTER_PIXEL_SIZE)}`
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = []
        buckets.set(key, bucket)
      }
      bucket.push({ station, position })
    }

    for (const [key, bucket] of buckets) {
      if (bucket.length === 1) {
        singles.push(bucket[0])
        continue
      }
      const lat = bucket.reduce((sum, item) => sum + item.position[0], 0) / bucket.length
      const lng = bucket.reduce((sum, item) => sum + item.position[1], 0) / bucket.length
      clusters.push({ key, items: bucket, position: [lat, lng] })
    }
    return { singles, clusters }
  }, [stations, selectedId, view, map])

  const expandCluster = cluster => {
    const positions = cluster.items.map(item => item.position)
    const bounds = L.latLngBounds(positions)
    const targetZoom = Math.min(map.getMaxZoom(), Math.max(map.getZoom() + 2, 14))
    if (bounds.isValid()) {
      // 완전히 같은 좌표를 사용하는 정류소도 있으므로 최소한 한 단계는 확대합니다.
      const fitZoom = map.getBoundsZoom(bounds, false, [80, 80])
      map.flyTo(cluster.position, Math.min(map.getMaxZoom(), Math.max(targetZoom, fitZoom)), { duration: 0.55 })
    }
  }

  return (
    <>
      {clusters.map(cluster => (
        <Marker
          key={`cluster-${cluster.key}`}
          position={cluster.position}
          icon={clusterIcon(cluster.items.length)}
          eventHandlers={{ click: () => expandCluster(cluster) }}
          zIndexOffset={200}
        >
          <Tooltip direction="top" offset={[0, -20]}>
            정류소 {cluster.items.length.toLocaleString('ko-KR')}개 · 클릭하여 확대
          </Tooltip>
        </Marker>
      ))}
      {singles.map(({ station, position }) => (
        <Marker
          key={`station-${station.id}`}
          position={position}
          icon={markerIcon(station, selectedId != null && String(station.id) === selectedId)}
          eventHandlers={{ click: () => onSelect(station) }}
          zIndexOffset={selectedId != null && String(station.id) === selectedId ? 1000 : 0}
        >
          <Tooltip direction="top" offset={[0, -20]}>
            <strong>{station.name}</strong> · {getBoarding(station)}
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}

const SIM_RISK_COLORS = { DANGER: '#f24438', CAUTION: '#ffc83d', SAFE: '#77e960', UNKNOWN: '#8e9699' }

function SimulationFocus({ stops, selectedStop }) {
  const map = useMap()
  useEffect(() => {
    if (selectedStop) {
      const position = getPosition(selectedStop)
      if (position) map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.6 })
      return
    }
    const positions = (stops || []).map(getPosition).filter(Boolean)
    if (positions.length) map.fitBounds(L.latLngBounds(positions), { padding: [70, 70], maxZoom: 14, animate: true })
  }, [map, stops, selectedStop])
  return null
}

function SimulationImpactLayer({ stops, selectedStop, onSelect }) {
  if (!Array.isArray(stops) || !stops.length) return null
  const entries = stops.map(stop => ({ stop, position: getPosition(stop) })).filter(item => item.position)
  return (
    <>
      <SimulationFocus stops={stops} selectedStop={selectedStop} />
      {entries.map(({ stop, position }, index) => {
        const risk = String(stop.after_risk_level ?? 'UNKNOWN').toUpperCase()
        const color = SIM_RISK_COLORS[risk] || SIM_RISK_COLORS.UNKNOWN
        const selected = selectedStop && String(selectedStop.id) === String(stop.id)
        const icon = L.divIcon({
          className: 'ieum-simulation-map-icon', iconSize: [45, 51], iconAnchor: [22, 25],
          html: `<div class="ieum-simulation-pin ${selected ? 'is-focused' : ''}" style="--impact-color:${color}">🚌</div>`,
        })
        return <Marker key={`simulation-${stop.id ?? index}`} position={position} icon={icon} zIndexOffset={1500} eventHandlers={{ click: () => onSelect?.(stop) }}>
          <Tooltip direction="top"><strong>{stop.name || '정류소'}</strong> · 변경 후 {risk === 'DANGER' ? '위험' : risk === 'CAUTION' ? '주의' : risk === 'SAFE' ? '안전' : '미분류'}</Tooltip>
        </Marker>
      })}
    </>
  )
}

function DemoMarker({ station, selected, onSelect }) {
  const position = getDemoPoint(station)
  if (!position) return null
  const risk = RISK_CLASSES[station.risk] || 'unknown'
  return (
    <button
      type="button"
      className={`ieum-demo-marker ${selected ? 'selected' : ''}`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      aria-label={`${station.name} · ${station.riskLabel || '위험도 미확인'} · 상세정보 보기`}
      title={`${station.name} · ${station.riskLabel || '위험도 미확인'}`}
      onClick={() => onSelect(station)}
    >
      <StationMarker risk={risk} selected={selected} />
      <span className="ieum-marker-count">{getBoarding(station)}</span>
    </button>
  )
}

export default function StationMap({
  stations = [],
  selectedStation = null,
  onSelect = () => {},
  simulationStops = null,
  focusedSimulationStop = null,
  onSimulationStopSelect = () => {},
}) {
  const geoStations = useMemo(() => stations.filter(station => getPosition(station)), [stations])
  const demoStations = useMemo(
    () => stations.filter(station => !getPosition(station) && getDemoPoint(station)),
    [stations]
  )
  // 완료된 시뮬레이션에서는 전체 정류소 클러스터가 결과 마커를 가리지 않도록 숨깁니다.
  const hasSimulationResult = Array.isArray(simulationStops)

  return (
    <div className="station-map-wrapper">
      <MapContainer
        center={YONGIN_CENTER}
        zoom={11}
        minZoom={7}
        maxZoom={18}
        zoomControl
        scrollWheelZoom
        className="station-map-container"
      >
        <TileLayer
          attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!hasSimulationResult && <GeoMarkerLayer stations={geoStations} selectedStation={selectedStation} onSelect={onSelect} />}
        <FlyToStation station={selectedStation} />
        <SimulationImpactLayer stops={simulationStops} selectedStop={focusedSimulationStop} onSelect={onSimulationStopSelect} />
      </MapContainer>

      {/* Mock x/y 좌표는 지리 좌표가 아니므로 원래의 시연용 레이어를 유지합니다. */}
      {!hasSimulationResult && demoStations.length > 0 && (
        <div className="ieum-demo-marker-layer" aria-label="시연용 정류소 위치">
          {demoStations.map(station => (
            <DemoMarker
              key={station.id}
              station={station}
              selected={String(selectedStation?.id) === String(station.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      <div className="station-map-demo-notice">
        {hasSimulationResult ? '시뮬레이션 결과 · 위험도가 변경된 정류소만 표시' : demoStations.length > 0
          ? '시연용 마커 · 실제 위치 아님'
          : '개발용 지도 · 실제 좌표가 있는 정류소 표시'}
      </div>
    </div>
  )
}
