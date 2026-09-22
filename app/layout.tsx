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
import './globals.css'

export const metadata: Metadata = {
  title: 'SENO — Everyday, Elevated.',
  description: 'Considered clothing and objects for a life in motion. Designed in Mumbai.',
  generator: 'SENO Studio',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfbfa',
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
          </StoreProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
