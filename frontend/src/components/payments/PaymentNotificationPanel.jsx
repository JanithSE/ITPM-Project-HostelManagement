import PaymentNotificationDropdown from './PaymentNotificationDropdown'

export default function PaymentNotificationPanel(props) {
  return (
    <div className="absolute right-0 top-12 z-[220]">
      <PaymentNotificationDropdown {...props} />
    </div>
  )
}
