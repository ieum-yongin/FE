import mapIcon from '../assets/figma/nav-map.svg'
import bellIcon from '../assets/figma/nav-bell.svg'
import simulationIcon from '../assets/figma/nav-simulation.svg'

const icons = { map: mapIcon, alert: bellIcon, simulation: simulationIcon }

export default function SidebarIcon({ type }) {
  return <img className="sidebar-icon-image" src={icons[type]} alt="" aria-hidden="true" />
}
