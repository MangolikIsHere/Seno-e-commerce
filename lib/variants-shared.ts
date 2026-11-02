/**
 * Shared helpers and constants for SENO Product Variants and Sizing.
 */

export const FREE_SIZE_CANONICAL = 'Free Size'
export const FREE_SIZE_UPPER = 'FREE SIZE'

export const STANDARD_SIZES: readonly string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/**
 * Checks if a given size string represents "Free Size" (case-insensitive).
 */
export function isFreeSize(size?: string | null): boolean {
  if (!size) return false
  const s = size.trim().toLowerCase()
  return s === 'free size' || s === 'freesize' || s === 'free-size' || s === 'one size' || s === 'onesize' || s === 'os'
}

/**
 * Normalizes any size string into canonical display formatting.
 * Free Size variants are always normalized to "Free Size".
 */
export function normalizeVariantSize(size?: string | null): string {
  if (!size) return ''
  const trimmed = size.trim()
  if (isFreeSize(trimmed)) {
    return FREE_SIZE_CANONICAL
  }
  return trimmed
}

/**
 * Formats variant size for customer-facing display labels, badges, and chips.
 * Returns "FREE SIZE" for Free Size, otherwise the trimmed size.
 */
export function formatSizeDisplay(size?: string | null): string {
  if (!size) return ''
  const trimmed = size.trim()
  if (isFreeSize(trimmed)) {
    return FREE_SIZE_UPPER
  }
  return trimmed
}

/**
 * Generates a clean, unique SKU segment for a size.
 * Uses "FS" for Free Size, otherwise alphanumeric representation.
 */
export function getSizeSkuSegment(size?: string | null): string {
  if (!size || isFreeSize(size)) {
    return 'FS'
  }
  const clean = size.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return clean.slice(0, 4) || 'SZ'
}

