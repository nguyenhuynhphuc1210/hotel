'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Hotel, CalendarCheck, Users, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import hotelApi, { HotelResponse, HotelStatus, PageResponse } from '@/lib/api/hotel.api'
import bookingApi from '@/lib/api/booking.api'
import userApi from '@/lib/api/user.api'
import { BookingResponse } from '@/types/booking.types'
import { UserResponse } from '@/types/auth.types';

// ── Định nghĩa Interface cho Stats ──
interface StatItem {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  color: 'blue' | 'purple' | 'teal' | 'amber'
}

export default function AdminDashboardPage() {
  // 1. Fetch dữ liệu từ API (Tự động nhận kiểu PageResponse hoặc Array từ Generic)
  const { data: hotelsData } = useQuery({ 
    queryKey: ['admin-hotels-all'], 
    queryFn: () => hotelApi.getAll().then(r => r.data) 
  })
  const { data: bookingsData } = useQuery({ 
    queryKey: ['admin-bookings-all'], 
    queryFn: () => bookingApi.getAll().then(r => r.data) 
  })
  const { data: usersData } = useQuery({ 
    queryKey: ['admin-users-all'], 
    queryFn: () => userApi.getAll().then(r => r.data) 
  })

  // 2. ✅ FIX: Trích xuất mảng content an toàn bằng useMemo
  const hotelList = useMemo((): HotelResponse[] => {
    if (!hotelsData) return []
    return Array.isArray(hotelsData) ? hotelsData : (hotelsData as PageResponse<HotelResponse>).content || []
  }, [hotelsData])

  const bookingList = useMemo((): BookingResponse[] => {
    if (!bookingsData) return []
    // Ép kiểu về bất cứ thứ gì bookingApi.getAll trả về (ở đây là PageResponse)
    const raw = bookingsData as unknown as PageResponse<BookingResponse>
    return raw.content || []
  }, [bookingsData])

  const userList = useMemo((): UserResponse[] => {
    if (!usersData) return []
    const raw = usersData as unknown as PageResponse<UserResponse>
    return raw.content || []
  }, [usersData])

  // 3. Tính toán số liệu dựa trên mảng đã trích xuất
  const totalRevenue = useMemo(() => 
    bookingList
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0)
  , [bookingList])

  const pendingHotels = hotelList.filter(h => h.status === HotelStatus.PENDING).length
  const activeHotels = hotelList.filter(h => h.status === HotelStatus.APPROVED).length
  
  const pendingBookings = bookingList.filter(b => b.status === 'PENDING').length
  const confirmedBookings = bookingList.filter(b => b.status === 'CONFIRMED').length
  const cancelledBookings = bookingList.filter(b => b.status === 'CANCELLED').length
  const completedBookings = bookingList.filter(b => b.status === 'COMPLETED').length

  const totalCustomers = userList.filter(u => u.roleName === 'ROLE_USER').length
  const totalOwners = userList.filter(u => u.roleName === 'ROLE_HOTEL_OWNER').length

  const stats: StatItem[] = [
    {
      label: 'Tổng khách sạn',
      value: hotelList.length,
      sub: `${activeHotels} hoạt động · ${pendingHotels} chờ duyệt`,
      icon: Hotel,
      color: 'blue',
    },
    {
      label: 'Tổng đặt phòng',
      value: bookingList.length,
      sub: `${pendingBookings} chờ xác nhận`,
      icon: CalendarCheck,
      color: 'purple',
    },
    {
      label: 'Người dùng',
      value: userList.length,
      sub: `${totalCustomers} khách · ${totalOwners} chủ KS`,
      icon: Users,
      color: 'teal',
    },
    {
      label: 'Tổng doanh thu',
      value: totalRevenue.toLocaleString('vi-VN') + ' ₫',
      sub: 'Từ tất cả booking thành công',
      icon: TrendingUp,
      color: 'amber',
    },
  ]

  const colorMap: Record<StatItem['color'], string> = {
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
    amber:  'bg-amber-50 text-amber-600',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản trị</h1>
        <p className="text-sm text-gray-500 mt-1">Hệ thống ghi nhận {bookingList.length} giao dịch</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <div className={`p-2 rounded-lg ${colorMap[color]}`}>
                <Icon size={18} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trạng thái booking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Trạng thái đặt phòng</h2>
          <div className="space-y-3">
            {[
              { label: 'Chờ xác nhận', value: pendingBookings,   icon: Clock,       color: 'text-amber-500',  bg: 'bg-amber-50' },
              { label: 'Đã xác nhận',  value: confirmedBookings, icon: CheckCircle, color: 'text-green-500',  bg: 'bg-green-50' },
              { label: 'Đã huỷ',       value: cancelledBookings, icon: XCircle,     color: 'text-red-500',    bg: 'bg-red-50' },
              { label: 'Hoàn thành',   value: completedBookings, icon: CheckCircle, color: 'text-blue-500',   bg: 'bg-blue-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${bg}`}>
                    <Icon size={14} className={color} />
                  </div>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Khách sạn chờ duyệt */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Khách sạn chờ duyệt</h2>
            {pendingHotels > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                {pendingHotels} yêu cầu
              </span>
            )}
          </div>

          {pendingHotels === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle size={32} className="text-green-200 mb-2" />
              <p className="text-sm italic">Hệ thống đã xử lý hết yêu cầu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hotelList.filter(h => h.status === HotelStatus.PENDING).slice(0, 5).map(hotel => (
                <div key={hotel.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                  <div>
                    <div className="text-sm font-bold text-gray-900">{hotel.hotelName}</div>
                    <div className="text-xs text-gray-400">{hotel.district} · {hotel.city}</div>
                  </div>
                  <button 
                    onClick={() => window.location.href = `/admin/hotels/${hotel.id}/edit`}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    Xem xét
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking gần đây */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Giao dịch gần đây</h2>
          <button onClick={() => window.location.href='/admin/bookings'} className="text-xs font-bold text-blue-600 hover:underline">Tất cả</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 uppercase tracking-tighter">
                <th className="text-left pb-2 font-bold">Mã</th>
                <th className="text-left pb-2 font-bold">Khách hàng</th>
                <th className="text-left pb-2 font-bold">Khách sạn</th>
                <th className="text-left pb-2 font-bold">Giá trị</th>
                <th className="text-left pb-2 font-bold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookingList.slice(0, 6).map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 font-mono text-xs font-bold text-blue-600">{b.bookingCode}</td>
                  <td className="py-3">
                    <div className="font-semibold text-gray-900">{b.guestName}</div>
                    <div className="text-[10px] text-gray-400">{b.guestEmail}</div>
                  </td>
                  <td className="py-3 text-gray-600 text-xs">{b.hotelName}</td>
                  <td className="py-3 text-gray-900 font-bold">
                    {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                  </td>
                  <td className="py-3">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
              {bookingList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 italic">
                    Chưa có giao dịch nào được ghi nhận
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter ${s.class}`}>
      {s.label}
    </span>
  )
}