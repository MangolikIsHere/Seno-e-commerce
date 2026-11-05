/**
 * SENO — Centralized Dynamic Expected Delivery Date Utility
 *
 * Enforces calendar day calculations in the Asia/Kolkata (IST: UTC+05:30) timezone.
 * Handles month boundaries, leap years, year-end rollovers, and provides
 * safe fallbacks for missing or invalid inputs.
 */

export const TIMEZONE_KOLKATA = 'Asia/Kolkata'
export const DEFAULT_DELIVERY_DAYS = 7
export const MIN_DELIVERY_DAYS = 1
export const MAX_DELIVERY_DAYS = 60

/**
 * Normalizes and validates delivery duration in calendar days.
 * Ensures values stay within [1, 60] with a sensible default of 7 days.
 */
export function normalizeDeliveryDays(days?: number | string | null): number {
  if (days === undefined || days === null || days === '') {
    return DEFAULT_DELIVERY_DAYS
  }
  const parsed = typeof days === 'number' ? Math.floor(days) : parseInt(String(days).trim(), 10)
  if (isNaN(parsed) || !Number.isFinite(parsed)) {
    return DEFAULT_DELIVERY_DAYS
  }
  return Math.min(Math.max(parsed, MIN_DELIVERY_DAYS), MAX_DELIVERY_DAYS)
}

/**
 * Extracts the current calendar date (year, month 0-indexed, day) in Asia/Kolkata.
 */
export function getKolkataDateParts(referenceDate: Date | string = new Date()): {
  year: number
  month: number
  day: number
} {
  const d = typeof referenceDate === 'string' ? new Date(referenceDate) : (referenceDate || new Date())
  const validDate = isNaN(d.getTime()) ? new Date() : d

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_KOLKATA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
  const parts = formatter.formatToParts(validDate)
  let year = validDate.getUTCFullYear()
  let month = validDate.getUTCMonth()
  let day = validDate.getUTCDate()

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10)
    if (part.type === 'month') month = parseInt(part.value, 10) - 1
    if (part.type === 'day') day = parseInt(part.value, 10)
  }

  return { year, month, day }
}

/**
 * Calculates the expected delivery date by adding N calendar days to the current date in Asia/Kolkata.
 * Robustly accepts either (days, referenceDate) or (referenceDate, days).
 * Returns a Date object representing the target calendar date.
 */
export function calculateExpectedDeliveryDate(
  paramA?: number | string | Date | null,
  paramB?: number | string | Date | null
): Date {
  let daysParam: number | string | null = DEFAULT_DELIVERY_DAYS
  let refDateParam: Date | string = new Date()

  if (paramA instanceof Date || (typeof paramA === 'string' && isNaN(Number(paramA)) && !isNaN(Date.parse(paramA)))) {
    refDateParam = paramA
    daysParam = typeof paramB === 'number' || typeof paramB === 'string' ? paramB : DEFAULT_DELIVERY_DAYS
  } else {
    daysParam = typeof paramA === 'number' || typeof paramA === 'string' ? paramA : DEFAULT_DELIVERY_DAYS
    if (paramB instanceof Date || (typeof paramB === 'string' && !isNaN(Date.parse(paramB)))) {
      refDateParam = paramB
    }
  }

  const days = normalizeDeliveryDays(daysParam)
  const { year, month, day } = getKolkataDateParts(refDateParam)

  // Date.UTC correctly handles calendar day addition across month and leap-year boundaries
  const targetUtcMs = Date.UTC(year, month, day + days, 12, 0, 0, 0)
  return new Date(targetUtcMs)
}

/**
 * Formats a delivery date for the Product Detail Page / Trust Card:
 * Example: "Delivery by Friday, 13 November"
 */
export function formatDeliveryByDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE_KOLKATA,
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  return `Delivery by ${formatter.format(d)}`
}

/**
 * Formats an expected delivery date for Cart, Checkout, and Order History:
 * Examples:
 *   - "Friday, 13 November" (default)
 *   - "Friday, 13 Nov" (shortMonth: true)
 *   - "Friday, 13 November 2026" (includeYear: true)
 */
export function formatExpectedDeliveryDate(
  date?: Date | string | null,
  options?: { includeYear?: boolean; shortMonth?: boolean }
): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE_KOLKATA,
    weekday: 'long',
    day: 'numeric',
    month: options?.shortMonth ? 'short' : 'long',
    year: options?.includeYear ? 'numeric' : undefined
  })
  return formatter.format(d)
}

/**
 * Formats date into standard ISO YYYY-MM-DD for PostgreSQL DATE / TIMESTAMPTZ columns.
 */
