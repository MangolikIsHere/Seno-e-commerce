'use server'

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { supabase as publicSupabase } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin'
import { HeroSlideRecord, DEFAULT_HERO_SLIDE } from './hero-slides-shared'

export type { HeroSlideRecord }

const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'hero_slides.json')

function safeRevalidate() {
  try {
    revalidateTag('hero_slides', 'seconds')
  } catch {
    // Safely ignore when called outside Next.js request scope
  }
  try {
    revalidatePath('/')
    revalidatePath('/admin/storefront/hero')
  } catch {
    // Safely ignore when called outside Next.js request scope
  }
}

function readLocalHeroSlides(): HeroSlideRecord[] {
  try {
    if (fs.existsSync(LOCAL_DATA_PATH)) {
      const raw = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.display_priority ?? 1) - (b.display_priority ?? 1))
      }
    }
  } catch (err) {
    console.warn('[HeroSlides] Error reading local hero_slides.json:', err)
  }
  return [DEFAULT_HERO_SLIDE]
}

function writeLocalHeroSlides(slides: HeroSlideRecord[]): void {
  try {
    const dir = path.dirname(LOCAL_DATA_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const sorted = [...slides].sort((a, b) => (a.display_priority ?? 1) - (b.display_priority ?? 1))
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(sorted, null, 2), 'utf-8')
  } catch (err) {
    console.error('[HeroSlides] Error writing local hero_slides.json:', err)
  }
}

/**
 * Retrieve all hero slides for admin management.
 * Checks Supabase table first; falls back seamlessly to local JSON.
 */
export async function getAllHeroSlides(): Promise<HeroSlideRecord[]> {
  try {
    const { data, error } = await publicSupabase
      .from('hero_slides')
      .select('*')
      .order('display_priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (!error && Array.isArray(data)) {
      return data
    }
    if (error && error.code !== 'PGRST205') {
      console.warn('[HeroSlides] Supabase query notice:', error.message)
    }
  } catch (err) {
    console.warn('[HeroSlides] Supabase fetch fallback to local:', err)
  }

  return readLocalHeroSlides()
}

/**
 * Server-cached active hero slides retriever for the storefront homepage.
 */
export const getCachedActiveHeroSlides = unstable_cache(
  async (): Promise<HeroSlideRecord[]> => {
    try {
      const { data, error } = await publicSupabase
        .from('hero_slides')
        .select('*')
        .eq('is_active', true)
        .order('display_priority', { ascending: true })
        .order('created_at', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        return data
      }
      if (error && error.code !== 'PGRST205') {
        console.warn('[HeroSlides] Active slides query notice:', error.message)
      }
    } catch (err) {
      console.warn('[HeroSlides] Active slides fetch fallback to local:', err)
    }

    const local = readLocalHeroSlides()
    const active = local.filter(s => s.is_active)
    return active.length > 0 ? active : [DEFAULT_HERO_SLIDE]
  },
  ['seno-active-hero-slides'],
  { revalidate: 60, tags: ['hero_slides'] }
)

/**
 * Server Action: Create or update a hero slide.
 */
