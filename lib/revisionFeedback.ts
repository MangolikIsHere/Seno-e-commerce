/**
 * SENO Marketplace — Seller Product Revision Feedback Module
 * Provides structured serialization, parsing, field mapping, and summary generation
 * for the seller product revision and admin change-request workflow.
 */

export type AffectedFieldKey =
  | 'title_description'
  | 'images'
  | 'category'
  | 'pricing'
  | 'variants'
  | 'inventory'
  | 'shipping_logistics'

export interface AffectedFieldConfig {
  key: AffectedFieldKey
  label: string
  shortLabel: string
  step: 1 | 2 | 3 | 4
  anchor: string
  description: string
}

export const AFFECTED_FIELDS: Record<AffectedFieldKey, AffectedFieldConfig> = {
  title_description: {
    key: 'title_description',
    label: 'Product Title or Description',
    shortLabel: 'Title & Desc',
    step: 1,
    anchor: 'basic-info',
    description: 'Product name, URL slug, or brand description'
  },
  images: {
    key: 'images',
    label: 'Product Images & Galleries',
    shortLabel: 'Images',
    step: 2,
    anchor: 'media-gallery',
    description: 'Cover photo, image resolution, colour photography, or display order'
  },
  category: {
    key: 'category',
    label: 'Category & Collections',
    shortLabel: 'Category',
    step: 1,
    anchor: 'taxonomy',
    description: 'Storefront category or seasonal collection assignment'
  },
  pricing: {
    key: 'pricing',
    label: 'Price & Discount',
    shortLabel: 'Pricing',
    step: 3,
    anchor: 'pricing',
    description: 'Selling price, compare-at MRP price, or markups'
  },
  variants: {
    key: 'variants',
    label: 'Sizes & Colours',
    shortLabel: 'Variants',
    step: 4,
    anchor: 'variants',
    description: 'Size breakdown, colour tags, or variant combinations'
  },
  inventory: {
    key: 'inventory',
    label: 'SKU & Inventory Quantities',
    shortLabel: 'Inventory',
    step: 4,
    anchor: 'inventory',
    description: 'Unique SKU codes or available stock quantity counts'
  },
  shipping_logistics: {
    key: 'shipping_logistics',
    label: 'Weight, Shipping & Return Policy',
    shortLabel: 'Shipping',
    step: 3,
    anchor: 'shipping',
    description: 'Item gram weight, delivery charges, or return & exchange window'
  }
}

export interface RevisionFeedback {
  id?: string
  instructions: string
  affected_fields: AffectedFieldKey[]
  additional_notes?: string
  requested_at?: string
  resubmitted_at?: string
  status?: 'pending_revision' | 'resubmitted' | 'approved'
}

/**
 * Serializes admin feedback into a structured JSON string for storage in `rejection_reason`.
 */
export function serializeRevisionFeedback(input: {
  instructions: string
  affected_fields?: AffectedFieldKey[]
  affectedFields?: AffectedFieldKey[]
  additional_notes?: string
  additionalNotes?: string
  requested_at?: string
}): string {
  const fields = input.affected_fields || input.affectedFields || []
  const notes = input.additional_notes || input.additionalNotes || ''
  const payload = {
    _seno_revision: true,
    instructions: input.instructions.trim(),
    affected_fields: Array.isArray(fields) ? fields : [],
    additional_notes: notes.trim(),
    requested_at: input.requested_at || new Date().toISOString(),
    status: 'pending_revision'
  }
  return JSON.stringify(payload)
}

/**
 * Intelligently infers affected fields from unformatted legacy text strings.
 */
export function inferAffectedFields(text: string): AffectedFieldKey[] {
  const lower = text.toLowerCase()
  const fields: AffectedFieldKey[] = []

  if (lower.includes('image') || lower.includes('photo') || lower.includes('picture') || lower.includes('gallery') || lower.includes('cover')) {
    fields.push('images')
  }
  if (lower.includes('variant') || lower.includes('size') || lower.includes('colour') || lower.includes('color')) {
    fields.push('variants')
  }
  if (lower.includes('price') || lower.includes('discount') || lower.includes('cost') || lower.includes('mrp') || lower.includes('pricing')) {
    fields.push('pricing')
  }
  if (lower.includes('sku') || lower.includes('stock') || lower.includes('inventory') || lower.includes('quantity')) {
    fields.push('inventory')
  }
  if (lower.includes('title') || lower.includes('name') || lower.includes('description') || lower.includes('slug')) {
    fields.push('title_description')
  }
  if (lower.includes('category') || lower.includes('collection')) {
    fields.push('category')
  }
  if (lower.includes('shipping') || lower.includes('weight') || lower.includes('delivery') || lower.includes('return')) {
    fields.push('shipping_logistics')
  }

  return fields
}

/**
 * Extracts revision history from product details JSONB.
 */
