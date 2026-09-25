import React, { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { StoreProvider } from '@/context/StoreContext'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CartDrawer } from '@/components/CartDrawer'
import { SearchModal } from '@/components/SearchModal'
import { BrandIntro } from '@/components/BrandIntro'
import { GlobalNavigationTransition } from '@/components/GlobalNavigationTransition'
import { getActiveCategories } from '@/lib/categories'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  GOOGLE_SITE_VERIFICATION,
} from '@/lib/seo'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
  title: {
    default: DEFAULT_TITLE,
    template: '%s | SENO',
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 512,
        height: 512,
        alt: DEFAULT_TITLE,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
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
            <NotificationProvider>
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
            </NotificationProvider>
          </StoreProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
