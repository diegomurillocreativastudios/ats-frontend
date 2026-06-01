import { NextResponse } from 'next/server';
import { AUTH_COOKIES } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(AUTH_COOKIES.access, '', {
    path: AUTH_COOKIES.path,
    maxAge: 0,
  });
  response.cookies.set(AUTH_COOKIES.expires, '', {
    path: AUTH_COOKIES.path,
    maxAge: 0,
  });
  response.cookies.set(AUTH_COOKIES.refresh, '', {
    path: AUTH_COOKIES.path,
    maxAge: 0,
  });
  if (AUTH_COOKIES.user) {
    response.cookies.set(AUTH_COOKIES.user, '', {
      path: AUTH_COOKIES.path,
      maxAge: 0,
    });
  }

  return response;
}
