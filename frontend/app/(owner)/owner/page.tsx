'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Hotel, CalendarCheck, TrendingUp, Star, ChevronDown } from 'lucide-react'
import hotelApi from '@/lib/api/hotel.api'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelStatisticResponse } from '@/types/statistic.types'

export default function OwnerDashboardPage() {
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])

  // Lấy danh sách KS của owner
  const { data: hotels = [] } = useQuery({
    queryKey: ['owner-hotels'],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

  const activeHotelId = selectedHotelId ?? hotels[0]?.id ?? null

  // Lấy thống kê
  const { data: stats = [] } = useQuery({
    queryKey: ['hotel-stats', activeHotelId, fromDate, toDate],
    queryFn: () => axiosInstance.get<HotelStatisticResponse[]>(
      API_CONFIG.ENDPOINTS.HOTEL_STATISTICS,
      { params: { hotelId: activeHotelId, fromDate, toDate } }
    ).then(r => r.data),
    enabled: !!activeHotelId && hotels.length > 0,
    retry: false,        
    throwOnError: false, 
  })

  // Tính tổng
  const totalBookings = stats.reduce((s, r) => s + (r.totalBookings ?? 0), 0)
  const totalRevenue = stats.reduce((s, r) => s + Number(r.totalRevenue ?? 0), 0)
  const selectedHotel = hotels.find(h => h.id === activeHotelId)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan hoạt động khách sạn</p>
        </div>

        {/* Chọn khách sạn */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={selectedHotelId ?? ''}
              onChange={e => setSelectedHotelId(Number(e.target.value))}
              className="pl-4 pr-8 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              {hotels.map(h => (
                <option key={h.id} value={h.id}>{h.hotelName}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="text-sm text-gray-700 outline-none" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="text-sm text-gray-700 outline-none" />
          </div>
        </div>
      </div>

      {/* Hotel info banner */}
      {selectedHotel && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-5 text-white flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">{selectedHotel.hotelName}</div>
            <div className="text-blue-100 text-sm mt-0.5">{selectedHotel.district}, {selectedHotel.city}</div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <Star size={14} fill="white" className="text-white" />
            <span className="text-sm font-semibold">{selectedHotel.starRating ?? 0} sao</span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={CalendarCheck}
          label="Lượt đặt phòng"
          value={totalBookings.toString()}
          sub={`Từ ${fromDate} đến ${toDate}`}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Doanh thu"
          value={totalRevenue.toLocaleString('vi-VN') + ' ₫'}
          sub="Tổng trong kỳ"
          color="green"
        />
        <StatCard
          icon={Hotel}
          label="Ngày có dữ liệu"
          value={stats.length.toString()}
          sub="Số ngày thống kê"
          color="purple"
        />
      </div>

      {/* Bảng thống kê theo ngày */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Chi tiết theo ngày</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Ngày</th>
              <th className="text-right px-5 py-3">Lượt đặt</th>
              <th className="text-right px-5 py-3">Doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-gray-400">
                  Không có dữ liệu thống kê trong kỳ này
                </td>
              </tr>
            ) : (
              stats.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">
                    {new Date(s.statDate).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {s.totalBookings ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-green-600">
                    {Number(s.totalRevenue ?? 0).toLocaleString('vi-VN')}₫
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {stats.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-5 py-3 font-semibold text-gray-700">Tổng cộng</td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">{totalBookings}</td>
                <td className="px-5 py-3 text-right font-bold text-green-600">
                  {totalRevenue.toLocaleString('vi-VN')}₫
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string
  sub: string; color: 'blue' | 'green' | 'purple'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}