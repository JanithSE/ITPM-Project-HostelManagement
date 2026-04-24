import LatePassNotificationDropdown from './LatePassNotificationDropdown'

export default function LatePassNotificationPanel(props) {
  return (
    <div className="absolute right-0 top-12 z-[1200] isolate">
      <LatePassNotificationDropdown {...props} />
    </div>
  )
}
