import LatePassNotificationDropdown from './LatePassNotificationDropdown'

/** Positions late-pass dropdown under the bell. */
export default function LatePassNotificationPanel(props) {
  return (
    <div className="absolute right-0 top-12 z-[1200] isolate">
      <LatePassNotificationDropdown {...props} />
    </div>
  )
}
