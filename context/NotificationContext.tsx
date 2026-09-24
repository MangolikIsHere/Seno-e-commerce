'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/utils/supabase/client'
import { NotificationRecord } from '@/lib/notifications/types'
import {
  getUserNotifications,
  markNotificationsAsReadAction
} from '@/lib/notifications/service'
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  getVapidPublicKeyAction
} from '@/lib/notifications/push'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface NotificationContextType {
  notifications: NotificationRecord[]
  unreadCount: number
  loading: boolean
  refreshNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  pushEnabled: boolean
  togglePushNotifications: () => Promise<boolean>
  isPushSupported: boolean
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  pushEnabled: false,
  togglePushNotifications: async () => false,
  isPushSupported: false
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [pushEnabled, setPushEnabled] = useState<boolean>(false)
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false)
  const activeChannelRef = useRef<any>(null)

  // Check Web Push support in browser & auto-rotate if VAPID key changed
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setIsPushSupported(true)
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(async (reg) => {
          let sub = await reg.pushManager.getSubscription()
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || await getVapidPublicKeyAction()

          if (sub && vapidKey) {
            const expectedKey = urlBase64ToUint8Array(vapidKey)
            const existingKey = sub.options?.applicationServerKey
            if (existingKey) {
              const existingArr = Array.from(new Uint8Array(existingKey))
              const expectedArr = Array.from(expectedKey)
              const matches = existingArr.length === expectedArr.length &&
                existingArr.every((v, i) => v === expectedArr[i])

              if (!matches) {
                console.log('[NotificationContext] VAPID key rotation detected. Refreshing subscription...')
                await removePushSubscriptionAction(sub.endpoint).catch(() => {})
                await sub.unsubscribe().catch(() => {})
                sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: expectedKey as any
                })
                if (sub && user) {
                  const rawKey = sub.getKey ? sub.getKey('p256dh') : null
                  const rawAuth = sub.getKey ? sub.getKey('auth') : null
                  const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey)))) : ''
                  const auth = rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : ''
                  if (p256dh && auth) {
                    await savePushSubscriptionAction({ endpoint: sub.endpoint, keys: { p256dh, auth } }, navigator.userAgent)
                  }
                }
              }
            }
          }
          setPushEnabled(!!sub)
        }).catch(() => {})
      }
    }
  }, [user])

  // Load initial notifications for authenticated user
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setLoading(true)
    try {
      const res = await getUserNotifications(30, 0)
      setNotifications(res.notifications)
      setUnreadCount(res.unreadCount)
    } catch (err) {
      console.error('[NotificationContext] Fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      // Clear out state immediately on logout so no previous user context ever persists
      setNotifications([])
      setUnreadCount(0)

      // Unsubscribe realtime channel
      if (activeChannelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(activeChannelRef.current)
        activeChannelRef.current = null
      }

      // Cleanup local push subscription on logout so previous user does not receive alerts
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) {
              removePushSubscriptionAction(sub.endpoint).catch(() => {})
              sub.unsubscribe().catch(() => {})
              setPushEnabled(false)
            }
          })
        }).catch(() => {})
      }
      return
    }

    fetchNotifications()

    // Setup Supabase Realtime Postgres Changes listener strictly filtered by user_id
    const supabase = createClient()
    const channelName = `realtime-user-notifications-${user.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new as NotificationRecord
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotif.id)) return prev
            return [newNotif, ...prev]
          })
          if (!newNotif.read_at) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotif = payload.new as NotificationRecord
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotif.id ? updatedNotif : n))
          )
          // Recalculate unread count
          setNotifications(current => {
            const count = current.filter(n => !n.read_at).length
            setUnreadCount(count)
            return current
          })
        }
      )
      .subscribe()

    activeChannelRef.current = channel

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
        activeChannelRef.current = null
      }
    }
  }, [user, fetchNotifications])

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      await markNotificationsAsReadAction([id], false)
    } catch (err) {
      console.error('[NotificationContext] markAsRead error:', err)
      fetchNotifications()
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const now = new Date().toISOString()
    setNotifications(prev => prev.map(n => ({ ...n, read_at: now })))
    setUnreadCount(0)

    try {
      await markNotificationsAsReadAction(undefined, true)
    } catch (err) {
      console.error('[NotificationContext] markAllAsRead error:', err)
      fetchNotifications()
    }
  }

  // Push notifications opt-in toggle
  const togglePushNotifications = async (): Promise<boolean> => {
    if (!isPushSupported || !user) return false

    try {
      if (pushEnabled) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await removePushSubscriptionAction(sub.endpoint)
          await sub.unsubscribe()
        }
        setPushEnabled(false)
        return false
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          return false
        }

        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || await getVapidPublicKeyAction()
        if (!vapidKey) {
          console.warn('[NotificationContext] No VAPID public key configured.')
          return false
        }
        const applicationServerKey = urlBase64ToUint8Array(vapidKey)

        if (sub) {
          const existingKey = sub.options?.applicationServerKey
          if (existingKey) {
            const existingArr = Array.from(new Uint8Array(existingKey))
            const expectedArr = Array.from(applicationServerKey)
            const matches = existingArr.length === expectedArr.length &&
              existingArr.every((v, i) => v === expectedArr[i])
            if (!matches) {
              await removePushSubscriptionAction(sub.endpoint).catch(() => {})
              await sub.unsubscribe().catch(() => {})
              sub = null
            }
          }
        }

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any
          })
        }

        if (sub) {
          const rawKey = sub.getKey ? sub.getKey('p256dh') : null
          const rawAuth = sub.getKey ? sub.getKey('auth') : null

          const p256dh = rawKey
            ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey))))
            : ''
          const auth = rawAuth
            ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth))))
            : ''

          if (p256dh && auth) {
            await savePushSubscriptionAction({
              endpoint: sub.endpoint,
              keys: { p256dh, auth }
            }, navigator.userAgent)
            setPushEnabled(true)
            return true
          }
        }
        return false
      }
    } catch (err) {
      console.warn('[NotificationContext] Push toggle error:', err)
      return false
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead,
        pushEnabled,
        togglePushNotifications,
        isPushSupported
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
