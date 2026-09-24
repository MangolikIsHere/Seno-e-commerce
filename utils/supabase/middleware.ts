import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Detect Next.js Router Prefetch requests.
  // Prefetch requests must NOT trigger expensive network calls to Supabase Auth.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.has('x-middleware-prefetch')

  if (isPrefetch) {
    return supabaseResponse
  }

  // 2. Initialize Supabase SSR client to validate and refresh session for all REAL navigations.
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

  // 3. Fast-path optimization for unauthenticated visitors on PUBLIC routes ONLY.
  // Do not apply this to protected routes. Protected routes must always run getUser() to redirect securely.
  const pathname = request.nextUrl.pathname
  const isProtectedOrAuthSensitive =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller') ||
    pathname.startsWith('/checkout') ||
    (pathname.startsWith('/account') &&
      !pathname.startsWith('/account/register') &&
      !pathname.startsWith('/account/forgot-password') &&
      !pathname.startsWith('/account/reset-password'))

  if (!isProtectedOrAuthSensitive) {
    // If it's a public route, and the user has no session cookies, we don't need to call getUser()
    // because there is no session to refresh.
    const hasAuthTokenCookie = request.cookies
      .getAll()
      .some(
        (cookie) =>
          cookie.name.startsWith('sb-') &&
          cookie.name.includes('-auth-token') &&
          !cookie.name.endsWith('-code-verifier')
      )

    if (!hasAuthTokenCookie) {
      // Completely unauthenticated visitor on a public page (e.g. /, /products).
      // Skip the network call.
      return supabaseResponse
    }
  }

  // 4. Execute getUser() to validate/refresh the session for authenticated users or anyone hitting protected routes.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Enforce protection for strictly protected routes
  const isStrictlyProtected = pathname.startsWith('/admin') || pathname.startsWith('/seller')
  if (!user && isStrictlyProtected) {
    const loginUrl = new URL('/account', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
