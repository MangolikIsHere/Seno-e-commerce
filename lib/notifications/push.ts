'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import webpush from 'web-push'
import { PushSubscriptionInput } from './types'

function initVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@seno.com'

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    return true
  }
  return false
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for push dispatch.')
  }
  return createSupabaseClient(url, key)
}

/**
 * Returns the public VAPID key to the client for subscribing with PushManager.
 * The private key stays strictly server-side.
 */
export async function getVapidPublicKeyAction(): Promise<string | null> {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null
}

/**
 * Registers a user's browser push subscription.
 * Multiple devices per user are supported.
 */
export async function savePushSubscriptionAction(
  subscription: PushSubscriptionInput,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return { success: false, error: 'Invalid push subscription payload' }
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error saving subscription'
    return { success: false, error: msg }
  }
}

/**
 * Removes a push subscription (e.g. when user toggles notifications off or unsubscribes).
 */
export async function removePushSubscriptionAction(endpoint: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error removing subscription'
    return { success: false, error: msg }
  }
}

/**
 * Dispatches standards-based Web Push notifications to all active subscriptions of a user.
 * Catches 410 Gone / 404 to automatically clean up expired subscriptions.
 */
export async function dispatchWebPushToUser(
  userId: string,
  payload: {
    title: string
    body: string
    url?: string
    icon?: string
    data?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const isReady = initVapid()
    if (!isReady) {
      console.warn('[WebPush] VAPID keys not configured. Skipping push delivery.')
      return
    }

    const admin = getAdminClient()

    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error || !subscriptions || subscriptions.length === 0) {
      return
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      url: payload.url || '/account',
      data: payload.data || {}
    })

    // Dispatch concurrently to each registered subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        try {
          await webpush.sendNotification(pushSubscription, pushPayload)
        } catch (err: any) {
          // If status is 400 (bad VAPID/expired), 401 (unauthorized VAPID mismatch), 404, or 410 Gone,
          // the subscription is no longer valid for this VAPID keypair; prune from DB
          if (err?.statusCode === 400 || err?.statusCode === 401 || err?.statusCode === 404 || err?.statusCode === 410) {
            console.log(`[WebPush] Pruning invalid/expired push subscription (${err.statusCode}):`, sub.endpoint)
            await admin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          } else {
            console.warn('[WebPush] Delivery failure for endpoint:', err?.message || err)
          }
        }
      })
    )

    console.log(`[WebPush] Dispatched push notifications to ${results.length} subscription(s) for user ${userId}`)
  } catch (err) {
    console.warn('[WebPush] Dispatch error:', err)
  }
}
