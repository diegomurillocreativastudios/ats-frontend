import { NextResponse } from 'next/server';

const AUTH_COOKIE = 'ats_access_token';

const publicPaths = [
  '/auth/iniciar-sesion',
  '/auth/registrarse',
  '/auth/forgot-password',
];

const isPublicPath = (pathname) => {
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return true;
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/iniciar-sesion') {
    return NextResponse.redirect(new URL('/auth/iniciar-sesion', request.url));
  }
  if (pathname === '/crear-cuenta') {
    return NextResponse.redirect(new URL('/auth/registrarse', request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasToken = request.cookies.get(AUTH_COOKIE)?.value;

  if (!hasToken) {
    const loginUrl = new URL('/auth/iniciar-sesion', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)'],
};
