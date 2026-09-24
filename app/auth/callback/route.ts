import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'
  const redirectPath = (next.startsWith('/') && !next.startsWith('//')) ? next : '/'

  // 1. Support token_hash OTP verification
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // 2. Support PKCE code exchange
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // If there is no code/token or the exchange fails, redirect to error
  return NextResponse.redirect(`${origin}/?error=auth-code-invalid`)
}