export async function saveHeroSlideAction(
  slideData: Partial<HeroSlideRecord> & { id?: string; title: string; headline: string }
): Promise<{ success: boolean; slide?: HeroSlideRecord; error?: string }> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin privileges required.' }
  }

  if (!slideData.title || slideData.title.trim() === '') {
    return { success: false, error: 'Slide title is required.' }
  }
  if (!slideData.headline || slideData.headline.trim() === '') {
    return { success: false, error: 'Slide headline is required.' }
  }
  if (!slideData.image_url || slideData.image_url.trim() === '') {
    return { success: false, error: 'Desktop background image is required.' }
  }

  const id = slideData.id || crypto.randomUUID()
  const now = new Date().toISOString()

  const payload: HeroSlideRecord = {
    id,
    title: slideData.title.trim(),
    eyebrow: slideData.eyebrow ? slideData.eyebrow.trim() : null,
    headline: slideData.headline.trim(),
    subheading: slideData.subheading ? slideData.subheading.trim() : null,
    cta_text: slideData.cta_text && slideData.cta_text.trim() ? slideData.cta_text.trim() : 'SHOP NOW',
    cta_link: slideData.cta_link && slideData.cta_link.trim() ? slideData.cta_link.trim() : '/collections/all',
    image_url: slideData.image_url.trim(),
    mobile_image_url: slideData.mobile_image_url && slideData.mobile_image_url.trim() ? slideData.mobile_image_url.trim() : null,
    image_alt: slideData.image_alt ? slideData.image_alt.trim() : slideData.title.trim(),
    image_focal_point: slideData.image_focal_point || 'center',
    text_alignment: slideData.text_alignment || 'left',
    content_placement: slideData.content_placement || 'bottom-left',
    overlay_opacity: typeof slideData.overlay_opacity === 'number' ? slideData.overlay_opacity : 25,
    is_active: slideData.is_active ?? true,
    display_priority: typeof slideData.display_priority === 'number' ? slideData.display_priority : 1,
    created_at: slideData.created_at || now,
    updated_at: now
  }

  // 1. Attempt Supabase Upsert
  try {
    const { data, error } = await publicSupabase
      .from('hero_slides')
      .upsert(payload)
      .select()
      .single()

    if (!error && data) {
      // Also sync local
      const local = readLocalHeroSlides()
      const idx = local.findIndex(s => s.id === id)
      if (idx >= 0) local[idx] = data
      else local.push(data)
      writeLocalHeroSlides(local)

      safeRevalidate()
      return { success: true, slide: data }
    }
  } catch (err) {
    console.warn('[HeroSlides] Supabase upsert failed, syncing to local storage:', err)
  }

  // 2. Local Fallback Sync
  const local = readLocalHeroSlides()
  const idx = local.findIndex(s => s.id === id)
  if (idx >= 0) local[idx] = payload
  else local.push(payload)
  writeLocalHeroSlides(local)

  safeRevalidate()

  return { success: true, slide: payload }
}

/**
 * Server Action: Delete a hero slide.
 */
export async function deleteHeroSlideAction(
  slideId: string
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin privileges required.' }
  }

  try {
    await publicSupabase
      .from('hero_slides')
      .delete()
      .eq('id', slideId)
  } catch (err) {
    console.warn('[HeroSlides] Supabase delete warning:', err)
  }

  const local = readLocalHeroSlides().filter(s => s.id !== slideId)
  writeLocalHeroSlides(local)

  safeRevalidate()

  return { success: true }
}

/**
 * Server Action: Toggle slide active/inactive status.
 */
export async function toggleHeroSlideStatusAction(
  slideId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin privileges required.' }
  }

  try {
    await publicSupabase
      .from('hero_slides')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', slideId)
  } catch (err) {
    console.warn('[HeroSlides] Supabase status update warning:', err)
  }

  const local = readLocalHeroSlides()
  const target = local.find(s => s.id === slideId)
  if (target) {
    target.is_active = isActive
    target.updated_at = new Date().toISOString()
    writeLocalHeroSlides(local)
  }

  safeRevalidate()

  return { success: true }
}

/**
 * Server Action: Reorder slides sequentially.
 * Sets display_priority = 1, 2, 3... based on array order.
 */
export async function reorderHeroSlidesAction(
  orderedSlideIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized: Admin privileges required.' }
  }

  if (!Array.isArray(orderedSlideIds) || orderedSlideIds.length === 0) {
    return { success: false, error: 'Invalid slide order list.' }
  }

  const now = new Date().toISOString()

  // 1. Supabase sequential update
  try {
    for (let i = 0; i < orderedSlideIds.length; i++) {
      const id = orderedSlideIds[i]
      await publicSupabase
        .from('hero_slides')
        .update({ display_priority: i + 1, updated_at: now })
        .eq('id', id)
    }
  } catch (err) {
    console.warn('[HeroSlides] Supabase reorder warning:', err)
  }

  // 2. Local Fallback update
  const local = readLocalHeroSlides()
  const map = new Map<string, number>()
  orderedSlideIds.forEach((id, index) => {
    map.set(id, index + 1)
  })

  local.forEach(slide => {
    if (map.has(slide.id)) {
      slide.display_priority = map.get(slide.id)!
      slide.updated_at = now
    }
  })

  writeLocalHeroSlides(local)

  safeRevalidate()

  return { success: true }
}