export function formatToKolkataDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_KOLKATA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(date) // Returns "YYYY-MM-DD"
}

/**
 * Evaluates a list of cart or order items to determine:
 * 1. Maximum delivery duration in days.
 * 2. The latest expected delivery date (authoritative overall order delivery date).
 * 3. Item-level delivery dates.
 */
export function evaluateOrderDelivery(
  items: Array<{
    id?: string
    expected_delivery_days?: number | string | null
    expectedDeliveryDays?: number | string | null
    product?: {
      id?: string
      expected_delivery_days?: number | string | null
      expectedDeliveryDays?: number | string | null
    }
  }>,
  referenceDate: Date = new Date()
): {
  maxDays: number
  maxDeliveryDays: number
  overallExpectedDate: Date
  latestDate: Date
  earliestDate: Date
  formattedOverallDate: string
  formattedDeliveryBy: string
  itemDeliveryMap: Record<string, { days: number; date: Date; formattedDeliveryBy: string }>
} {
  if (!items || items.length === 0) {
    const defaultDate = calculateExpectedDeliveryDate(DEFAULT_DELIVERY_DAYS, referenceDate)
    return {
      maxDays: DEFAULT_DELIVERY_DAYS,
      maxDeliveryDays: DEFAULT_DELIVERY_DAYS,
      overallExpectedDate: defaultDate,
      latestDate: defaultDate,
      earliestDate: defaultDate,
      formattedOverallDate: formatExpectedDeliveryDate(defaultDate),
      formattedDeliveryBy: formatDeliveryByDate(defaultDate),
      itemDeliveryMap: {}
    }
  }

  let maxDays = MIN_DELIVERY_DAYS
  let minDays = MAX_DELIVERY_DAYS
  const itemDeliveryMap: Record<string, { days: number; date: Date; formattedDeliveryBy: string }> = {}

  for (const item of items) {
    const rawDays =
      item.expected_delivery_days ??
      item.expectedDeliveryDays ??
      item.product?.expected_delivery_days ??
      item.product?.expectedDeliveryDays
    const days = normalizeDeliveryDays(rawDays)
    if (days > maxDays) {
      maxDays = days
    }
    if (days < minDays) {
      minDays = days
    }

    const key = item.product?.id || item.id || ''
    if (key) {
      const itemDate = calculateExpectedDeliveryDate(days, referenceDate)
      itemDeliveryMap[key] = {
        days,
        date: itemDate,
        formattedDeliveryBy: formatDeliveryByDate(itemDate)
      }
    }
  }

  const overallExpectedDate = calculateExpectedDeliveryDate(maxDays, referenceDate)
  const earliestDate = calculateExpectedDeliveryDate(minDays, referenceDate)

  return {
    maxDays,
    maxDeliveryDays: maxDays,
    overallExpectedDate,
    latestDate: overallExpectedDate,
    earliestDate,
    formattedOverallDate: formatExpectedDeliveryDate(overallExpectedDate),
    formattedDeliveryBy: formatDeliveryByDate(overallExpectedDate),
    itemDeliveryMap
  }
}

/**
 * Defensive Enricher for Historical and Live Orders:
 * Guarantees that any order record (legacy or modern) has an authoritative,
 * immutable expected_delivery_date and expected_delivery_days.
 * For historical orders placed before migration, anchors to created_at in Asia/Kolkata + duration
 * so the date never mutates across subsequent days.
 */
export function enrichOrderWithDeliverySnapshot<T = any>(order: T): T {
  if (!order) return order

  const raw = order as any
  const defaultDays = raw.expected_delivery_days != null ? Number(raw.expected_delivery_days) : 7
  const createdAtDate = raw.created_at ? new Date(raw.created_at) : new Date()

  const orderDeliveryDate =
    raw.expected_delivery_date ||
    calculateExpectedDeliveryDate(defaultDays, createdAtDate).toISOString()

  const enrichedItems = (raw.order_items || []).map((item: any) => {
    const itemDays = item.expected_delivery_days != null ? Number(item.expected_delivery_days) : defaultDays
    const itemDeliveryDate =
      item.estimated_delivery_date ||
      calculateExpectedDeliveryDate(itemDays, createdAtDate).toISOString()

    return {
      ...item,
      expected_delivery_days: itemDays,
      estimated_delivery_date: itemDeliveryDate
    }
  })

  return {
    ...raw,
    expected_delivery_days: defaultDays,
    expected_delivery_date: orderDeliveryDate,
    order_items: enrichedItems
  } as T
}
