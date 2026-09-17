'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkIsAdmin } from '@/lib/admin'

export async function getActiveCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, display_order, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) return []
  return data || []
}

export async function getAdminCategories() {
  if (!(await checkIsAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, display_order, is_active, created_at, products(count)')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

function slugify(value: string) {
  return value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function saveCategory(input: { id?: string; name: string; slug?: string; description?: string; display_order?: number; is_active?: boolean }) {
  if (!(await checkIsAdmin())) throw new Error('Unauthorized')
  const name = input.name.trim()
  const slug = slugify(input.slug?.trim() || name)
  if (!name || !slug) throw new Error('Category name and slug are required.')
  const supabase = await createClient()
  const query = supabase.from('categories').select('id').eq('slug', slug)
  if (input.id) query.neq('id', input.id)
  const { data: duplicate } = await query.maybeSingle()
  if (duplicate) throw new Error(`The slug "${slug}" is already in use.`)

  const payload = { name, slug, description: input.description?.trim() || null, display_order: Math.max(0, Number(input.display_order || 0)), is_active: input.is_active !== false }
  const result = input.id
    ? await supabase.from('categories').update(payload).eq('id', input.id)
    : await supabase.from('categories').insert(payload)
  if (result.error) throw new Error(result.error.message)
  revalidatePath('/')
  revalidatePath('/collections/[category]', 'page')
  revalidatePath('/admin/categories')
  return { success: true }
}

export async function deactivateCategory(id: string) {
  if (!(await checkIsAdmin())) throw new Error('Unauthorized')
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_deactivate_category', { p_category_id: id })
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/collections/[category]', 'page')
  revalidatePath('/admin/categories')
  return data
}
