import bellIcon from '../assets/figma/heading-bell.svg'
import simulationIcon from '../assets/figma/heading-simulation.svg'
import routeBusIcon from '../assets/figma/route-bus.svg'
import routeSearchIcon from '../assets/figma/route-search.svg'
import routePlusIcon from '../assets/figma/route-plus.svg'

// Figma 원본 자산을 화면마다 재사용하는 아이콘 컴포넌트.
const sources = {
  alert: bellIcon,
  simulation: simulationIcon,
  routeBus: routeBusIcon,
  search: routeSearchIcon,
  plus: routePlusIcon,
}

export default function FigmaUiIcon({ name, className = '' }) {
  if (!sources[name]) return null
  return <img src={sources[name]} className={className} alt="" aria-hidden="true" draggable="false" />
}
