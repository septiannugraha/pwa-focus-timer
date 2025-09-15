import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = ['/timer', '/streaks', '/dashboard', '/settings'];

// Routes that require active subscription
const premiumRoutes = ['/timer/custom', '/analytics', '/export'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  );

  const isPremiumRoute = premiumRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Check subscription status for premium routes
  if (isPremiumRoute && session) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, tier')
      .eq('user_id', session.user.id)
      .single();

    if (!subscription || subscription.status !== 'active' || subscription.tier === 'free') {
      return NextResponse.redirect(new URL('/upgrade', req.url));
    }
  }

  // Add user context to headers for server components
  if (session) {
    res.headers.set('x-user-id', session.user.id);
    res.headers.set('x-user-email', session.user.email || '');
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json|sw.js|api/).*)',
  ],
};