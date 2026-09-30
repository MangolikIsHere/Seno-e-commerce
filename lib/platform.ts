/**
 * SENO Platform Detection Utility
 * Detects whether the current execution context is the SENO Android Native Shell APK.
 */
export function isSenoAndroidApp(): boolean {
  if (typeof window === 'undefined') return false

  // 1. User-Agent suffix check (synchronously set on WebView initialization)
  const ua = window.navigator.userAgent || ''
  if (ua.includes('SenoAndroidApp')) return true

  // 2. JavaScript Interface check (window.SenoNativeApp injected synchronously by WebView)
  try {
    if ((window as unknown as { SenoNativeApp?: unknown }).SenoNativeApp !== undefined) {
      return true
    }
  } catch {
    // ignore
  }

  // 3. Global window variable
  if ((window as unknown as { SENO_PLATFORM?: string }).SENO_PLATFORM === 'android') {
    return true
  }

  // 4. HTML root class check
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('seno-android-app')) {
    return true
  }

  // 5. SessionStorage platform marker
  try {
    if (typeof window.sessionStorage !== 'undefined' && window.sessionStorage.getItem('seno_platform') === 'android') {
      return true
    }
  } catch {
    // ignore
  }

  // 6. Cookie check
  try {
    if (typeof document !== 'undefined' && document.cookie.includes('seno_platform=android')) {
      return true
    }
  } catch {
    // ignore
  }

  // 7. URL query param check (e.g. ?platform=android)
  try {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('platform') === 'android') {
      return true
    }
  } catch {
    // ignore
  }

  return false
}

/**
 * Diagnostic logger for OAuth return flow.
 */
export function getSenoOAuthDiagnosticContext(redirectTo: string) {
  if (typeof window === 'undefined') return {}
  const ua = window.navigator.userAgent || ''
  const isNative = typeof (window as unknown as { SenoNativeApp?: { isNativeApp?: () => boolean } })?.SenoNativeApp?.isNativeApp === 'function'
    ? (window as unknown as { SenoNativeApp?: { isNativeApp?: () => boolean } }).SenoNativeApp!.isNativeApp!()
    : false
  const htmlClass = typeof document !== 'undefined' ? document.documentElement.className : ''
  const sessionPlatform = typeof window.sessionStorage !== 'undefined' ? window.sessionStorage.getItem('seno_platform') : null
  const cookiePlatform = typeof document !== 'undefined'
    ? (document.cookie.split('; ').find(row => row.startsWith('seno_platform=')) || 'none')
    : 'none'
  const isAndroid = isSenoAndroidApp()

  return {
    platform: isAndroid ? 'android' : 'web',
    isNativeApp: isNative,
    userAgent: ua,
    htmlClass: htmlClass,
    sessionStoragePlatform: sessionPlatform,
    cookiePlatform: cookiePlatform,
    redirectTo: redirectTo,
  }
}
