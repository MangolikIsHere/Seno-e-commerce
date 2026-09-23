import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Validate that the next parameter is an internal relative path
      // It must start with '/' and not start with '//' (protocol-relative)
      if (next.startsWith('/') && !next.startsWith('//')) {
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        // Fallback if 'next' is invalid
        return NextResponse.redirect(`${origin}/`)
      }
    }
  }

  // If there is no code or the exchange fails, redirect to an error page or home
  return NextResponse.redirect(`${origin}/?error=auth-code-invalid`)
}
