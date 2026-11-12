import busIcon from '../assets/figma/station-bus.svg'

// 지도·시뮬레이션 등에서 동일한 위험도 마커를 재사용합니다.
export default function StationMarker({ risk = 'unknown', selected = false }) {
  return (
    <span className={`ieum-marker ${risk} ${selected ? 'selected' : ''}`}>
      <img className="ieum-marker-bus" src={busIcon} alt="" aria-hidden="true" />
    </span>
  )
}
