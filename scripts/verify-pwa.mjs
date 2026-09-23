async function verify() {
  const base = 'http://localhost:3001'

  // 1. Manifest
  const manifestRes = await fetch(base + '/manifest.webmanifest')
  const manifestJson = await manifestRes.json()
  console.log('--- MANIFEST ---')
  console.log('Status:', manifestRes.status)
  console.log('Content-Type:', manifestRes.headers.get('content-type'))
  console.log('Cache-Control:', manifestRes.headers.get('cache-control'))
  console.log('Name:', manifestJson.name)
  console.log('Short name:', manifestJson.short_name)
  console.log('Start URL:', manifestJson.start_url)
  console.log('Display:', manifestJson.display)
  console.log('Theme color:', manifestJson.theme_color)
  console.log('Icons count:', manifestJson.icons?.length)

  // 2. Service Worker
  const swRes = await fetch(base + '/sw.js')
  const swText = await swRes.text()
  console.log('\n--- SERVICE WORKER ---')
  console.log('Status:', swRes.status)
  console.log('Content-Type:', swRes.headers.get('content-type'))
  console.log('Cache-Control:', swRes.headers.get('cache-control'))
  console.log('Service-Worker-Allowed:', swRes.headers.get('service-worker-allowed'))
  console.log('Length:', swText.length, 'bytes')

  // 3. Offline page
  const offlineRes = await fetch(base + '/offline')
  const offlineHtml = await offlineRes.text()
  console.log('\n--- OFFLINE PAGE ---')
  console.log('Status:', offlineRes.status)
  console.log('Has Offline text:', offlineHtml.includes('You are currently offline'))
  console.log('Has Retry text:', offlineHtml.includes('Retry Connection'))

  // 4. Icons
  for (const iconPath of ['/icons/icon-192x192.png', '/icons/icon-512x512.png', '/icons/icon-maskable-512x512.png']) {
    const iconRes = await fetch(base + iconPath)
    console.log(iconPath, 'Status:', iconRes.status, 'Type:', iconRes.headers.get('content-type'))
  }

  // 5. Storefront Home HTML metadata
  const homeRes = await fetch(base + '/')
  const homeHtml = await homeRes.text()
  console.log('\n--- HOME HEAD TAGS ---')
  console.log('Has manifest link:', homeHtml.includes('manifest.webmanifest'))
  console.log('Has apple-touch-icon:', homeHtml.includes('apple-touch-icon'))
}

verify().catch(console.error)
