import React, { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { StoreProvider } from '@/context/StoreContext'
import { AuthProvider } from '@/context/AuthContext'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CartDrawer } from '@/components/CartDrawer'
import { SearchModal } from '@/components/SearchModal'
import { BrandIntro } from '@/components/BrandIntro'
import { GlobalNavigationTransition } from '@/components/GlobalNavigationTransition'
import { getActiveCategories } from '@/lib/categories'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import './globals.css'

export const metadata: Metadata = {
  title: 'SENO — Everyday, Elevated.',
  description: 'Considered clothing and objects for a life in motion. Designed in Mumbai.',
  generator: 'SENO Studio',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SENO',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfbfa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const categories = await getActiveCategories()

  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        <BrandIntro />
        <AuthProvider>
          <StoreProvider>
            <Suspense fallback={null}>
              <GlobalNavigationTransition />
            </Suspense>
            <div className="app-viewport-wrapper">
              <AnnouncementBar />
              <Header categories={categories} />
              <main className="main-content">{children}</main>
              <Footer categories={categories} />
              <CartDrawer />
              <SearchModal />
            </div>
            <ServiceWorkerRegister />
          </StoreProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
