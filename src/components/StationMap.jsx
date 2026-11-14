import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StationMarker from './StationMarker'
import busIconUrl from '../assets/figma/station-bus.svg'
import {
  YONGIN_CENTER, boundsFor, clearMarkers, coords, createHtmlMarker,
  getGeoPosition, htmlEscape, mercatorPixel, pointInBounds, useNaverMaps,
} from './naverMapCore'
import './StationMap.css'

// The initial city-wide view should be readable rather than showing dozens of tiny groups.
// As users zoom in, gradually reveal local groups and individual stops.
const UNCLUSTER_AT_ZOOM = 16
function clusterPixelSize(zoom) {
  if (zoom <= 11) return 280
  if (zoom === 12) return 230
  if (zoom === 13) return 175
  if (zoom === 14) return 135
  return 100
}
const RISK_CLASSES = { danger: 'danger', warning: 'warning', stable: 'stable' }
const SIM_RISK_COLORS = { DANGER: '#f24438', CAUTION: '#ffc83d', SAFE: '#77e960', UNKNOWN: '#8e9699' }

function getDemoPoint(station) {
  const x = Number(station.x), y = Number(station.y)
  if (station.x == null || station.y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null
  return x >= 0 && x <= 100 && y >= 0 && y <= 100 ? { x, y } : null
}

function boardingText(station) {
  const n = Number(station.averageBoarding)
  return station.averageBoarding != null && Number.isFinite(n)
    ? `${Math.round(n).toLocaleString('ko-KR')}명` : '자료 없음'
}

function stationHtml(station, selected) {
  const risk = RISK_CLASSES[station.risk] || 'unknown'
  return `<div class="ieum-naver-station-marker"><div class="ieum-marker ${risk} ${selected ? 'selected' : ''}"><img class="ieum-marker-bus" src="${busIconUrl}" alt="" /></div><span class="ieum-marker-count">${htmlEscape(boardingText(station))}</span></div>`
}

function clusterHtml(count) {
  const level = count >= 100 ? 'large' : count >= 10 ? 'medium' : 'small'
  return `<div class="ieum-cluster ${level}" style="width:100%;height:100%"><span class="ieum-cluster-number">${count.toLocaleString('ko-KR')}</span><span class="ieum-cluster-label"><span class="ieum-cluster-dot" aria-hidden="true"></span> 정류소</span></div>`
}

function impactHtml(stop, selected) {
  const risk = String(stop.after_risk_level ?? 'UNKNOWN').toUpperCase()
  const color = SIM_RISK_COLORS[risk] || SIM_RISK_COLORS.UNKNOWN
  return `<div class="ieum-simulation-pin ${selected ? 'is-focused' : ''}" style="--impact-color:${color}">🚌</div>`
}

// These dotted lines connect known positions only; they are not road-network routing.
function orderedNearestPositions(items) {
  const positions = items.map(getGeoPosition).filter(Boolean)
  if (positions.length < 2) return []
  // A geographically close ordering avoids jumping back and forth across the map
  // when the simulation API does not expose stop sequence numbers.
  const remaining = positions.slice(1)
  const ordered = [positions[0]]
  while (remaining.length) {
    const last = ordered[ordered.length - 1]
    let best = 0, distance = Infinity
    remaining.forEach((pos, index) => {
      const latitudeScale = Math.cos(last[0] * Math.PI / 180)
      const d = (pos[0] - last[0]) ** 2 + ((pos[1] - last[1]) * latitudeScale) ** 2
      if (d < distance) { distance = d; best = index }
    })
    ordered.push(remaining.splice(best, 1)[0])
  }
  return ordered
}

function DemoMarker({ station, selected, onSelect }) {
  const position = getDemoPoint(station)
  if (!position) return null
  return <button type="button" className={`ieum-demo-marker ${selected ? 'selected' : ''}`}
    style={{ left: `${position.x}%`, top: `${position.y}%` }}
    aria-label={`${station.name} · ${station.riskLabel || '위험도 미확인'} · 상세정보 보기`}
    title={`${station.name} · ${station.riskLabel || '위험도 미확인'}`}
    onClick={() => onSelect(station)}>
    <StationMarker risk={RISK_CLASSES[station.risk] || 'unknown'} selected={selected} />
    <span className="ieum-marker-count">{boardingText(station)}</span>
  </button>
}

export default function StationMap({
  stations = [], selectedStation = null, onSelect = () => {},
  simulationStops = null, simulationPaths = [], focusedSimulationStop = null, onSimulationStopSelect = () => {},
}) {
  const { maps, error } = useNaverMaps()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const dottedLinesRef = useRef([])
  const [viewport, setViewport] = useState(0)
  const geoStations = useMemo(() => stations.filter(station => getGeoPosition(station)), [stations])
  const demoStations = useMemo(() => stations.filter(station => !getGeoPosition(station) && getDemoPoint(station)), [stations])
  const hasSimulationResult = Array.isArray(simulationStops)

  useEffect(() => {
    if (!maps || !containerRef.current) return undefined
    const map = new maps.Map(containerRef.current, {
      center: coords(maps, YONGIN_CENTER), zoom: 11, minZoom: 7, maxZoom: 18,
      zoomControl: true, scrollWheel: true,
    })
    mapRef.current = map
    const listener = maps.Event.addListener(map, 'idle', () => setViewport(n => n + 1))
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.refresh()) : null
    observer?.observe(containerRef.current)
    setViewport(n => n + 1)
    return () => {
      observer?.disconnect()
      maps.Event.removeListener(listener)
      clearMarkers(maps, markersRef.current)
      markersRef.current = []
      dottedLinesRef.current.forEach(line => line.setMap(null))
      dottedLinesRef.current = []
      mapRef.current = null
      map.destroy?.()
    }
  }, [maps])

  // Keep latest callbacks without forcing the map to be re-created.
  const selectRef = useRef(onSelect)
  const simSelectRef = useRef(onSimulationStopSelect)
  selectRef.current = onSelect
  simSelectRef.current = onSimulationStopSelect

  const draw = useCallback(() => {
    const map = mapRef.current
    if (!maps || !map) return
    clearMarkers(maps, markersRef.current)
    markersRef.current = []
    dottedLinesRef.current.forEach(line => line.setMap(null))
    dottedLinesRef.current = []
    const out = markersRef.current

    const paths = (Array.isArray(simulationPaths) ? simulationPaths : [])
      .map(path => (Array.isArray(path) ? path.map(item => Array.isArray(item) ? item : getGeoPosition(item)).filter(Boolean) : []))
      .filter(path => path.length >= 2)
    // In the result view, connect the changed stops when no ordered route
    // geometry is available. This line is a visual link, NOT the actual bus route.
    if (hasSimulationResult && paths.length === 0) {
      const fallback = orderedNearestPositions(simulationStops || [])
      if (fallback.length >= 2) paths.push(fallback)
    }
    paths.forEach(path => {
      dottedLinesRef.current.push(new maps.Polyline({
        map,
        path: path.map(point => coords(maps, point)),
        strokeColor: '#ed4b50',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        strokeStyle: 'shortdash',
        clickable: false,
        zIndex: 1,
      }))
    })

    if (hasSimulationResult) {
      (simulationStops || []).forEach((stop, index) => {
        const position = getGeoPosition(stop)
        if (!position) return
        const selected = focusedSimulationStop && String(focusedSimulationStop.id) === String(stop.id)
        out.push(createHtmlMarker(maps, map, {
          position, html: impactHtml(stop, selected), size: [45, 51], anchor: [22, 25],
          zIndex: selected ? 200 : 100, title: `${stop.name || '정류소'} · 위험도 변경`,
          onClick: () => simSelectRef.current?.(stop),
        }))
      })
      return
    }

    const selectedId = selectedStation?.id == null ? null : String(selectedStation.id)
    const zoom = map.getZoom()
    const bounds = map.getBounds()
    const singles = [], buckets = new Map()
    for (const station of geoStations) {
      const position = getGeoPosition(station)
      if (!position) continue
      const selected = selectedId !== null && selectedId === String(station.id)
      if (!selected && !pointInBounds(bounds, position)) continue
      if (zoom >= UNCLUSTER_AT_ZOOM || selected) {
        singles.push({ station, position })
        continue
      }
      const [x, y] = mercatorPixel(position, zoom)
      const pixelSize = clusterPixelSize(zoom)
      const key = `${Math.floor(x / pixelSize)}:${Math.floor(y / pixelSize)}`
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push({ station, position })
    }
    buckets.forEach(bucket => {
      if (bucket.length === 1) { singles.push(bucket[0]); return }
      const pos = [
        bucket.reduce((sum, a) => sum + a.position[0], 0) / bucket.length,
        bucket.reduce((sum, a) => sum + a.position[1], 0) / bucket.length,
      ]
      const count = bucket.length
      const size = count >= 100 ? 58 : count >= 10 ? 52 : 46
      out.push(createHtmlMarker(maps, map, {
        position: pos, html: clusterHtml(count), size: [size, size], anchor: [size / 2, size / 2],
        zIndex: 5, title: `정류소 ${count}개 · 클릭하여 확대`,
        onClick: () => {
          const bounds = boundsFor(maps, bucket.map(a => a.position))
          if (!bounds) return
          map.fitBounds(bounds)
          // Coincident stops must still zoom further on each click.
          map.setZoom(Math.min(18, Math.max(zoom + 2, map.getZoom())))
        },
      }))
    })
    singles.forEach(({ station, position }) => {
      const selected = selectedId !== null && selectedId === String(station.id)
      out.push(createHtmlMarker(maps, map, {
        position, html: stationHtml(station, selected), size: [58, 85], anchor: [29, 29],
        zIndex: selected ? 100 : 10,
        title: `${station.name} · ${boardingText(station)}`,
        onClick: () => selectRef.current(station),
      }))
    })
  }, [maps, geoStations, selectedStation, hasSimulationResult, simulationStops, simulationPaths, focusedSimulationStop])

  useEffect(() => { draw() }, [draw, viewport])

  useEffect(() => {
    const map = mapRef.current
    const position = selectedStation && getGeoPosition(selectedStation)
    if (!maps || !map || !position) return
    map.panTo(coords(maps, position))
    if (map.getZoom() < 16) map.setZoom(16)
  }, [maps, selectedStation])

  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map || !Array.isArray(simulationStops)) return
    const selected = focusedSimulationStop && getGeoPosition(focusedSimulationStop)
    if (selected) {
      map.panTo(coords(maps, selected))
      if (map.getZoom() < 15) map.setZoom(15)
      return
    }
    const locations = simulationStops.map(getGeoPosition).filter(Boolean)
    const bounds = boundsFor(maps, locations)
    if (locations.length > 1 && bounds) map.fitBounds(bounds)
    else if (locations.length === 1) map.panTo(coords(maps, locations[0]))
  }, [maps, simulationStops, focusedSimulationStop])

  return <div className="station-map-wrapper">
    <div ref={containerRef} className="station-map-container ieum-naver-map" aria-label="네이버 지도 정류소 지도" />
    {error && <div className="ieum-naver-map-error" role="alert">{error}</div>}
    {!maps && !error && <div className="ieum-naver-map-error" role="status">네이버 지도를 불러오는 중입니다.</div>}
    {!hasSimulationResult && demoStations.length > 0 && <div className="ieum-demo-marker-layer" aria-label="시연용 정류소 위치">
      {demoStations.map(station => <DemoMarker key={station.id} station={station}
        selected={String(selectedStation?.id) === String(station.id)} onSelect={onSelect} />)}
    </div>}
    <div className="station-map-demo-notice">
      {hasSimulationResult ? '시뮬레이션 결과 · 점선은 정류소 간 시각적 연결이며 실제 주행 경로가 아닙니다' : simulationPaths.length ? '선택 노선의 정류소 위치 연결 · 실제 도로 경로와 다를 수 있습니다' : demoStations.length
        ? '시연용 마커 · 실제 위치 아님' : '네이버 지도 · 실제 좌표가 있는 정류소 표시'}
    </div>
  </div>
}
