import { createClient } from '@/utils/supabase/client'
import { getProduct, Product } from './catalog'

export async function fetchUserWishlistIds(userId: string): Promise<string[]> {
  const supabase = createClient()
  
  const { data: wishlist, error: wError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
    
  if (wError || !wishlist) return []

  const { data: items, error: iError } = await supabase
    .from('wishlist_items')
    .select('products(slug)')
    .eq('wishlist_id', wishlist.id)

  if (iError || !items) return []

  return items.map((item: any) => item.products?.slug).filter(Boolean)
}

export async function addProductToWishlist(userId: string, productSlug: string): Promise<boolean> {
  const supabase = createClient()

  // Ensure wishlist exists
  let wishlistId: string | null = null
  const { data: wishlist, error: wError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (wError) return false

  if (!wishlist) {
    const { data: newWishlist, error: createError } = await supabase
      .from('wishlists')
      .insert({ user_id: userId })
      .select('id')
      .single()
    if (createError || !newWishlist) {
      // In case another request created it concurrently, retrieve it
      const { data: retryWishlist } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      if (!retryWishlist) return false
      wishlistId = retryWishlist.id
    } else {
      wishlistId = newWishlist.id
    }
  } else {
    wishlistId = wishlist.id
  }

  // Get product ID by slug
  const product = await getProduct(productSlug)
  if (!product) return false

  // Add to wishlist_items idempotently using upsert
  const { error: insertError } = await supabase
    .from('wishlist_items')
    .upsert(
      { wishlist_id: wishlistId, product_id: product.id },
      { onConflict: 'wishlist_id,product_id', ignoreDuplicates: true }
    )

  if (insertError) {
    // If a unique constraint violation still occurs (e.g. Postgres code 23505),
    // the item is already present in the wishlist, which fulfills the add operation
    if (insertError.code === '23505' || insertError.message?.includes('uq_wishlist_product')) {
      return true
    }
    console.error('Error adding product to wishlist:', insertError)
    return false
  }

  return true
}

export async function removeProductFromWishlist(userId: string, productSlug: string): Promise<boolean> {
  const supabase = createClient()

  const { data: wishlist, error: wError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (wError || !wishlist) return false

  const product = await getProduct(productSlug)
  if (!product) return false

  const { error: deleteError } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('wishlist_id', wishlist.id)
    .eq('product_id', product.id)

  if (deleteError) {
    console.error('Error removing product from wishlist:', deleteError)
    return false
  }

  return true
}
