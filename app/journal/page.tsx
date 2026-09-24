import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Studio Journal',
  description: 'Notes on textile craft, sustainable garment construction, and contemporary design philosophy from SENO Studio.',
  alternates: {
    canonical: `${SITE_URL}/journal`,
  },
}

export default function JournalPage(){return <main className="story-page"><p className="kicker">THE SENO JOURNAL</p><h1>Notes on<br/><em>making things.</em></h1><div className="journal-grid"><article><span>01 / MATERIALS</span><h2>Less, but better.</h2><p>On choosing fabrics that get more useful with time.</p></article><article><span>02 / PROCESS</span><h2>The useful object.</h2><p>Why good design should quietly earn its place.</p></article></div><Link href="/" className="back-link">← Back to shop</Link></main>}
