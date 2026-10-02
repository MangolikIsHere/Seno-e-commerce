import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Detect Next.js Router Prefetch requests.
  // Prefetch requests must NEVER trigger blocking external network calls to Supabase Auth.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.has('next-router-segment-prefetch') ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('sec-purpose') === 'prefetch' ||
    request.headers.has('x-middleware-prefetch')

  if (isPrefetch) {
    return supabaseResponse
  }

  // 2. Determine route sensitivity
  const pathname = request.nextUrl.pathname
  const isProtectedOrAuthSensitive =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/seller')

  // 3. Fast-path optimization for unauthenticated visitors on public routes.
  // If the visitor has no Supabase auth token cookies, there is no session to refresh.
  if (!isProtectedOrAuthSensitive) {
    const hasAuthTokenCookie = request.cookies
      .getAll()
      .some(
        (c) =>
          c.name.startsWith('sb-') &&
          c.name.includes('-auth-token') &&
          !c.name.endsWith('-code-verifier')
      )

    if (!hasAuthTokenCookie) {
      return supabaseResponse
    }
  }

  // 4. Initialize Supabase SSR client to validate or refresh session for authenticated users or protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 5. Authoritatively validate and refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 6. Enforce protection for strictly protected routes
  const isStrictlyProtected = pathname.startsWith('/admin') || pathname.startsWith('/seller')
  if (!user && isStrictlyProtected) {
    const loginUrl = new URL('/account', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
