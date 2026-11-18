import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabaseAdmin'
import { revalidateCatalogPaths } from '@/lib/adminCatalog'

export const dynamic = 'force-dynamic'

async function handleRelease(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const searchParams = req.nextUrl.searchParams
    const keyParam = searchParams.get('key')

    // If CRON_SECRET is configured, protect against unauthorized triggers
    if (cronSecret) {
      const isBearerValid = authHeader === `Bearer ${cronSecret}`
      const isParamValid = keyParam === cronSecret
      if (!isBearerValid && !isParamValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = getAdminSupabase()

    // Authoritative RPC: flips coming_soon -> available_now for approved products whose release_date has arrived
    const { data, error } = await supabase.rpc('activate_scheduled_products')

    if (error) {
      console.error('[Cron: Release Scheduled Products] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const activatedCount = typeof data === 'number' ? data : 0

    if (activatedCount > 0) {
      console.log(`[Cron: Release Scheduled Products] Successfully released ${activatedCount} product(s) to Available Now`)
      await revalidateCatalogPaths()
    }

    return NextResponse.json({
      success: true,
      activated_count: activatedCount,
      timestamp: new Date().toISOString()
    }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal cron processing error'
    console.error('[Cron: Release Scheduled Products] Exception:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handleRelease(req)
}

export async function POST(req: NextRequest) {
  return handleRelease(req)
}

