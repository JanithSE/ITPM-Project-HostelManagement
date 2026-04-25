import PaymentNotificationDropdown from './PaymentNotificationDropdown'

/** Positions the dropdown under the bell (absolute layer). */
export default function PaymentNotificationPanel(props) {
  return (
    <div className="absolute right-0 top-12 z-[1200] isolate">
      <PaymentNotificationDropdown {...props} />
    </div>
  )
}
