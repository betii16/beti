export const BOOKING_STATUS = {
  PENDING:    'pending',
  CONFIRMED:  'confirmed',
  IN_PROGRESS:'in_progress',
  COMPLETED:  'completed',
  CANCELLED:  'cancelled',
  REFUSED:    'refused',
} as const

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS]
