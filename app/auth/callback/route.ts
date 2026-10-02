import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const platform = searchParams.get('platform')

  // Validate next path: ensure relative path, prevent open redirects
  const next = searchParams.get('next') ?? '/account'
  const redirectPath = (next.startsWith('/') && !next.startsWith('//') && !next.includes('://')) ? next : '/account'
  const isNativeAndroidCallback = platform === 'android' && searchParams.get('native') === 'android'

  // Native Android APK deep link handling for OAuth completion

  // Return the OAuth code to the APK through its registered deep link. The
  // HTTPS callback is used first so Supabase can validate an allowlisted URL.
  if (isNativeAndroidCallback) {
    const nativeCallback = new URL('seno://auth/callback')
    nativeCallback.searchParams.set('next', redirectPath)

    if (code) {
      nativeCallback.searchParams.set('code', code)
    } else if (searchParams.get('error')) {
      nativeCallback.searchParams.set('error', searchParams.get('error')!)
      const errorDescription = searchParams.get('error_description')
      if (errorDescription) nativeCallback.searchParams.set('error_description', errorDescription)
    } else {
      nativeCallback.searchParams.set('error', 'auth-code-invalid')
    }

    return NextResponse.redirect(nativeCallback)
  }

  // 1. Support token_hash OTP verification
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // 2. Support PKCE code exchange
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // If there is no code/token or the exchange fails, redirect to account with error
  const errorReturn = `/account?error=auth-code-invalid${redirectPath !== '/account' ? `&next=${encodeURIComponent(redirectPath)}` : ''}`
  return NextResponse.redirect(new URL(errorReturn, request.url))
}
