import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="static-page-container" style={{ minHeight: '60vh', textAlign: 'center' }}>
      <span className="section-kicker">404 / SENO</span>
      <h1 className="static-page-title">
        404
        <br />
        THIS PIECE <em>ISN&apos;T HERE.</em>
      </h1>

      <p className="static-intro-lead" style={{ margin: '0 auto 32px', maxWidth: '420px' }}>
        The page you are looking for may have moved, or the collection piece is no longer available.
      </p>

      <Link href="/collections/all" className="dark-btn" style={{ padding: '16px 32px' }}>
        BACK TO SHOP
      </Link>
    </main>
  )
}
