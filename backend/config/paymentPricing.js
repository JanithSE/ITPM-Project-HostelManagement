/**
 * Expected monthly payment in LKR per room type + facility.
 * Keep in sync with frontend `PAYMENT_AMOUNT_LKR` in AddPayment.jsx.
 */
export const PAYMENT_AMOUNT_LKR = {
  single: { fan: 18000, ac: 24000 },
  '2 person': { fan: 14000, ac: 19000 },
  '3 person': { fan: 11000, ac: 15000 },
}

export function getExpectedAmountLkr(roomType, facilityType) {
  const row = PAYMENT_AMOUNT_LKR[roomType]
  if (!row) return null
  const n = row[facilityType]
  return typeof n === 'number' ? n : null
}
