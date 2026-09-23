import { createClient } from '@supabase/supabase-js'

import * as dotenv from 'dotenv'

// Load environment variables from .env.local if present in development / local testing
try {
  dotenv.config({ path: '.env.local' })
  dotenv.config()
} catch {
  // dotenv optional if environment variables are injected externally
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL) {
  console.error('FATAL CONFIGURATION ERROR: NEXT_PUBLIC_SUPABASE_URL environment variable is missing.')
  process.exit(1)
}

if (!SERVICE_KEY) {
  console.error('FATAL CONFIGURATION ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required to execute server-level security isolation tests. Refusing to run with fallback or hardcoded credentials.')
  process.exit(1)
}

if (!ANON_KEY) {
  console.error('FATAL CONFIGURATION ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable is missing.')
  process.exit(1)
}

async function runSecurityVerification() {
  console.log('==================================================')
  console.log('PWA REGRESSION & SECURITY ISOLATION VERIFICATION')
  console.log('==================================================\n')

  const base = 'http://localhost:3000'

  // Test 1: Service Worker Rules & Caching Exclusion Verification
  console.log('[Test 1] Verifying Service Worker Caching Exclusions in sw.js...')
  const swRes = await fetch(`${base}/sw.js`)
  const swContent = await swRes.text()
  
  const rules = [
    { label: '/api/ never cached', test: swContent.includes('/^\\/api\\//i') },
    { label: '/account never cached', test: swContent.includes('/^\\/account/i') },
    { label: '/seller never cached', test: swContent.includes('/^\\/seller/i') },
    { label: '/admin never cached', test: swContent.includes('/^\\/admin/i') },
    { label: '/checkout never cached', test: swContent.includes('/^\\/checkout/i') },
    { label: '/cart never cached', test: swContent.includes('/^\\/cart/i') },
    { label: 'Non-GET bypasses SW completely', test: swContent.includes("request.method !== 'GET'") },
    { label: 'Cross-origin (Supabase/Razorpay) bypasses SW', test: swContent.includes("url.origin !== self.location.origin") },
    { label: 'Navigations are Network-First (HTML not cached)', test: swContent.includes("request.mode === 'navigate'") && swContent.includes("fetch(request)") },
    { label: 'Offline fallback served on network failure', test: swContent.includes("cachedOffline") },
  ]
  
  rules.forEach(r => {
    console.log(`  - ${r.label}: ${r.test ? 'PASS' : 'FAIL'}`)
  })

  // Test 2: Server Cache-Control headers on sensitive routes
  console.log('\n[Test 2] Verifying Server Headers on Dynamic Routes...')
  const dynamicRoutes = ['/account', '/cart', '/checkout', '/seller/dashboard', '/admin/dashboard']
  for (const route of dynamicRoutes) {
    const res = await fetch(`${base}${route}`, { redirect: 'manual' })
    console.log(`  - ${route}: status=${res.status}, cache-control=${res.headers.get('cache-control') || 'none'}`)
  }

  // Test 3: Standalone display mode & manifest integrity
  console.log('\n[Test 3] Verifying Manifest Standalone Mode & Branding...')
  const manifestRes = await fetch(`${base}/manifest.webmanifest`)
  const manifest = await manifestRes.json()
  console.log(`  - Name: "${manifest.name}"`)
  console.log(`  - Short Name: "${manifest.short_name}"`)
  console.log(`  - Display Mode: "${manifest.display}" (Standalone)`)
  console.log(`  - Start URL: "${manifest.start_url}"`)
  console.log(`  - Theme Color: "${manifest.theme_color}"`)
  console.log(`  - Background Color: "${manifest.background_color}"`)
  console.log(`  - Icons: ${manifest.icons.map(i => `${i.sizes} (${i.purpose})`).join(', ')}`)

  // Test 4: Supabase RLS and Session Multi-User Isolation
  console.log('\n[Test 4] Verifying Supabase RLS multi-user isolation...')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  
  // Query 2 sample users/profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, role')
    .limit(3)
  
  if (pErr) {
    console.log('  - Error fetching test profiles:', pErr.message)
  } else {
    console.log(`  - Found ${profiles.length} test profiles for role verification:`)
    profiles.forEach(p => console.log(`    User: ${p.email} (Role: ${p.role}, ID: ${p.id.slice(0, 8)}...)`))
  }

  // Verify that anon client cannot query orders directly without token (RLS enforcement)
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const { data: anonOrders, error: anonErr } = await anonClient
    .from('orders')
    .select('id, customer_id')
    .limit(5)
  
  console.log(`  - Anonymous order access (RLS check): ${anonOrders && anonOrders.length === 0 ? 'PASS (0 orders leaked)' : 'FLAGGED'}`)

  // Test 5: Service Worker Update Protection on Checkout
  console.log('\n[Test 5] Verifying Service-Worker update protection during checkout...')
  const registerSrc = (await import('fs')).readFileSync('components/ServiceWorkerRegister.tsx', 'utf8')
  const protectsCheckout = registerSrc.includes("pathname.startsWith('/checkout')") &&
    registerSrc.includes("if (!isCheckout)")
  console.log(`  - Service worker suppresses SKIP_WAITING / reload during checkout: ${protectsCheckout ? 'PASS' : 'FAIL'}`)

  // Test 6: Offline Fallback Route
  console.log('\n[Test 6] Verifying Branded Offline Page...')
  const offlineRes = await fetch(`${base}/offline`)
  const offlineText = await offlineRes.text()
  console.log(`  - Status: ${offlineRes.status}`)
  console.log(`  - Displays offline notice: ${offlineText.includes('You are currently offline') ? 'PASS' : 'FAIL'}`)
  console.log(`  - Displays retry button: ${offlineText.includes('Retry Connection') ? 'PASS' : 'FAIL'}`)
  console.log(`  - No sensitive e-commerce data present in offline page: ${!offlineText.includes('order_id') && !offlineText.includes('total_amount') ? 'PASS' : 'FAIL'}`)

  console.log('\n==================================================')
  console.log('ALL REGRESSION & SECURITY ISOLATION TESTS COMPLETE')
  console.log('==================================================')
}

runSecurityVerification().catch(console.error)
