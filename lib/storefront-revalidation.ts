import { revalidatePath } from 'next/cache'

/**
 * Targeted cache invalidation for the storefront.
 * 
 * Extracts all unique product slugs associated with an order's items,
 * and surgically revalidates the exact product pages, the homepage,
 * and collection views to instantly reflect stock availability changes.
 */
export async function revalidateStorefrontForOrder(orderId: string, supabase: any) {
  try {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('products(slug, category_id, categories(slug))')
      .eq('order_id', orderId)

    if (orderItems && orderItems.length > 0) {
      const slugs = new Set<string>()
      const categorySlugs = new Set<string>()

      orderItems.forEach((item: any) => {
        const productSlug = item.products?.slug
        if (productSlug) slugs.add(productSlug)

        const catSlug = item.products?.categories?.slug
        if (catSlug) categorySlugs.add(catSlug)
      })

      // Revalidate affected product pages
      Array.from(slugs).forEach(slug => {
        revalidatePath(`/products/${slug}`)
      })

      // Revalidate affected category collections
      Array.from(categorySlugs).forEach(catSlug => {
        revalidatePath(`/collections/${catSlug}`, 'page')
      })
    }

    // Always revalidate general catalog entrypoints where stock changes matter
    revalidatePath('/')
    revalidatePath('/collections/all')
    // Note: search uses client-side fetching from Supabase, so it's always fresh.
  } catch (err) {
    console.error('Failed to revalidate storefront for order:', err)
  }
}
