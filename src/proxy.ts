import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Internal management paths forbidden from public check-in domain
const BLOCKED_ADMIN_PREFIXES = [
  '/pms',
  '/billing',
  '/pos',
  '/night-audit',
  '/audit-log',
  '/housekeeping',
  '/expenses',
  '/admin',
  '/settings',
  '/onboarding',
  '/dashboard',
  '/reports',
];

export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase();
  const { pathname } = request.nextUrl;

  const isCheckinDomain =
    host.includes('checkin.ambarishbydivineview.com') ||
    host.startsWith('checkin.');

  if (isCheckinDomain) {
    // 1. If visiting root on checkin domain, immediately redirect to /checkin
    if (pathname === '/' || pathname === '') {
      return NextResponse.redirect(new URL('/checkin', request.url));
    }

    // 2. Strict Security: Block staff/admin pages from the public internet
    const isBlocked = BLOCKED_ADMIN_PREFIXES.some((prefix) =>
      pathname === prefix || pathname.startsWith(prefix + '/')
    );

    if (isBlocked) {
      // Instantly bounce unauthorized attempts to /checkin
      return NextResponse.redirect(new URL('/checkin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * 1. _next (Next.js internals, chunks, HMR WebSockets)
     * 2. Files with extensions (.png, .jpg, .ico, .svg, .css, .js)
     */
    '/((?!_next|.*\\.[\\w]+$).*)',
  ],
};
