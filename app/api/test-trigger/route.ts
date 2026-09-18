import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { submitSellerProduct, getMySellerRecord } from '@/lib/sellers'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: prod } = await supabase.from('products').select('*, product_images(*), product_variants(*)').eq('approval_status', 'approved').limit(1).single()
    if (!prod) return NextResponse.json({ error: 'no approved product' })

    const formData = new FormData()
    formData.set('name', prod.name)
    formData.set('slug', prod.slug)
    formData.set('description', prod.description)
    formData.set('category_id', prod.category_id || '')
    formData.set('price', String(prod.price))
    formData.set('weight', String(prod.default_weight_grams))
    formData.set('shipping_method', prod.shipping_method)
    formData.set('details', JSON.stringify(prod.details))
    formData.set('approval_status', 'submitted')

    // Fake call to submitSellerProduct (we need to be logged in as seller)
    // To do this, we'll just execute the raw update query to test trigger
    
    const { data: updated, error } = await supabase.from('products').update({
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        compare_at_price: prod.compare_at_price,
        default_weight_grams: prod.default_weight_grams,
        category_id: prod.category_id,
        details: prod.details, // Using exact same details object
        approval_status: 'submitted'
    }).eq('id', prod.id).select('approval_status').single()

    return NextResponse.json({
        original: prod.approval_status,
        updated: updated?.approval_status,
        error: error?.message
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}
