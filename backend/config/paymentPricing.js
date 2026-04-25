/**
 * Expected monthly payment in LKR per room type + facility.
 * Keep in sync with frontend default pricing in `AddPayment.jsx` (API may override via GET /pricing).
 */
export const PAYMENT_AMOUNT_LKR = {
  single: { fan: 18000, ac: 24000 },
  '2 person': { fan: 14000, ac: 19000 },
  '3 person': { fan: 11000, ac: 15000 },
}

/** Lookup expected LKR for valid pair; null if keys missing from the table. */
export function getExpectedAmountLkr(roomType, facilityType) {
  const row = PAYMENT_AMOUNT_LKR[roomType]
  if (!row) return null
  const n = row[facilityType]
  return typeof n === 'number' ? n : null
}
