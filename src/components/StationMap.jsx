import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import StationMarker from './StationMarker'
import busIconUrl from '../assets/figma/station-bus.svg'
import 'leaflet/dist/leaflet.css'
import './StationMap.css'

// 실제 정류소 좌표가 준비되면 지도에 표시합니다.
// 시연용 x/y 좌표는 실제 지리 좌표로 취급하지 않습니다.
const YONGIN_CENTER = [37.2411, 127.1776]

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
  // divIcon에는 API의 문자열을 삽입하지 않아 HTML 주입을 방지합니다.
  return L.divIcon({
    className: 'ieum-leaflet-icon',
    iconSize: [58, 85],
    iconAnchor: [29, 29],
    html: `<div class="ieum-marker ${risk} ${isSelected ? 'selected' : ''}"><img class="ieum-marker-bus" src="${busIconUrl}" alt="" /></div><span class="ieum-marker-count">${getBoarding(station)}</span>`,
  })
}

function FlyToStation({ station }) {
  const map = useMap()
  useEffect(() => {
    if (!station) return
    const position = getPosition(station)
    if (!position) return
    map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.7 })
  }, [map, station])
  return null
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
}) {
  const geoStations = stations.filter(station => getPosition(station))
  const demoStations = stations.filter(
    station => !getPosition(station) && getDemoPoint(station)
  )

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
        {geoStations.map(station => (
          <Marker
            key={station.id}
            position={getPosition(station)}
            icon={markerIcon(
              station,
              String(selectedStation?.id) === String(station.id)
            )}
            eventHandlers={{ click: () => onSelect(station) }}
          >
            <Tooltip direction="top" offset={[0, -20]}>
              <strong>{station.name}</strong> · {getBoarding(station)}
            </Tooltip>
          </Marker>
        ))}
        <FlyToStation station={selectedStation} />
      </MapContainer>

      {/* Mock 데이터에는 지리 좌표가 없으므로 디자인 확인용 별도 레이어로 표시 */}
      {demoStations.length > 0 && (
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
        {demoStations.length > 0
          ? '시연용 마커 · 실제 위치 아님'
          : '개발용 지도 · 실제 좌표가 있는 정류소 표시'}
      </div>
    </div>
  )
}
