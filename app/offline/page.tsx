'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setIsChecking(true)
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = '/'
      } else {
        setIsChecking(false)
      }
    }, 500)
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-[var(--bg)] text-[var(--ink)]">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--soft,#f1f1ef)] mb-6 text-[var(--clay,#a45f46)]">
          <WifiOff size={28} strokeWidth={1.5} />
        </div>

        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--clay,#a45f46)] uppercase mb-2">
          Connection Unavailable
        </p>

        <h1 className="text-2xl sm:text-3xl font-light tracking-tight mb-4">
          You are currently offline
        </h1>

        <p className="text-sm text-[var(--muted,#676767)] leading-relaxed mb-8">
          SENO requires an active connection to display live product availability, current pricing, and process secure checkouts.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--ink,#171717)] text-[var(--bg,#fbfbfa)] text-xs uppercase tracking-[0.15em] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            {isChecking ? 'Checking...' : 'Retry Connection'}
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-[var(--border,#e2e1dc)] text-xs uppercase tracking-[0.15em] font-medium hover:bg-[var(--soft,#f1f1ef)] transition-colors"
          >
            Storefront Home
          </Link>
        </div>

        {isOnline && (
          <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded">
            Connection restored! <button onClick={() => window.location.reload()} className="underline font-medium ml-1">Reload now</button>
          </div>
        )}
      </div>
    </div>
  )
}
