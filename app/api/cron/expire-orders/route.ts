import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Cron cannot bypass RLS.')
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('CRON_SECRET is not configured.')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminSupabase()

    // Execute authoritative, concurrency-safe expiration RPC
    // It uses SKIP LOCKED and accurately checks expiration timestamps
    const { data, error } = await supabase.rpc('expire_unpaid_orders', { p_batch_size: 100 })

    if (error) {
      console.error('Failed to expire unpaid orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Attempt to parse the successful response
    const expiredCount = data?.expired_orders_count || 0

    // Only revalidate caches if something actually expired
    if (expiredCount > 0) {
      revalidatePath('/seller/orders')
      revalidatePath('/seller/dashboard')
      revalidatePath('/admin/orders')
    }

    return NextResponse.json({ success: true, expired: expiredCount }, { status: 200 })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal cron processing error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
