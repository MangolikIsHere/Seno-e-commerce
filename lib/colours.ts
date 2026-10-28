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
 * If customHex is provided, it is returned if valid.
 */
export function getColourSwatchHex(colourName?: string | null, customHex?: string | null): string {
  if (customHex && typeof customHex === 'string') {
    const trimmedHex = customHex.trim()
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmedHex)) {
      return trimmedHex
    }
  }

  if (!colourName) return '#121212'
  const trimmed = colourName.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return trimmed
  }

  const key = normalizeColourKey(trimmed)
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

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

/**
 * Returns a guaranteed valid 6-digit uppercase hex code (#RRGGBB)
 * suitable for native `<input type="color">`.
 */
export function getStandardHexForColour(colourName?: string | null, customHex?: string | null): string {
  if (customHex && typeof customHex === 'string') {
    const trimmed = customHex.trim()
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
      return trimmed.toUpperCase()
    }
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      const r = trimmed[1]
      const g = trimmed[2]
      const b = trimmed[3]
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
    }
  }

  const hex = getColourSwatchHex(colourName)
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return hex.toUpperCase()
  }
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  if (hex.startsWith('hsl(')) {
    const match = hex.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/)
    if (match) {
      return hslToHex(Number(match[1]), Number(match[2]), Number(match[3]))
    }
  }

  return '#121212'
}

/**
 * Extract colour image and colour hex mappings from a product's details JSONB array.
 */
export function extractColourImagesFromDetails(details: any): {
  colourImages: Record<string, string[]>
  colourPrimaries: Record<string, string>
  colourHexes: Record<string, string>
} {
  const result: {
    colourImages: Record<string, string[]>
    colourPrimaries: Record<string, string>
    colourHexes: Record<string, string>
  } = {
    colourImages: {},
    colourPrimaries: {},
    colourHexes: {}
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
      if (d.__colour_hexes && typeof d.__colour_hexes === 'object') {
        for (const [c, hex] of Object.entries(d.__colour_hexes)) {
          if (hex && typeof hex === 'string') {
            const key = normalizeColourKey(c)
            result.colourHexes[key] = hex.trim()
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
  colourHexes: Record<string, string>
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

  return { colourImages, colourPrimaries, colourHexes: fromDetails.colourHexes, allImages }
}

/**
 * Prepares the product `details` JSONB array with colour-specific image and hex metadata.
 */
export function prepareColourDetailsPayload(
  rawDetails: any[] = [],
  colourImagesOrImagesList: Record<string, string[]> | any[],
  colourPrimaries: Record<string, string> = {},
  colourHexes: Record<string, string> = {}
): any[] {
  const clean = (Array.isArray(rawDetails) ? rawDetails : []).filter(
    d => !(typeof d === 'object' && d !== null && (
      d.__colour_images !== undefined ||
      d.__colour_primaries !== undefined ||
      d.__colour_hexes !== undefined
    ))
  )

  let finalImagesMap: Record<string, string[]> = {}
  let finalPrimariesMap: Record<string, string> = { ...colourPrimaries }
  let finalHexesMap: Record<string, string> = { ...colourHexes }

  if (Array.isArray(colourImagesOrImagesList)) {
    const extracted = buildProductColourImageMap(colourImagesOrImagesList)
    finalImagesMap = extracted.colourImages
    finalPrimariesMap = { ...extracted.colourPrimaries, ...colourPrimaries }
    finalHexesMap = { ...extracted.colourHexes, ...colourHexes }
  } else if (colourImagesOrImagesList && typeof colourImagesOrImagesList === 'object') {
    finalImagesMap = colourImagesOrImagesList
  }

  // Only attach if there are actual colour images or colour hexes configured
  if (Object.keys(finalImagesMap).length > 0 || Object.keys(finalHexesMap).length > 0) {
    clean.unshift({
      __colour_images: finalImagesMap,
      __colour_primaries: finalPrimariesMap,
      __colour_hexes: finalHexesMap
    })
  }

  return clean
}

/**
 * Extracts only custom colour hex overrides from details JSONB array.
 */
export function extractColourHexesFromDetails(details: any = []): Record<string, string> {
  return extractColourImagesFromDetails(details).colourHexes
}
