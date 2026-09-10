import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { StoreProvider } from '@/context/StoreContext'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CartDrawer } from '@/components/CartDrawer'
import { SearchModal } from '@/components/SearchModal'
import './globals.css'

export const metadata: Metadata = {
  title: 'SENO — Made for the in-between',
  description: 'Considered clothing and objects for a life in motion. Designed in Mumbai.',
  generator: 'SENO Studio',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfbfa',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        <StoreProvider>
          <div className="app-viewport-wrapper">
            <AnnouncementBar />
            <Header />
            <main className="main-content">{children}</main>
            <Footer />
            <CartDrawer />
            <SearchModal />
          </div>
        </StoreProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
