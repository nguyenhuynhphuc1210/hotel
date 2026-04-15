'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Hotel, CalendarCheck, TrendingUp, Star, ChevronDown, Loader2 } from 'lucide-react'
import hotelApi, { HotelResponse, PageResponse } from '@/lib/api/hotel.api'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelStatisticResponse } from '@/types/statistic.types'

// ── Định nghĩa Interface cho StatCard ──
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  color: 'blue' | 'green' | 'purple'
}

// ── Định nghĩa Interface cho Summary ──
interface HotelSummaryItem {
  hotel: HotelResponse
  totalBookings: number
  totalRevenue: number
}

export default function OwnerDashboardPage() {
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(1) // Mặc định từ đầu tháng
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0])

  // 1. Lấy danh sách khách sạn
  const { data: hotelsData, isLoading: isLoadingHotels } = useQuery({
    queryKey: ['owner-hotels-dashboard'],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

  // ✅ Trích xuất hotelList an toàn
  const hotelList = useMemo((): HotelResponse[] => {
    if (!hotelsData) return []
    return Array.isArray(hotelsData) ? hotelsData : (hotelsData as PageResponse<HotelResponse>).content || []
  }, [hotelsData])

  const activeHotelId = selectedHotelId ?? hotelList[0]?.id ?? null

  // 2. Gọi song song tất cả KS để tính tổng doanh thu toàn hệ thống
  const allStatsQueries = useQueries({
    queries: hotelList.map(hotel => ({
      queryKey: ['hotel-stats', hotel.id, fromDate, toDate],
      queryFn: () => axiosInstance.get<HotelStatisticResponse[] | PageResponse<HotelStatisticResponse>>(
        API_CONFIG.ENDPOINTS.HOTEL_STATISTICS,
        { params: { hotelId: hotel.id, fromDate, toDate } }
      ).then(r => r.data),
      enabled: hotelList.length > 0,
    })),
  })

  // ✅ Tính toán hotelSummaries không dùng any
  const hotelSummaries = useMemo((): HotelSummaryItem[] => {
    return hotelList.map((hotel, i) => {
      const rawData = allStatsQueries[i]?.data
      // Xử lý cả trường hợp trả về Array hoặc Page
      const stats: HotelStatisticResponse[] = Array.isArray(rawData) 
        ? rawData 
        : (rawData as PageResponse<HotelStatisticResponse>)?.content || []

      return {
        hotel,
        totalBookings: stats.reduce((acc: number, curr: HotelStatisticResponse) => acc + (curr.totalBookings ?? 0), 0),
        totalRevenue: stats.reduce((acc: number, curr: HotelStatisticResponse) => acc + Number(curr.totalRevenue ?? 0), 0),
      }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [hotelList, allStatsQueries])

  const grandBookings = hotelSummaries.reduce((s, h) => s + h.totalBookings, 0)
  const grandRevenue = hotelSummaries.reduce((s, h) => s + h.totalRevenue, 0)

  // 3. Thống kê khách sạn đang chọn (chi tiết theo ngày)
  const { data: rawDetailStats, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['hotel-stats-detail', activeHotelId, fromDate, toDate],
    queryFn: () => axiosInstance.get<HotelStatisticResponse[] | PageResponse<HotelStatisticResponse>>(
      API_CONFIG.ENDPOINTS.HOTEL_STATISTICS,
      { params: { hotelId: activeHotelId, fromDate, toDate } }
    ).then(r => r.data),
    enabled: !!activeHotelId,
  })

  const detailStats = useMemo((): HotelStatisticResponse[] => {
    if (!rawDetailStats) return []
    return Array.isArray(rawDetailStats) 
      ? rawDetailStats 
      : (rawDetailStats as PageResponse<HotelStatisticResponse>).content || []
  }, [rawDetailStats])

  const selectedHotel = hotelList.find(h => h.id === activeHotelId)
  const detailBookings = detailStats.reduce((s, r) => s + (r.totalBookings ?? 0), 0)
  const detailRevenue = detailStats.reduce((s, r) => s + Number(r.totalRevenue ?? 0), 0)

  if (isLoadingHotels) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-gray-500 font-medium">Đang tải dữ liệu dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + date range */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan hoạt động kinh doanh</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="text-sm text-gray-700 outline-none cursor-pointer" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="text-sm text-gray-700 outline-none cursor-pointer" />
        </div>
      </div>

      {/* ── PHẦN 1: TỔNG TẤT CẢ KHÁCH SẠN ── */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toàn bộ hệ thống</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={CalendarCheck} label="Tổng lượt đặt"
            value={grandBookings.toLocaleString()} sub={`${hotelList.length} khách sạn`} color="blue" />
          <StatCard icon={TrendingUp} label="Tổng doanh thu"
            value={grandRevenue.toLocaleString('vi-VN') + ' ₫'} sub="Sau giảm giá" color="green" />
          <StatCard icon={Hotel} label="Khách sạn đang quản lý"
            value={hotelList.length.toString()} sub="Cơ sở hoạt động" color="purple" />
        </div>
      </div>

      {/* Bảng tổng hợp doanh thu */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">Xếp hạng doanh thu cơ sở</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Khách sạn</th>
                <th className="text-right px-5 py-3">Lượt đặt</th>
                <th className="text-right px-5 py-3">Doanh thu</th>
                <th className="text-right px-5 py-3">Tỷ trọng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hotelSummaries.map(({ hotel, totalBookings, totalRevenue }) => {
                const pct = grandRevenue > 0 ? ((totalRevenue / grandRevenue) * 100).toFixed(1) : '0'
                return (
                  <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-bold text-gray-900">{hotel.hotelName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{hotel.district}, {hotel.city}</div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{totalBookings}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">
                      {totalRevenue.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-gray-500">{pct}%</span>
                        <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PHẦN 2: CHI TIẾT THEO KHÁCH SẠN ── */}
      <div className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phân tích chi tiết</p>
          <div className="relative">
            <select
              value={activeHotelId ?? ''}
              onChange={e => setSelectedHotelId(Number(e.target.value))}
              className="pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm font-bold text-blue-600 bg-white shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {hotelList.map(h => (
                <option key={h.id} value={h.id}>{h.hotelName}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {selectedHotel && (
          <div className="bg-blue-600 rounded-xl p-5 text-white shadow-lg flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-black">{selectedHotel.hotelName}</h3>
              <p className="text-blue-100 text-sm opacity-90">{selectedHotel.addressLine}, {selectedHotel.district}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
              <Star size={16} fill="currentColor" className="text-yellow-300" />
              <span className="font-bold">{selectedHotel.starRating ?? 0} Sao</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={CalendarCheck} label="Lượt đặt trong kỳ"
            value={detailBookings.toLocaleString()} sub="Booking thành công" color="blue" />
          <StatCard icon={TrendingUp} label="Doanh thu trong kỳ"
            value={detailRevenue.toLocaleString('vi-VN') + ' ₫'} sub="Đã thanh toán" color="green" />
          <StatCard icon={Hotel} label="Mật độ dữ liệu"
            value={detailStats.length.toString()} sub="Số ngày ghi nhận" color="purple" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900">Biến động doanh thu theo ngày</h2>
            {isLoadingDetail && <Loader2 size={16} className="animate-spin text-blue-500" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Ngày</th>
                  <th className="text-right px-5 py-3">Lượt đặt</th>
                  <th className="text-right px-5 py-3">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detailStats.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-16 text-gray-400 font-medium italic">
                    Không có dữ liệu trong khoảng thời gian này
                  </td></tr>
                ) : (
                  detailStats.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-700">
                        {new Date(s.statDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">{s.totalBookings}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600">
                        {Number(s.totalRevenue).toLocaleString('vi-VN')}₫
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm transition-transform hover:scale-[1.02] duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg border ${colorMap[color]}`}><Icon size={20} /></div>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-400 mt-1">{sub}</div>
    </div>
  )
}