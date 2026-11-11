
import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './StationMap.css'

// 용인시 전체를 살펴보기 위한 초기 지도 중심
const YONGIN_CENTER = [37.2411, 127.1776]

const RISK_COLORS = {
  danger: '#ff4a4a',
  warning: '#ffda3a',
  stable: '#4aff5c',
  unknown: '#999999',
}

// 실제 위도·경도가 확인된 정류소만 지도에 표시
function getPosition(station) {
  const rawLat = station.latitude ?? station.lat
  const rawLng =
    station.longitude ?? station.lng ?? station.lon

  if (
    rawLat == null ||
    rawLng == null ||
    rawLat === '' ||
    rawLng === ''
  ) {
    return null
  }

  const lat = Number(rawLat)
  const lng = Number(rawLng)

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null
  }

  return [lat, lng]
}

function FlyToStation({ station }) {
  const map = useMap()

  useEffect(() => {
    if (!station) return

    const position = getPosition(station)
    if (!position) return

    map.flyTo(position, Math.max(map.getZoom(), 14), {
      duration: 0.7,
    })
  }, [map, station])

  return null
}

export default function StationMap({
  stations = [],
  selectedStation = null,
  onSelect = () => {},
}) {
  const mappedStations = stations
    .map(station => ({
      ...station,
      position: getPosition(station),
    }))
    .filter(station => station.position !== null)

  return (
    <div className="station-map-wrapper">
      <MapContainer
        center={YONGIN_CENTER}
        zoom={11}
        minZoom={7}
        maxZoom={18}
        zoomControl={true}
        scrollWheelZoom={true}
        className="station-map-container"
      >
        <TileLayer
          attribution={
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mappedStations.map(station => (
          <CircleMarker
            key={station.id}
            center={station.position}
            radius={
              String(selectedStation?.id) === String(station.id)
                ? 13
                : 9
            }
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor:
                RISK_COLORS[station.risk] ||
                RISK_COLORS.unknown,
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: () => onSelect(station),
            }}
          >
            <Tooltip direction="top">
              <strong>{station.name}</strong>
              <span>
                {' · '}
                {station.riskLabel || '위험도 미확인'}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

        <FlyToStation station={selectedStation} />
      </MapContainer>

      <div className="station-map-demo-notice">
        개발용 지도 · 실제 좌표가 있는 정류소만 표시
      </div>
    </div>
  )
}
