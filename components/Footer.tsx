'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-col brand-col">
          <div className="footer-brand">SENO</div>
          <p className="footer-tagline">
            Considered clothing and objects for a life in motion. Designed in Mumbai.
          </p>
        </div>

        <div className="footer-col">
          <h3>SHOP</h3>
          <ul>
            <li><Link href="/collections/all">All Products</Link></li>
            <li><Link href="/collections/new-arrivals">New Arrivals</Link></li>
            <li><Link href="/collections/topwear">Topwear</Link></li>
            <li><Link href="/collections/bottomwear">Bottomwear</Link></li>
            <li><Link href="/collections/outerwear">Outerwear</Link></li>
            <li><Link href="/collections/accessories">Accessories</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>HELP</h3>
          <ul>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/shipping">Shipping</Link></li>
            <li><Link href="/returns">Returns</Link></li>
            <li><Link href="/track-order">Track Order</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>ACCOUNT</h3>
          <ul>
            <li><Link href="/account">Account</Link></li>
            <li><Link href="/wishlist">Wishlist</Link></li>
            <li><Link href="/cart">Cart</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>LEGAL</h3>
          <ul>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/refund-policy">Refund Policy</Link></li>
            <li><Link href="/cancellation-policy">Cancellation Policy</Link></li>
          </ul>
        </div>

        <div className="footer-col newsletter-col">
          <h3>NEWSLETTER</h3>
          <p>Subscribe for early access to launches and studio journal updates.</p>
          {subscribed ? (
            <p className="subscribe-success">Thank you for subscribing.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="newsletter-form">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit" aria-label="Subscribe">
                →
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-socials">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>
          <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer">PINTEREST</a>
        </div>
        <div className="footer-copyright">
          © 2026 SENO. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
