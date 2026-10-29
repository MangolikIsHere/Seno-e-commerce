'use server'

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { revalidatePath, revalidateTag, updateTag, unstable_cache } from 'next/cache'
import { supabase as publicSupabase } from '@/lib/supabase'
import { getAdminSupabase } from '@/lib/supabaseAdmin'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { checkIsAdmin } from '@/lib/admin'
import { HeroSlideRecord, DEFAULT_HERO_SLIDE } from './hero-slides-shared'

export type { HeroSlideRecord }

const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'hero_slides.json')

const LEGACY_ID_MAP: Record<string, string> = {
  'slide-ss26-default': '00000000-0000-0000-0000-000000000001',
  'slide-essentials-bogo': '00000000-0000-0000-0000-000000000002',
  'slide-festive-capsule': '00000000-0000-0000-0000-000000000003'
}

function normalizeSlideId(id?: string | null): string {
  if (!id) return crypto.randomUUID()
  const trimmed = id.trim()
  if (LEGACY_ID_MAP[trimmed]) return LEGACY_ID_MAP[trimmed]
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
  return isUuid ? trimmed : crypto.randomUUID()
}

/**
 * Returns an authoritative Supabase client with admin capabilities when available,
 * falling back to server session client or public anonymous client.
 */
async function getAuthoritativeSupabase() {
  try {
    return getAdminSupabase()
  } catch {
    try {
      return await createServerSupabase()
    } catch {
      return publicSupabase
    }
  }
}

/**
 * Invalidate hero slide caches across tags and paths immediately.
 */
export async function invalidateHeroSlidesCache(): Promise<void> {
  try {
    updateTag('hero_slides')
  } catch {
    // Safely ignore when outside Next.js request scope
  }
  try {
    revalidateTag('hero_slides', 'seconds')
  } catch {
    // Safely ignore when outside Next.js request scope
  }
  try {
    revalidatePath('/', 'page')
    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/admin/storefront/hero')
  } catch {
    // Safely ignore when outside Next.js request scope
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
    const supabase = await getAuthoritativeSupabase()
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .order('display_priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (!error && Array.isArray(data) && data.length > 0) {
      try {
        writeLocalHeroSlides(data)
      } catch {}
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
 * Direct retriever for active hero slides.
 */
export async function getActiveHeroSlides(): Promise<HeroSlideRecord[]> {
  try {
    const supabase = await getAuthoritativeSupabase()
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('display_priority', { ascending: true })
      .order('created_at', { ascending: true })

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        return data
      }
      return [DEFAULT_HERO_SLIDE]
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
}

const getCachedActiveHeroSlidesInternal = unstable_cache(
  getActiveHeroSlides,
  ['seno-active-hero-slides'],
  { revalidate: 60, tags: ['hero_slides'] }
)

/**
 * Server-cached active hero slides retriever for the storefront homepage.
 */
export async function getCachedActiveHeroSlides(): Promise<HeroSlideRecord[]> {
  try {
    return await getCachedActiveHeroSlidesInternal()
  } catch {
    // When called outside Next.js server runtime (e.g. test scripts), fallback directly
    return await getActiveHeroSlides()
  }
}

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

  const id = normalizeSlideId(slideData.id)
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

  // 1. Authoritative write to Supabase
  let savedSlide: HeroSlideRecord = payload

  try {
    const supabase = await getAuthoritativeSupabase()
    const { data, error } = await supabase
      .from('hero_slides')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error('[HeroSlides] Supabase upsert error:', error)
      return { success: false, error: `Database error saving slide: ${error.message}` }
    }

    if (data) {
      savedSlide = data
    }
  } catch (err: any) {
    console.error('[HeroSlides] Database connection error during save:', err)
    return { success: false, error: `Database error: ${err?.message || 'Connection failed'}` }
  }

  // 2. Synchronize local fallback mirror
  try {
    const local = readLocalHeroSlides()
    const idx = local.findIndex(s => s.id === savedSlide.id || (slideData.id && s.id === slideData.id))
    if (idx >= 0) local[idx] = savedSlide
    else local.push(savedSlide)
    writeLocalHeroSlides(local)
  } catch (err) {
    console.warn('[HeroSlides] Local fallback sync warning:', err)
  }

  // 3. Immediately invalidate cache
  await invalidateHeroSlidesCache()

  return { success: true, slide: savedSlide }
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

  const id = normalizeSlideId(slideId)

  try {
    const supabase = await getAuthoritativeSupabase()
    const { error } = await supabase
      .from('hero_slides')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[HeroSlides] Supabase delete error:', error)
      return { success: false, error: `Database error deleting slide: ${error.message}` }
    }
  } catch (err: any) {
    console.error('[HeroSlides] Supabase delete connection error:', err)
    return { success: false, error: `Database error: ${err?.message || 'Connection failed'}` }
  }

  try {
    const local = readLocalHeroSlides().filter(s => s.id !== slideId && s.id !== id)
    writeLocalHeroSlides(local)
  } catch (err) {
    console.warn('[HeroSlides] Local delete warning:', err)
  }

  await invalidateHeroSlidesCache()

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

  const id = normalizeSlideId(slideId)

  try {
    const supabase = await getAuthoritativeSupabase()
    const { error } = await supabase
      .from('hero_slides')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[HeroSlides] Supabase status update error:', error)
      return { success: false, error: `Database error updating status: ${error.message}` }
    }
  } catch (err: any) {
    console.error('[HeroSlides] Supabase status connection error:', err)
    return { success: false, error: `Database error: ${err?.message || 'Connection failed'}` }
  }

  try {
    const local = readLocalHeroSlides()
    const target = local.find(s => s.id === slideId || s.id === id)
    if (target) {
      target.is_active = isActive
      target.updated_at = new Date().toISOString()
      writeLocalHeroSlides(local)
    }
  } catch (err) {
    console.warn('[HeroSlides] Local toggle warning:', err)
  }

  await invalidateHeroSlidesCache()

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

  // 1. Authoritative sequential update in Supabase
  try {
    const supabase = await getAuthoritativeSupabase()
    for (let i = 0; i < orderedSlideIds.length; i++) {
      const rawId = orderedSlideIds[i]
      const id = normalizeSlideId(rawId)

      const { error } = await supabase
        .from('hero_slides')
        .update({ display_priority: i + 1, updated_at: now })
        .eq('id', id)

      if (error) {
        console.error('[HeroSlides] Supabase reorder error for id', id, error)
        return { success: false, error: `Failed to update slide order in database: ${error.message}` }
      }
    }
  } catch (err: any) {
    console.error('[HeroSlides] Supabase reorder exception:', err)
    return { success: false, error: `Failed to connect to database for reordering: ${err?.message || 'Connection error'}` }
  }

  // 2. Local Fallback update
  try {
    const local = readLocalHeroSlides()
    const map = new Map<string, number>()
    orderedSlideIds.forEach((rawId, index) => {
      const normalized = normalizeSlideId(rawId)
      map.set(rawId, index + 1)
      map.set(normalized, index + 1)
    })

    local.forEach(slide => {
      if (map.has(slide.id)) {
        slide.display_priority = map.get(slide.id)!
        slide.updated_at = now
      }
    })

    writeLocalHeroSlides(local)
  } catch (err) {
    console.warn('[HeroSlides] Local fallback reorder sync warning:', err)
  }

  await invalidateHeroSlidesCache()

  return { success: true }
}
