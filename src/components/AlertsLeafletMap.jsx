import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const CENTER = [37.2411, 127.1776]

function validPosition(alert) {
  const lat = alert.latitude ?? alert.lat
  const lng = alert.longitude ?? alert.lng ?? alert.lon
  if (lat == null || lng == null || lat === '' || lng === '') return null
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return [latitude, longitude]
}

function createIcon(type, selected) {
  const increase = type === 'increase'
  const colorClass = increase ? 'increase' : type === 'decrease' ? 'decrease' : 'unknown'
  const symbol = increase ? '↑' : type === 'decrease' ? '↓' : '!'
  return L.divIcon({
    className: 'alerts-leaflet-icon',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    html: `<span class="alerts-leaflet-pin ${colorClass}${selected ? ' is-selected' : ''}">${symbol}</span>`,
  })
}

function FocusAlert({ alert }) {
  const map = useMap()
  useEffect(() => {
    const position = alert && validPosition(alert)
    if (position) map.flyTo(position, Math.max(15, map.getZoom()), { duration: 0.65 })
  }, [map, alert])
  return null
}

function FitAlertBounds({ alerts }) {
  const map = useMap()
  useEffect(() => {
    const points = alerts.map(validPosition).filter(Boolean)
    if (points.length > 1) map.fitBounds(points, { padding: [65, 65], maxZoom: 13 })
    else if (points.length === 1) map.setView(points[0], 13)
  }, [map, alerts])
  return null
}

export default function AlertsLeafletMap({ alerts = [], selected, onSelect }) {
  const locatedAlerts = alerts.filter(alert => validPosition(alert) != null)
  return (
    <div className="alerts-real-map" aria-label="용인시 이용 급변 알림 지도">
      <MapContainer center={CENTER} zoom={11} minZoom={7} scrollWheelZoom className="alerts-leaflet-map" zoomControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitAlertBounds alerts={locatedAlerts} />
        <FocusAlert alert={selected} />
        {locatedAlerts.map(alert => (
          <Marker
            key={alert.id}
            position={validPosition(alert)}
            icon={createIcon(alert.type, String(selected?.id) === String(alert.id))}
            eventHandlers={{ click: () => onSelect?.(alert.id) }}
          >
            <Tooltip direction="top" offset={[0, -20]}>{alert.stationName}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
