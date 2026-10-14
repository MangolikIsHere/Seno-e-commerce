/**
 * SENO Fashion Marketplace — Colour and Swatch Utility System
 * Provides color mapping, swatch resolution, case-insensitive key normalization,
 * and resilient colour-specific image extraction across database rows and details JSONB.
 */

export interface ColourGroupConfig {
  colour: string
  hex?: string
  images: {
    url: string
    alt_text?: string
    display_order: number
    is_primary: boolean
  }[]
  primaryImage?: string
}

// Curated luxury fashion color palette for SENO's minimal aesthetic
const KNOWN_COLOUR_HEX_MAP: Record<string, string> = {
  black: '#121212',
  'jet black': '#0a0a0a',
  'washed black': '#252525',
  white: '#ffffff',
  'off white': '#f5f5f0',
  'off-white': '#f5f5f0',
  ivory: '#faf6ee',
  cream: '#fdfbf7',
  chalk: '#ebe9e1',
  grey: '#6e6e73',
  gray: '#6e6e73',
  'heather grey': '#99999f',
  'light grey': '#d1d1d6',
  'slate grey': '#545b62',
  charcoal: '#333336',
  anthracite: '#28282b',
  navy: '#1b263b',
  'washed navy': '#27384e',
  'midnight navy': '#101726',
  indigo: '#263859',
  blue: '#2b4c7e',
  'light blue': '#9bbcd8',
  sky: '#a5c4d4',
  beige: '#d8ccb8',
  sand: '#d2bca5',
  camel: '#b38d6d',
  tan: '#c19a6b',
  khaki: '#9e8c6c',
  taupe: '#8b8589',
  brown: '#4a3b32',
  chocolate: '#382218',
  espresso: '#2a1a12',
  olive: '#4a5340',
  'military olive': '#3f4736',
  sage: '#8a9a86',
  forest: '#1e3f20',
  'forest green': '#173f27',
  emerald: '#064e3b',
  green: '#2d6a4f',
  burgundy: '#581825',
  maroon: '#4a1525',
  wine: '#4d1929',
  crimson: '#7b1122',
  red: '#991b1b',
  rust: '#8c3a27',
  terracotta: '#b35d43',
  blush: '#e8c4be',
  rose: '#c98a8a',
  pink: '#e2a7b1',
  plum: '#47223e',
  mauve: '#915f78',
  ochre: '#bf7e24',
  mustard: '#c8963e',
  gold: '#d4af37',
  silver: '#c0c0c0'
}

/**
 * Normalizes a colour string to a trimmed lowercase key.
 */
export function normalizeColourKey(name?: string | null): string {
  return (name || '').trim().toLowerCase()
}

/**
 * Returns a hex color for a given fashion colour name.
 */
export function getColourSwatchHex(colourName?: string | null): string {
  if (!colourName) return '#121212'
  const key = normalizeColourKey(colourName)
  if (KNOWN_COLOUR_HEX_MAP[key]) return KNOWN_COLOUR_HEX_MAP[key]

  // Check if any substring matches a known key (e.g. "Vintage Washed Navy" -> "navy")
  for (const [known, hex] of Object.entries(KNOWN_COLOUR_HEX_MAP)) {
    if (key.includes(known)) return hex
  }

  // Consistent hash for unmapped custom colors
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash % 360)
  return `hsl(${h}, 18%, 38%)`
}

/**
 * Extract colour image mappings from a product's details JSONB array.
 */
export function extractColourImagesFromDetails(details: any): {
  colourImages: Record<string, string[]>
  colourPrimaries: Record<string, string>
} {
  const result: { colourImages: Record<string, string[]>; colourPrimaries: Record<string, string> } = {
    colourImages: {},
    colourPrimaries: {}
  }

  if (!details) return result

  const items = Array.isArray(details) ? details : [details]

  for (const d of items) {
    if (typeof d === 'object' && d !== null) {
      if (d.__colour_images && typeof d.__colour_images === 'object') {
        for (const [c, urls] of Object.entries(d.__colour_images)) {
          if (Array.isArray(urls)) {
            const key = normalizeColourKey(c)
            result.colourImages[key] = urls.map(u => String(u).trim()).filter(Boolean)
          }
        }
      }
      if (d.__colour_primaries && typeof d.__colour_primaries === 'object') {
        for (const [c, url] of Object.entries(d.__colour_primaries)) {
          if (url && typeof url === 'string') {
            const key = normalizeColourKey(c)
            result.colourPrimaries[key] = url.trim()
          }
        }
      }
    }
  }

  return result
}

