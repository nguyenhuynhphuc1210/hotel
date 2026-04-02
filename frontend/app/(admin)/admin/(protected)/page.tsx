'use client'

import { useQuery } from '@tanstack/react-query'
import { Hotel, CalendarCheck, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import bookingApi from '@/lib/api/booking.api'
import userApi from '@/lib/api/user.api'

export default function AdminDashboardPage() {
  const { data: hotels = [] }   = useQuery({ queryKey: ['hotels'],   queryFn: () => hotelApi.getAll().then(r => r.data) })
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => bookingApi.getAll().then(r => r.data) })
  const { data: users = [] }    = useQuery({ queryKey: ['users'],    queryFn: () => userApi.getAll().then(r => r.data) })

  // Tính toán số liệu
  const totalRevenue = bookings
  .filter(b => b.status === 'COMPLETED')
  .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0)
  const pendingHotels    = hotels.filter(h => !h.isActive).length
  const activeHotels     = hotels.filter(h => h.isActive).length
  const pendingBookings  = bookings.filter(b => b.status === 'PENDING').length
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length
  const totalCustomers   = users.filter(u => u.roleName === 'ROLE_USER').length
  const totalOwners      = users.filter(u => u.roleName === 'ROLE_HOTEL_OWNER').length

  const stats = [
    {
      label: 'Tổng khách sạn',
      value: hotels.length,
      sub: `${activeHotels} hoạt động · ${pendingHotels} chờ duyệt`,
      icon: Hotel,
      color: 'blue',
    },
    {
      label: 'Tổng đặt phòng',
      value: bookings.length,
      sub: `${pendingBookings} chờ xác nhận`,
      icon: CalendarCheck,
      color: 'purple',
    },
    {
      label: 'Người dùng',
      value: users.length,
      sub: `${totalCustomers} khách · ${totalOwners} chủ KS`,
      icon: Users,
      color: 'teal',
    },
    {
      label: 'Tổng doanh thu',
      value: totalRevenue.toLocaleString('vi-VN') + ' ₫',
      sub: 'Từ tất cả booking',
      icon: TrendingUp,
      color: 'amber',
    },
  ]

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
    amber:  'bg-amber-50 text-amber-600',
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tổng quan hệ thống Vago Hotel</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`p-2 rounded-lg ${colorMap[color]}`}>
                <Icon size={18} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* 2 cột: Booking status + Khách sạn chờ duyệt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Trạng thái booking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Trạng thái đặt phòng</h2>
          <div className="space-y-3">
            {[
              { label: 'Chờ xác nhận', value: pendingBookings,   icon: Clock,         color: 'text-amber-500',  bg: 'bg-amber-50' },
              { label: 'Đã xác nhận',  value: confirmedBookings, icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-50' },
              { label: 'Đã huỷ',       value: cancelledBookings, icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50' },
              { label: 'Hoàn thành',   value: bookings.filter(b => b.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${bg}`}>
                    <Icon size={14} className={color} />
                  </div>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Khách sạn chờ duyệt */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Khách sạn chờ duyệt</h2>
            {pendingHotels > 0 && (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                {pendingHotels} chờ duyệt
              </span>
            )}
          </div>

          {pendingHotels === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle size={32} className="text-green-400 mb-2" />
              <p className="text-sm">Không có khách sạn nào chờ duyệt</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hotels.filter(h => !h.isActive).slice(0, 5).map(hotel => (
                <div key={hotel.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{hotel.hotelName}</div>
                    <div className="text-xs text-gray-400">{hotel.district} · {hotel.city}</div>
                  </div>
                  
                  <a 
                    href={`/admin/hotels/${hotel.id}/edit`}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Xem xét
                  </a>
                </div>
              ))}
              {pendingHotels > 5 && (
                <a href="/admin/hotels" className="block text-center text-xs text-blue-600 hover:underline pt-2">
                  Xem tất cả {pendingHotels} khách sạn
                </a>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Booking gần đây */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Đặt phòng gần đây</h2>
          <a href="/admin/bookings" className="text-xs text-blue-600 hover:underline">Xem tất cả</a>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Mã booking</th>
              <th className="text-left pb-2 font-medium">Khách</th>
              <th className="text-left pb-2 font-medium">Khách sạn</th>
              <th className="text-left pb-2 font-medium">Tổng tiền</th>
              <th className="text-left pb-2 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.slice(0, 5).map(b => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 font-mono text-xs text-gray-600">{b.bookingCode}</td>
                <td className="py-2.5">
                  <div className="text-gray-900">{b.guestName}</div>
                  <div className="text-xs text-gray-400">{b.guestEmail}</div>
                </td>
                <td className="py-2.5 text-gray-600">{b.hotelName}</td>
                <td className="py-2.5 text-gray-900 font-medium">
                  {(b.totalAmount ?? 0).toLocaleString('vi-VN')}₫
                </td>
                <td className="py-2.5">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Chưa có đặt phòng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    PENDING:   { label: 'Chờ xác nhận', class: 'bg-amber-50 text-amber-700' },
    CONFIRMED: { label: 'Đã xác nhận',  class: 'bg-green-50 text-green-700' },
    COMPLETED: { label: 'Hoàn thành',   class: 'bg-blue-50 text-blue-700' },
    CANCELLED: { label: 'Đã huỷ',       class: 'bg-red-50 text-red-700' },
  }
  const s = map[status] ?? { label: status, class: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>
      {s.label}
    </span>
  )
}