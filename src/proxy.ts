import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Ververst de Supabase-sessie en schermt /app en /onboarding af voor niet-ingelogde bezoekers.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;
  const protectedPath = pathname.startsWith('/app') || pathname.startsWith('/onboarding');
  if (!url || !key) {
    if (protectedPath) return NextResponse.redirect(new URL('/login?config=missing', request.url));
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (protectedPath && !data.user) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ['/app/:path*', '/onboarding/:path*', '/api/v1/:path*', '/login'],
};
