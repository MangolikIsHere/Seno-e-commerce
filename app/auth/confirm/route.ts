import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Clean relative redirect target to prevent open redirect vulnerabilities
  const redirectPath = (next.startsWith('/') && !next.startsWith('//')) ? next : '/'

  // 1. Preferred OTP / TokenHash confirmation (avoids PKCE cross-browser cookie verifier issues)
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

  // 2. PKCE code fallback (if request arrived via code exchange)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // If token_hash or code verification failed, redirect to home with error parameter
  return NextResponse.redirect(new URL('/?error=auth-token-invalid', request.url))
}