/**
 * Groups product image rows and details into a comprehensive colour mapping.
 */
export function buildProductColourImageMap(
  productImages: any[] = [],
  details: any = []
): {
  colourImages: Record<string, string[]>
  colourPrimaries: Record<string, string>
  allImages: string[]
} {
  const colourImages: Record<string, string[]> = {}
  const colourPrimaries: Record<string, string> = {}
  const allImages: string[] = []

  // 1. First, read directly assigned images from database rows if column exists
  const sorted = [...productImages].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  for (const img of sorted) {
    const url = img.url || img.image_url
    if (!url) continue
    if (!allImages.includes(url)) allImages.push(url)

    if (img.colour && typeof img.colour === 'string') {
      const key = normalizeColourKey(img.colour)
      if (!colourImages[key]) colourImages[key] = []
      if (!colourImages[key].includes(url)) colourImages[key].push(url)

      if (img.is_colour_primary || img.is_primary || !colourPrimaries[key]) {
        if (!colourPrimaries[key] || img.is_colour_primary) {
          colourPrimaries[key] = url
        }
      }
    }
  }

  // 2. Supplement or merge from details metadata (guarantees persistence across migrations)
  const fromDetails = extractColourImagesFromDetails(details)
  for (const [key, urls] of Object.entries(fromDetails.colourImages)) {
    if (!colourImages[key] || colourImages[key].length === 0) {
      colourImages[key] = urls
    } else {
      // Merge unique URLs
      for (const u of urls) {
        if (!colourImages[key].includes(u)) colourImages[key].push(u)
      }
    }
    for (const u of urls) {
      if (!allImages.includes(u)) allImages.push(u)
    }
  }

  for (const [key, primaryUrl] of Object.entries(fromDetails.colourPrimaries)) {
    if (!colourPrimaries[key] && primaryUrl) {
      colourPrimaries[key] = primaryUrl
    }
  }

  // Guarantee that every colour in colourImages has a primary
  for (const [key, urls] of Object.entries(colourImages)) {
    if (!colourPrimaries[key] && urls.length > 0) {
      colourPrimaries[key] = urls[0]
    }
  }

  return { colourImages, colourPrimaries, allImages }
}

/**
 * Prepares the product `details` JSONB array with colour-specific image metadata.
 */
export function prepareColourDetailsPayload(
  rawDetails: any[] = [],
  colourImagesOrImagesList: Record<string, string[]> | any[],
  colourPrimaries: Record<string, string> = {}
): any[] {
  const clean = (Array.isArray(rawDetails) ? rawDetails : []).filter(
    d => !(typeof d === 'object' && d !== null && (d.__colour_images !== undefined || d.__colour_primaries !== undefined))
  )

  let finalImagesMap: Record<string, string[]> = {}
  let finalPrimariesMap: Record<string, string> = { ...colourPrimaries }

  if (Array.isArray(colourImagesOrImagesList)) {
    const extracted = buildProductColourImageMap(colourImagesOrImagesList)
    finalImagesMap = extracted.colourImages
    finalPrimariesMap = { ...extracted.colourPrimaries, ...colourPrimaries }
  } else if (colourImagesOrImagesList && typeof colourImagesOrImagesList === 'object') {
    finalImagesMap = colourImagesOrImagesList
  }

  // Only attach if there are actual colour images configured
  if (Object.keys(finalImagesMap).length > 0) {
    clean.unshift({
      __colour_images: finalImagesMap,
      __colour_primaries: finalPrimariesMap
    })
  }

  return clean
}
