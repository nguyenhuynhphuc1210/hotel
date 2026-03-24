import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value
  const userStr = request.cookies.get('user')?.value

  // Chưa đăng nhập → về login
  if (!token) {
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/owner') ||
      pathname.startsWith('/profile')
    ) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Lấy role từ cookie user
  let roleName = ''
  try {
    const user = JSON.parse(decodeURIComponent(userStr || '{}'))
    roleName = user?.roleName || ''
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Bảo vệ /admin
  if (pathname.startsWith('/admin') && roleName !== 'ROLE_ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Bảo vệ /owner
  if (pathname.startsWith('/owner')) {
    try {
      const user = JSON.parse(decodeURIComponent(userStr || '{}'))
      if (user?.roleName !== 'ROLE_HOTEL_OWNER') {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/owner/:path*', '/profile/:path*'],
}