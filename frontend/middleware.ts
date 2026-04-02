import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token   = request.cookies.get('access_token')?.value
  const userStr = request.cookies.get('user')?.value

  // ── Parse role ──
  let roleName = ''
  try {
    if (userStr) {
      const user = JSON.parse(decodeURIComponent(userStr))
      roleName = user?.roleName || ''
    }
  } catch {
    // cookie lỗi → xoá và redirect login
  }

  // ── /admin/login — không cần auth, nhưng nếu đã login đúng role thì redirect ──
  if (pathname === '/admin/login') {
    if (token && roleName === 'ROLE_ADMIN')        return NextResponse.redirect(new URL('/admin', request.url))
    if (token && roleName === 'ROLE_HOTEL_OWNER')  return NextResponse.redirect(new URL('/owner', request.url))
    return NextResponse.next()
  }

  // ── /login — nếu đã login thì redirect về home ──
  if (pathname === '/login' || pathname === '/register') {
    if (token && roleName === 'ROLE_USER') return NextResponse.redirect(new URL('/home', request.url))
    return NextResponse.next()
  }

  // ── Bảo vệ /admin ──
  if (pathname.startsWith('/admin')) {
    if (!token) return NextResponse.redirect(new URL('/admin/login', request.url))
    if (roleName !== 'ROLE_ADMIN') return NextResponse.redirect(new URL('/admin/login', request.url))
    return NextResponse.next()
  }

  // ── Bảo vệ /owner ──
  if (pathname.startsWith('/owner')) {
    if (!token) return NextResponse.redirect(new URL('/admin/login', request.url))
    if (roleName !== 'ROLE_HOTEL_OWNER') return NextResponse.redirect(new URL('/admin/login', request.url))
    return NextResponse.next()
  }

  // ── Bảo vệ /profile, /booking ──
  if (pathname.startsWith('/profile') || pathname.startsWith('/booking')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/owner/:path*',
    '/profile/:path*',
    '/booking/:path*',
    '/login',
    '/register',
  ],
}