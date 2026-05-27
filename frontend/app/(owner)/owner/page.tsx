'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import {
  Hotel,
  CalendarCheck,
  TrendingUp,
  Star,
  ChevronDown,
  Loader2,
  BarChart3,
  XCircle,
  EyeOff,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import hotelApi, { HotelResponse, PageResponse } from '@/lib/api/hotel.api'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelStatisticResponse } from '@/types/statistic.types'

// ── Interfaces ──
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange'
  trend?: number
}

interface HotelSummaryItem {
  hotel: HotelResponse
  completedBookings: number
  totalRevenue: number
  totalCancelled: number
  totalNoShow: number
}

// ── Màu sắc cho PieChart ──
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// ── Custom Tooltip cho Area/Bar chart ──
interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

interface RevenueTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-900">
            {p.name === 'Doanh thu'
              ? Number(p.value).toLocaleString('vi-VN') + ' ₫'
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function OwnerDashboardPage() {
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null)

  // ── Filter mode: 'range' | 'month' ──
  const [filterMode, setFilterMode] = useState<'range' | 'month'>('month')

  // range mode
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0])

  // month/year mode
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())

  // Params gửi lên API tuỳ theo mode
  const apiParams = useMemo(() => {
    if (filterMode === 'month') {
      return { month: filterMonth, year: filterYear }
    }
    return { fromDate, toDate }
  }, [filterMode, filterMonth, filterYear, fromDate, toDate])

  // queryKey thay đổi khi params thay đổi
  const filterKey = useMemo(
    () => (filterMode === 'month' ? `${filterMonth}-${filterYear}` : `${fromDate}_${toDate}`),
    [filterMode, filterMonth, filterYear, fromDate, toDate]
  )

  // 1. Danh sách khách sạn
  const { data: hotelsData, isLoading: isLoadingHotels } = useQuery({
    queryKey: ['owner-hotels-dashboard'],
    queryFn: () => hotelApi.getAll().then(r => r.data),
  })

  const hotelList = useMemo((): HotelResponse[] => {
    if (!hotelsData) return []
    return Array.isArray(hotelsData)
      ? hotelsData
      : (hotelsData as PageResponse<HotelResponse>).content || []
  }, [hotelsData])

  const activeHotelId = selectedHotelId ?? hotelList[0]?.id ?? null

  // 2. Thống kê song song tất cả KS
  const allStatsQueries = useQueries({
    queries: hotelList.map(hotel => ({
      queryKey: ['hotel-stats', hotel.id, filterKey],
      queryFn: () =>
        axiosInstance
          .get<HotelStatisticResponse[] | PageResponse<HotelStatisticResponse>>(
            API_CONFIG.ENDPOINTS.HOTEL_STATISTICS,
            { params: { hotelId: hotel.id, ...apiParams } }
          )
          .then(r => r.data),
      enabled: hotelList.length > 0,
    })),
  })

  const hotelSummaries = useMemo((): HotelSummaryItem[] => {
    return hotelList
      .map((hotel, i) => {
        const rawData = allStatsQueries[i]?.data
        const stats: HotelStatisticResponse[] = Array.isArray(rawData)
          ? rawData
          : (rawData as PageResponse<HotelStatisticResponse>)?.content || []
        return {
          hotel,
          completedBookings: stats.reduce((acc, curr) => acc + (curr.completedBookings ?? 0), 0),
          totalRevenue: stats.reduce((acc, curr) => acc + Number(curr.totalRevenue ?? 0), 0),
          totalCancelled: stats.reduce((acc, curr) => acc + (curr.totalCancelled ?? 0), 0),
          totalNoShow: stats.reduce((acc, curr) => acc + (curr.totalNoShow ?? 0), 0),
        }
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [hotelList, allStatsQueries])

  const grandBookings = hotelSummaries.reduce((s, h) => s + h.completedBookings, 0)
  const grandRevenue = hotelSummaries.reduce((s, h) => s + h.totalRevenue, 0)
  const grandCancelled = hotelSummaries.reduce((s, h) => s + h.totalCancelled, 0)
  const grandNoShow = hotelSummaries.reduce((s, h) => s + h.totalNoShow, 0)

  // 3. Chi tiết KS đang chọn (theo ngày)
  const { data: rawDetailStats, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['hotel-stats-detail', activeHotelId, filterKey],
    queryFn: () =>
      axiosInstance
        .get<HotelStatisticResponse[] | PageResponse<HotelStatisticResponse>>(
          API_CONFIG.ENDPOINTS.HOTEL_STATISTICS,
          { params: { hotelId: activeHotelId, ...apiParams } }
        )
        .then(r => r.data),
    enabled: !!activeHotelId,
  })

  const detailStats = useMemo((): HotelStatisticResponse[] => {
    if (!rawDetailStats) return []
    return Array.isArray(rawDetailStats)
      ? rawDetailStats
      : (rawDetailStats as PageResponse<HotelStatisticResponse>).content || []
  }, [rawDetailStats])

  // ── Dữ liệu cho biểu đồ ──

  // Area chart: doanh thu theo ngày (KS đang chọn)
  const areaChartData = useMemo(
    () =>
      detailStats.map(s => ({
        date: new Date(s.statDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        'Doanh thu': Number(s.totalRevenue ?? 0),
        'Lượt đặt': s.completedBookings ?? 0,
        'Huỷ': s.totalCancelled ?? 0,
        'No-show': s.totalNoShow ?? 0,
      })),
    [detailStats]
  )

  // Bar chart: so sánh doanh thu tất cả KS
  const barChartData = useMemo(
    () =>
      hotelSummaries.map(h => ({
        name: h.hotel.hotelName.length > 14 ? h.hotel.hotelName.slice(0, 14) + '…' : h.hotel.hotelName,
        'Doanh thu': h.totalRevenue,
        'Lượt đặt': h.completedBookings,
      })),
    [hotelSummaries]
  )

  // Pie chart: tỷ lệ booking status (toàn hệ thống)
  const pieData = useMemo(() => {
    const total = grandBookings + grandCancelled + grandNoShow
    if (total === 0) return []
    return [
      { name: 'Hoàn thành', value: grandBookings },
      { name: 'Đã huỷ', value: grandCancelled },
      { name: 'No-show', value: grandNoShow },
    ].filter(d => d.value > 0)
  }, [grandBookings, grandCancelled, grandNoShow])

  // Pie chart: tỷ trọng doanh thu theo KS
  const hotelPieData = useMemo(
    () =>
      hotelSummaries
        .filter(h => h.totalRevenue > 0)
        .map(h => ({
          name: h.hotel.hotelName,
          value: h.totalRevenue,
        })),
    [hotelSummaries]
  )

  const selectedHotel = hotelList.find(h => h.id === activeHotelId)
  const detailBookings = detailStats.reduce((s, r) => s + (r.completedBookings ?? 0), 0)
  const detailRevenue = detailStats.reduce((s, r) => s + Number(r.totalRevenue ?? 0), 0)
  const detailCancelled = detailStats.reduce((s, r) => s + (r.totalCancelled ?? 0), 0)
  const detailNoShow = detailStats.reduce((s, r) => s + (r.totalNoShow ?? 0), 0)

  if (isLoadingHotels) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-gray-500 font-medium">Đang tải dữ liệu dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header + Filter ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan hoạt động kinh doanh</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Toggle mode */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold shadow-sm">
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterMode === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Theo tháng
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterMode === 'range'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Khoảng ngày
            </button>
          </div>

          {/* Inputs tuỳ mode */}
          {filterMode === 'month' ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(Number(e.target.value))}
                className="text-sm text-gray-700 outline-none cursor-pointer bg-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <span className="text-gray-300">/</span>
              <select
                value={filterYear}
                onChange={e => setFilterYear(Number(e.target.value))}
                className="text-sm text-gray-700 outline-none cursor-pointer bg-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="text-sm text-gray-700 outline-none cursor-pointer"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="text-sm text-gray-700 outline-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── PHẦN 1: TỔNG QUAN HỆ THỐNG ── */}
      <Section label="Toàn bộ hệ thống">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={CalendarCheck} label="Tổng lượt đặt" value={grandBookings.toLocaleString()} sub={`${hotelList.length} khách sạn`} color="blue" />
          <StatCard icon={TrendingUp} label="Tổng doanh thu" value={grandRevenue.toLocaleString('vi-VN') + ' ₫'} sub="Sau giảm giá" color="green" />
          <StatCard icon={XCircle} label="Đã huỷ" value={grandCancelled.toLocaleString()} sub="Booking bị huỷ" color="red" />
          <StatCard icon={EyeOff} label="No-show" value={grandNoShow.toLocaleString()} sub="Không đến nhận phòng" color="orange" />
        </div>

        {/* Biểu đồ hàng 1: Bar chart doanh thu KS + Pie chart status */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
          {/* Bar chart */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={15} className="text-blue-500" />
              So sánh doanh thu theo cơ sở
            </h3>
            {barChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    yAxisId="revenue"
                    orientation="left"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickFormatter={v => (v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v.toLocaleString())}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="revenue" dataKey="Doanh thu" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {barChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie charts */}
          <div className="lg:col-span-2 grid grid-rows-2 gap-4">
            {/* Pie: booking status */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tỷ lệ booking</h3>
              {pieData.length === 0 ? (
                <EmptyChart small />
              ) : (
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" paddingAngle={3}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={[PIE_COLORS[1], PIE_COLORS[3], PIE_COLORS[2]][i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v ?? '—', '']} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(v: string, e: { payload?: { value?: number } }) =>
                        `${v}: ${e.payload?.value ?? 0}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie: tỷ trọng doanh thu KS */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tỷ trọng doanh thu</h3>
              {hotelPieData.length === 0 ? (
                <EmptyChart small />
              ) : (
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie data={hotelPieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" paddingAngle={3}>
                      {hotelPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v !== undefined ? Number(v).toLocaleString('vi-VN') + ' ₫' : '—', '']} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Bảng xếp hạng */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-4">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900">Xếp hạng doanh thu cơ sở</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-5 py-3">Khách sạn</th>
                  <th className="text-right px-5 py-3">Lượt đặt</th>
                  <th className="text-right px-5 py-3">Huỷ</th>
                  <th className="text-right px-5 py-3">No-show</th>
                  <th className="text-right px-5 py-3">Doanh thu</th>
                  <th className="text-right px-5 py-3">Tỷ trọng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hotelSummaries.map(({ hotel, completedBookings, totalRevenue, totalCancelled, totalNoShow }, idx) => {
                  const pct = grandRevenue > 0 ? ((totalRevenue / grandRevenue) * 100).toFixed(1) : '0'
                  return (
                    <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-400 font-bold text-xs">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-gray-900">{hotel.hotelName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{hotel.district}, {hotel.city}</div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium">{completedBookings}</td>
                      <td className="px-5 py-3 text-right text-red-500 font-medium">{totalCancelled}</td>
                      <td className="px-5 py-3 text-right text-orange-500 font-medium">{totalNoShow}</td>
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
      </Section>

      {/* ── PHẦN 2: CHI TIẾT KHÁCH SẠN ── */}
      <Section
        label="Phân tích chi tiết"
        action={
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
        }
      >
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <StatCard icon={CalendarCheck} label="Lượt đặt" value={detailBookings.toLocaleString()} sub="Hoàn thành" color="blue" />
          <StatCard icon={TrendingUp} label="Doanh thu" value={detailRevenue.toLocaleString('vi-VN') + ' ₫'} sub="Đã thanh toán" color="green" />
          <StatCard icon={XCircle} label="Đã huỷ" value={detailCancelled.toLocaleString()} sub="Trong kỳ" color="red" />
          <StatCard icon={EyeOff} label="No-show" value={detailNoShow.toLocaleString()} sub="Trong kỳ" color="orange" />
        </div>

        {/* Area chart doanh thu theo ngày */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Biến động doanh thu theo ngày</h3>
            {isLoadingDetail && <Loader2 size={16} className="animate-spin text-blue-500" />}
          </div>
          {areaChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={areaChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v.toLocaleString()}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Doanh thu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart lượt đặt + huỷ + no-show theo ngày */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Phân tích booking theo ngày</h3>
          {areaChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={areaChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip content={<RevenueTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Lượt đặt" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Huỷ" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="No-show" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bảng chi tiết theo ngày */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-4">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-bold text-gray-900">Chi tiết theo ngày</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Ngày</th>
                  <th className="text-right px-5 py-3">Lượt đặt</th>
                  <th className="text-right px-5 py-3">Huỷ</th>
                  <th className="text-right px-5 py-3">No-show</th>
                  <th className="text-right px-5 py-3">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detailStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-gray-400 font-medium italic">
                      Không có dữ liệu trong khoảng thời gian này
                    </td>
                  </tr>
                ) : (
                  detailStats.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-700">
                        {new Date(s.statDate).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">
                        {s.completedBookings ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right text-red-500 font-medium">
                        {s.totalCancelled ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right text-orange-500 font-medium">
                        {s.totalNoShow ?? 0}
                      </td>
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
      </Section>
    </div>
  )
}

// ── Helper Components ──

function Section({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ small = false }: { small?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-gray-300 italic text-sm ${small ? 'h-20' : 'h-40'}`}>
      Không có dữ liệu
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-500 border-red-100',
    orange: 'bg-orange-50 text-orange-500 border-orange-100',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:scale-[1.02] transition-transform duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg border ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-xl font-black text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-400 mt-1">{sub}</div>
    </div>
  )
}