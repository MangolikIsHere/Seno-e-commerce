/**
 * SENO Authoritative Seller Order Helpers
 * Strictly isolates and groups order items by seller ownership,
 * distinguishes SENO Platform from third-party resellers,
 * and flags missing seller records for administrator investigation.
 */

export const PLATFORM_SELLER_ID = 'fb09c575-2d0c-48d8-b1ff-b7a1ead8407a'
export const PLATFORM_STORE_NAME = 'SENO Platform'

export interface AuthoritativeSellerInfo {
  id: string
  name: string
  isPlatform: boolean
  isMissing: boolean
  slug?: string | null
}

export function getAuthoritativeSellerInfo(item: any): AuthoritativeSellerInfo {
  if (!item) {
    return {
      id: 'missing',
      name: 'Seller information unavailable',
      isPlatform: false,
      isMissing: true,
      slug: null
    }
  }

  const sellerRel = item.sellers
  const sellerId = item.seller_id || sellerRel?.id

  // Check if platform-owned
  const isPlatform =
    sellerRel?.seller_type === 'platform' ||
    sellerId === PLATFORM_SELLER_ID ||
    sellerRel?.store_name === 'SENO' ||
    sellerRel?.slug === 'seno-official'

  if (isPlatform) {
    return {
      id: sellerId || PLATFORM_SELLER_ID,
      name: PLATFORM_STORE_NAME,
      isPlatform: true,
      isMissing: false,
      slug: sellerRel?.slug || 'seno-official'
    }
  }

  // Reseller with confirmed store name
  if (sellerRel?.store_name) {
    return {
      id: sellerId || sellerRel.id,
      name: sellerRel.store_name,
      isPlatform: false,
      isMissing: false,
      slug: sellerRel.slug || null
    }
  }

  // If item has seller_id or sellers record without a valid name or relation missing
  return {
    id: sellerId || 'missing',
    name: 'Seller information unavailable',
    isPlatform: false,
    isMissing: true,
    slug: null
  }
}

export interface SellerOrderGroup {
  sellerId: string
  sellerName: string
  isPlatform: boolean
  isMissing: boolean
  slug?: string | null
  items: any[]
  totalUnits: number
  subtotal: number
  commissionAmount: number
  sellerPayoutAmount: number
  fulfillmentStatusSummary: string
  trackingNumbers: string[]
  carriers: string[]
  estimatedDeliveryDates: string[]
}

export function groupOrderItemsBySeller(orderItems: any[] = []): SellerOrderGroup[] {
  const groupsMap = new Map<string, SellerOrderGroup>()

  for (const item of orderItems) {
    const sellerInfo = getAuthoritativeSellerInfo(item)
    const key = sellerInfo.isMissing ? `missing_${item.seller_id || item.id}` : sellerInfo.id

    let group = groupsMap.get(key)
    if (!group) {
      group = {
        sellerId: sellerInfo.id,
        sellerName: sellerInfo.name,
        isPlatform: sellerInfo.isPlatform,
        isMissing: sellerInfo.isMissing,
        slug: sellerInfo.slug,
        items: [],
        totalUnits: 0,
        subtotal: 0,
        commissionAmount: 0,
        sellerPayoutAmount: 0,
        fulfillmentStatusSummary: 'unfulfilled',
        trackingNumbers: [],
        carriers: [],
        estimatedDeliveryDates: []
      }
      groupsMap.set(key, group)
    }

    group.items.push(item)
    const qty = Number(item.quantity) || 1
    group.totalUnits += qty
    group.subtotal += Number(item.total_price) || (Number(item.unit_price) * qty) || 0
    group.commissionAmount += Number(item.commission_amount) || 0
    group.sellerPayoutAmount += Number(item.seller_payout_amount) || 0

    if (item.tracking_number && !group.trackingNumbers.includes(item.tracking_number)) {
      group.trackingNumbers.push(item.tracking_number)
    }
    if (item.carrier && !group.carriers.includes(item.carrier)) {
      group.carriers.push(item.carrier)
    }
    if (item.estimated_delivery_date && !group.estimatedDeliveryDates.includes(item.estimated_delivery_date)) {
      group.estimatedDeliveryDates.push(item.estimated_delivery_date)
    }
  }

  const groups = Array.from(groupsMap.values())

  // Compute status summary for each group
  for (const group of groups) {
    const statuses = Array.from(new Set(group.items.map(i => i.fulfillment_status || 'unfulfilled')))
    if (statuses.length === 1) {
      group.fulfillmentStatusSummary = statuses[0]
    } else {
      group.fulfillmentStatusSummary = 'mixed'
    }
  }

  return groups
}
