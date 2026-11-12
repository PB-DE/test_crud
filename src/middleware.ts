import { NextResponse, NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';

const ADMIN_ONLY_ROUTES = ['/settings', '/users'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, Next internals, and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySessionToken(token);

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Require login for all other pages
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes check
  if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route)) && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
