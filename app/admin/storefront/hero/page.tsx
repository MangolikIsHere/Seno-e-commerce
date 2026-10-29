import React from 'react'
import type { Metadata } from 'next'
import { getAllHeroSlides } from '@/lib/hero-slides'
import { AdminHeroSlidesClient } from './AdminHeroSlidesClient'

export const metadata: Metadata = {
  title: 'Hero Slides Management — SENO Admin',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function AdminHeroSlidesPage() {
  const slides = await getAllHeroSlides()
  return <AdminHeroSlidesClient initialSlides={slides} />
}

