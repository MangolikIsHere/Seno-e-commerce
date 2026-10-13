'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { supabase as publicSupabase } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin'
import { getAdminSupabase } from '@/lib/supabaseAdmin'

export interface CategoryRecord {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  display_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  meta_title?: string | null
  meta_description?: string | null
  products?: { count: number }[]
}

function formatSupabaseError(error: any): string {
  if (!error) return 'Unknown database error'
  return `[${error.code || 'UNKNOWN'}] ${error.message || 'Database query failed'}${
    error.details ? ` - Details: ${error.details}` : ''
  }${error.hint ? ` - Hint: ${error.hint}` : ''}`
}

/**
 * Fetch active storefront categories ordered by display_order, then name.
 * Queries only supported columns in the deployed schema.
 */
const getCachedActiveCategories = unstable_cache(
  async (): Promise<CategoryRecord[]> => {
  const { data, error } = await publicSupabase
    .from('categories')
    .select('id, name, slug, description, image_url, display_order, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    const formatted = formatSupabaseError(error)
    console.error('[lib/categories] Error fetching active categories from Supabase:', formatted, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to fetch active categories: ${formatted}`)
  }

    return (data || []) as CategoryRecord[]
  },
  ['seno-active-categories'],
  { revalidate: 300, tags: ['categories'] }
)

export async function getActiveCategories(): Promise<CategoryRecord[]> {
  return getCachedActiveCategories()
}

/**
 * Fetch all categories (active & inactive) with product counts for admin management.
 */
export async function getAdminCategories(): Promise<CategoryRecord[]> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const supabase = getAdminSupabase()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, display_order, is_active, created_at, updated_at, products(count)')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    const formatted = formatSupabaseError(error)
    console.error('[lib/categories] Error fetching admin categories from Supabase:', formatted, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to fetch admin categories: ${formatted}`)
  }

  return (data || []) as CategoryRecord[]
}

function internalSlugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function slugify(value: string): Promise<string> {
  return internalSlugify(value)
}

/**
 * Revalidate all storefront and admin routes that display category taxonomy.
 */
export async function revalidateCategoryPaths(slug?: string) {
  try {
    revalidateTag('categories', 'seconds')
    revalidatePath('/')
    revalidatePath('/categories')
    revalidatePath('/collections/all')
    revalidatePath('/collections/[category]', 'page')
    if (slug) {
      revalidatePath(`/collections/${slug}`)
    }
    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')
    revalidatePath('/admin/products/new')
    revalidatePath('/seller/products')
    revalidatePath('/seller/products/new')
    revalidatePath('/sitemap.xml')
  } catch (err) {
    console.warn('Category revalidation warning:', err)
  }
}

export interface SaveCategoryInput {
  id?: string
  name: string
  slug?: string
  description?: string
  image_url?: string
  display_order?: number
  is_active?: boolean
  meta_title?: string
  meta_description?: string
}

/**
 * Create or update a category record with validation and slug uniqueness checks.
 */
export async function saveCategory(input: SaveCategoryInput) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const name = input.name.trim()
  const slug = internalSlugify(input.slug?.trim() || name)

  if (!name) throw new Error('Category name is required.')
  if (!slug) throw new Error('A valid URL slug is required.')

  const supabase = getAdminSupabase()

  // Verify slug uniqueness (excluding current category when updating)
  let query = supabase.from('categories').select('id, name').eq('slug', slug)
  if (input.id) {
    query = query.neq('id', input.id)
  }
  const { data: duplicate } = await query.maybeSingle()
  if (duplicate) {
    throw new Error(`The URL slug "${slug}" is already in use by category "${duplicate.name}".`)
  }

  const payload: Record<string, any> = {
    name,
    slug,
    description: input.description?.trim() || null,
    image_url: input.image_url?.trim() || null,
    display_order: Math.max(0, Number(input.display_order || 0)),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString()
  }

  let result
  if (input.id) {
    result = await supabase.from('categories').update(payload).eq('id', input.id).select().single()
  } else {
    payload.created_at = new Date().toISOString()
    result = await supabase.from('categories').insert(payload).select().single()
  }

  if (result.error) {
    const formatted = formatSupabaseError(result.error)
    console.error('[lib/categories] Error saving category:', formatted)
    throw new Error(result.error.message || formatted)
  }

  await revalidateCategoryPaths(slug)
  return { success: true, category: result.data }
}

/**
 * Toggle category active status.
 */
export async function toggleCategoryActive(id: string, isActive: boolean) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const supabase = getAdminSupabase()
  const { data, error } = await supabase
    .from('categories')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) {
    const formatted = formatSupabaseError(error)
    console.error('[lib/categories] Error toggling category active status:', formatted)
    throw new Error(error.message || formatted)
  }

  await revalidateCategoryPaths(data?.slug)
  return { success: true, is_active: isActive }
}

/**
 * Reorder categories atomically by updating display_order according to array order.
 */
export async function reorderCategories(orderedIds: string[]) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('Valid category IDs array is required.')
  }

  const supabase = getAdminSupabase()

  // Update each category display_order
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('categories')
      .update({ display_order: i + 1, updated_at: new Date().toISOString() })
      .eq('id', orderedIds[i])

    if (error) {
      const formatted = formatSupabaseError(error)
      console.error('[lib/categories] Error reordering category:', orderedIds[i], formatted)
      throw new Error(`Failed to update display order for category ${orderedIds[i]}: ${formatted}`)
    }
  }

  await revalidateCategoryPaths()
  return { success: true }
}

/**
 * Safely delete or deactivate a category with product assignment checks and optional reassignment.
 */
export async function deleteCategorySafely(
  categoryId: string,
  options?: { reassignToCategoryId?: string }
) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const supabase = getAdminSupabase()

  // 1. Check existing products assigned to this category
  const { count: productCount, error: countErr } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if (countErr) {
    const formatted = formatSupabaseError(countErr)
    console.error('[lib/categories] Error counting products before delete:', formatted)
    throw new Error(countErr.message || formatted)
  }

  const hasProducts = (productCount || 0) > 0

  // 2. If products exist and reassignment was requested, safely move products
  if (hasProducts && options?.reassignToCategoryId) {
    if (options.reassignToCategoryId === categoryId) {
      throw new Error('Cannot reassign products to the category being deleted.')
    }

    // Verify target category exists and is active
    const { data: targetCat, error: targetErr } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', options.reassignToCategoryId)
      .maybeSingle()

    if (targetErr || !targetCat) {
      throw new Error('Target category for reassignment was not found.')
    }

    const { error: reassignErr } = await supabase
      .from('products')
      .update({ category_id: targetCat.id, updated_at: new Date().toISOString() })
      .eq('category_id', categoryId)

    if (reassignErr) {
      const formatted = formatSupabaseError(reassignErr)
      console.error('[lib/categories] Error reassigning products:', formatted)
      throw new Error(`Failed to reassign products: ${reassignErr.message || formatted}`)
    }
  } else if (hasProducts) {
    throw new Error(
      `Cannot delete category: ${productCount} product(s) are currently assigned to it. Please reassign the products to another category first, or deactivate this category instead.`
    )
  }

  // 3. Delete category from database
  const { data: deletedCat, error: deleteErr } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .select('slug')
    .single()

  if (deleteErr) {
    const formatted = formatSupabaseError(deleteErr)
    console.error('[lib/categories] Error deleting category:', formatted)
    throw new Error(deleteErr.message || formatted)
  }

  await revalidateCategoryPaths(deletedCat?.slug)
  return { success: true }
}