export function extractRevisionHistory(details: any): RevisionFeedback[] {
  if (!details) return []
  let list: any[] = []
  if (Array.isArray(details)) {
    const meta = details.find(d => d && typeof d === 'object' && d.__revision_history)
    if (meta && Array.isArray(meta.__revision_history)) {
      list = meta.__revision_history
    }
  } else if (typeof details === 'object' && details.__revision_history) {
    list = details.__revision_history
  }
  return list.map((item, idx) => ({
    id: item.id || `rev_${idx}`,
    instructions: item.instructions || item.reason || '',
    affected_fields: Array.isArray(item.affected_fields) ? item.affected_fields : [],
    additional_notes: item.additional_notes || '',
    requested_at: item.requested_at,
    resubmitted_at: item.resubmitted_at,
    status: item.status || 'pending_revision'
  }))
}

/**
 * Parses revision feedback from `rejection_reason` and product `details`.
 * Handles both new structured JSON payloads and legacy plain-text feedback.
 */
export function parseRevisionFeedback(
  rawReason: string | null | undefined,
  details?: any
): RevisionFeedback | null {
  // 1. Try to parse from rawReason
  if (rawReason && typeof rawReason === 'string' && rawReason.trim()) {
    try {
      const parsed = JSON.parse(rawReason)
      if (parsed && typeof parsed === 'object') {
        const instructions = String(parsed.instructions || parsed.reason || '').trim()
        if (instructions) {
          const rawFields = Array.isArray(parsed.affected_fields) ? parsed.affected_fields : []
          const affectedFields: AffectedFieldKey[] = rawFields.filter(
            (k: any): k is AffectedFieldKey => k in AFFECTED_FIELDS
          )
          return {
            instructions,
            affected_fields: affectedFields.length > 0 ? affectedFields : inferAffectedFields(instructions),
            additional_notes: parsed.additional_notes || '',
            requested_at: parsed.requested_at,
            status: parsed.status || 'pending_revision'
          }
        }
      }
    } catch {
      // Plain text rejection reason (legacy or quick note)
      const text = rawReason.trim()
      return {
        instructions: text,
        affected_fields: inferAffectedFields(text),
        additional_notes: '',
        requested_at: undefined,
        status: 'pending_revision'
      }
    }
  }

  // 2. Check details for __revision_history if rejection_reason was cleared or archived
  if (details) {
    const history = extractRevisionHistory(details)
    if (history.length > 0) {
      return history[history.length - 1]
    }
  }

  return null
}

/**
 * Appends a new revision feedback entry to product details JSONB.
 */
export function appendRevisionHistory(
  existingDetails: any,
  feedback: RevisionFeedback
): any[] {
  const detailsArray: any[] = Array.isArray(existingDetails) ? [...existingDetails] : []
  const existingMetaIndex = detailsArray.findIndex(d => d && typeof d === 'object' && d.__revision_history)
  let historyList: any[] = []

  if (existingMetaIndex >= 0) {
    historyList = [...(detailsArray[existingMetaIndex].__revision_history || [])]
  }

  historyList.push({
    ...feedback,
    id: feedback.id || `rev_${Date.now()}`
  })

  const newMeta = { __revision_history: historyList }
  if (existingMetaIndex >= 0) {
    detailsArray[existingMetaIndex] = { ...detailsArray[existingMetaIndex], ...newMeta }
  } else {
    detailsArray.unshift(newMeta)
  }

  return detailsArray
}

/**
 * Updates the latest revision record in details to 'resubmitted' when a seller resubmits.
 */
export function markLatestRevisionResubmitted(existingDetails: any): any[] {
  const detailsArray: any[] = Array.isArray(existingDetails) ? [...existingDetails] : []
  const existingMetaIndex = detailsArray.findIndex(d => d && typeof d === 'object' && d.__revision_history)

  if (existingMetaIndex >= 0) {
    const historyList = [...(detailsArray[existingMetaIndex].__revision_history || [])]
    if (historyList.length > 0) {
      const last = { ...historyList[historyList.length - 1] }
      last.status = 'resubmitted'
      last.resubmitted_at = new Date().toISOString()
      historyList[historyList.length - 1] = last
      detailsArray[existingMetaIndex] = { ...detailsArray[existingMetaIndex], __revision_history: historyList }
    }
  }

  return detailsArray
}

/**
 * Formats a concise summary string for dashboard display.
 */
export function formatRevisionSummary(feedback: {
  instructions: string
  affected_fields?: AffectedFieldKey[]
  affectedFields?: AffectedFieldKey[]
}): string {
  const instructions = feedback.instructions || ''
  const affected_fields = feedback.affected_fields || feedback.affectedFields || []

  if (affected_fields && affected_fields.length > 0) {
    const labels = affected_fields.map(k => AFFECTED_FIELDS[k]?.shortLabel || k)
    const fieldsText = labels.join(' & ')

    if (instructions.toLowerCase().includes('changes requested by seno admin')) {
      return `Revise ${fieldsText}: Admin requested corrections`
    }

    const cleanInst = instructions.replace(/^changes requested by seno admin\.?:?\s*/i, '')
    if (cleanInst.length > 0 && cleanInst.length <= 50) {
      return `Revise ${fieldsText}: ${cleanInst}`
    }
    if (cleanInst.length > 50) {
      return `Revise ${fieldsText}: ${cleanInst.slice(0, 47)}...`
    }
    return `Revise ${fieldsText}`
  }

  if (instructions.length > 70) {
    return `${instructions.slice(0, 67)}...`
  }
  return instructions
}
