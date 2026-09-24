import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/api/auth'];

const ACCESS_TOKEN_COOKIE = 'accessToken';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without authentication
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js static files and API routes that proxy to backend
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return redirectToLogin(request);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    await jwtVerify(accessToken, secret);
    return NextResponse.next();
  } catch {
    // Token invalid or expired — redirect to login
    const response = redirectToLogin(request);
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
