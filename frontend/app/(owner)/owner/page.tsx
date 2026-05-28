'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Hotel,
  CalendarCheck,
  TrendingUp,
  XCircle,
  EyeOff,
  ChevronDown,
  Loader2,
  BarChart3,
  Users,
  Building2,
  Download,
} from 'lucide-react'
import { exportRevenue } from '@/lib/api/export.api'
import toast from 'react-hot-toast'
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
import statisticApi from '@/lib/api/statistic.api'
import { useOwnerHotel } from '../owner-hotel-context'
import {
  DashboardParams,
  DashboardResponse,
  RecentBookingResponse,
} from '@/types/statistic.types'

// ── Constants ──
const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4']

const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã nhận phòng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  NO_SHOW: 'No-show',
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  CONFIRMED: 'text-blue-600 bg-blue-50 border-blue-200',
  CHECKED_IN: 'text-purple-600 bg-purple-50 border-purple-200',
  COMPLETED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  CANCELLED: 'text-red-500 bg-red-50 border-red-200',
  NO_SHOW: 'text-orange-500 bg-orange-50 border-orange-200',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ TT',
  PAID: 'Đã TT',
  FAILED: 'Thất bại',
  REFUNDED: 'Hoàn tiền',
  CANCELLED: 'Đã huỷ',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-600',
  PAID: 'text-emerald-600',
  FAILED: 'text-red-500',
  REFUNDED: 'text-blue-500',
  CANCELLED: 'text-gray-400',
}

// ── Tooltip ──
interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
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

// ── StatCard ──
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray'
}

function StatCard({ icon: Icon, label, value, sub, color }: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-500 border-red-100',
    orange: 'bg-orange-50 text-orange-500 border-orange-100',
    gray: 'bg-gray-50 text-gray-500 border-gray-200',
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
    <div
      className={`flex items-center justify-center text-gray-300 italic text-sm ${
        small ? 'h-20' : 'h-40'
      }`}
    >
      Không có dữ liệu
    </div>
  )
}

// ── Main Component ──
export default function OwnerDashboardPage() {
  // ── Lấy hotel đang chọn từ context (được set bởi selector trên header) ──
  const { activeHotelId } = useOwnerHotel()

  // Filter mode
  const [filterMode, setFilterMode] = useState<'range' | 'month'>('month')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0])

  // dashboardParams luôn kèm hotelId từ context
  const dashboardParams = useMemo((): DashboardParams => {
    const base = filterMode === 'month'
      ? { month: filterMonth, year: filterYear }
      : { fromDate, toDate }
    return activeHotelId ? { ...base, hotelId: activeHotelId } : base
  }, [filterMode, filterMonth, filterYear, fromDate, toDate, activeHotelId])

  // queryKey bao gồm activeHotelId → re-fetch khi đổi hotel
  const filterKey = useMemo(
    () => {
      const dateKey = filterMode === 'month'
        ? `${filterMonth}-${filterYear}`
        : `${fromDate}_${toDate}`
      return `${activeHotelId ?? 'all'}_${dateKey}`
    },
    [filterMode, filterMonth, filterYear, fromDate, toDate, activeHotelId]
  )

  // ── Export ──
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportRevenue({
        hotelId: activeHotelId ?? undefined,
        ...(filterMode === 'month'
          ? { month: filterMonth, year: filterYear }
          : { fromDate, toDate }),
      })
      toast.success('Xuất file thành công!')
    } catch {
      toast.error('Xuất file thất bại, vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

  // ── Single API call — enabled khi có activeHotelId ──
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['owner-dashboard', filterKey],
    queryFn: () => statisticApi.getDashboard(dashboardParams).then(r => r.data),
    enabled: !!activeHotelId,
  })

  // ── Derived data ──
  const summary = dashboard?.summary
  const chartData = dashboard?.chartData ?? []
  const topHotels = dashboard?.topHotels ?? []
  const recentBookings = dashboard?.recentBookings ?? []

  const grandRevenue = topHotels.reduce((s, h) => s + Number(h.totalRevenue ?? 0), 0)

  const areaChartData = useMemo(
    () =>
      chartData.map(s => ({
        date: new Date(s.statDate).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        }),
        'Doanh thu': Number(s.totalRevenue ?? 0),
        'Lượt đặt': s.completedBookings ?? 0,
        'Huỷ': s.totalCancelled ?? 0,
        'No-show': s.totalNoShow ?? 0,
      })),
    [chartData]
  )

  const barChartData = useMemo(
    () =>
      topHotels.map(h => ({
        name:
          h.hotelName.length > 14 ? h.hotelName.slice(0, 14) + '…' : h.hotelName,
        'Doanh thu': Number(h.totalRevenue ?? 0),
        'Lượt đặt': h.completedBookings ?? 0,
      })),
    [topHotels]
  )

  const pieStatusData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Hoàn thành', value: summary.completedBookings },
      { name: 'Đã huỷ', value: summary.totalCancelled },
      { name: 'No-show', value: summary.totalNoShow },
    ].filter(d => d.value > 0)
  }, [summary])

  const hotelPieData = useMemo(
    () =>
      topHotels
        .filter(h => Number(h.totalRevenue) > 0)
        .map(h => ({ name: h.hotelName, value: Number(h.totalRevenue) })),
    [topHotels]
  )

  if (isLoading) {
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
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
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

          {filterMode === 'month' ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(Number(e.target.value))}
                className="text-sm text-gray-700 outline-none cursor-pointer bg-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <span className="text-gray-300">/</span>
              <select
                value={filterYear}
                onChange={e => setFilterYear(Number(e.target.value))}
                className="text-sm text-gray-700 outline-none cursor-pointer bg-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
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

      {/* ── PHẦN 1: TỔNG QUAN ── */}
      <Section label="Tổng quan hệ thống">
        {/* Summary cards — thêm totalHotels, totalUsers, totalBookings nếu có */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={CalendarCheck}
            label="Tổng lượt đặt"
            value={(summary?.completedBookings ?? 0).toLocaleString()}
            sub="Đã hoàn thành"
            color="blue"
          />
          <StatCard
            icon={TrendingUp}
            label="Tổng doanh thu"
            value={(summary?.totalRevenue ?? 0).toLocaleString('vi-VN') + ' ₫'}
            sub="Sau giảm giá"
            color="green"
          />
          <StatCard
            icon={XCircle}
            label="Đã huỷ"
            value={(summary?.totalCancelled ?? 0).toLocaleString()}
            sub="Booking bị huỷ"
            color="red"
          />
          <StatCard
            icon={EyeOff}
            label="No-show"
            value={(summary?.totalNoShow ?? 0).toLocaleString()}
            sub="Không đến nhận phòng"
            color="orange"
          />
        </div>

        {/* Admin-only stats nếu có */}
        {(dashboard?.totalHotels != null ||
          dashboard?.totalUsers != null ||
          dashboard?.totalBookings != null) && (
          <div className="grid grid-cols-3 gap-4">
            {dashboard.totalHotels != null && (
              <StatCard
                icon={Building2}
                label="Khách sạn"
                value={dashboard.totalHotels.toLocaleString()}
                sub="Đang hoạt động"
                color="purple"
              />
            )}
            {dashboard.totalUsers != null && (
              <StatCard
                icon={Users}
                label="Người dùng"
                value={dashboard.totalUsers.toLocaleString()}
                sub="Đã đăng ký"
                color="blue"
              />
            )}
            {dashboard.totalBookings != null && (
              <StatCard
                icon={Hotel}
                label="Tổng booking"
                value={dashboard.totalBookings.toLocaleString()}
                sub="Mọi trạng thái"
                color="gray"
              />
            )}
          </div>
        )}

        {/* Biểu đồ hàng 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickFormatter={v =>
                      v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v.toLocaleString()
                    }
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Doanh thu" radius={[4, 4, 0, 0]}>
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Tỷ lệ booking
              </h3>
              {pieStatusData.length === 0 ? (
                <EmptyChart small />
              ) : (
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie
                      data={pieStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieStatusData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={[PIE_COLORS[0], PIE_COLORS[1], PIE_COLORS[2]][i]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => [v ?? '—', '']} />
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

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Tỷ trọng doanh thu
              </h3>
              {hotelPieData.length === 0 ? (
                <EmptyChart small />
              ) : (
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie
                      data={hotelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {hotelPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={v => [
                        v !== undefined
                          ? Number(v).toLocaleString('vi-VN') + ' ₫'
                          : '—',
                        '',
                      ]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── PHẦN 2: BIỂU ĐỒ THEO NGÀY (chartData) ── */}
      <Section label="Biến động theo thời gian">
        {/* Area chart doanh thu */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            Biến động doanh thu theo ngày
          </h3>
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
                  tickFormatter={v =>
                    v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v.toLocaleString()
                  }
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

        {/* Bar chart booking/huỷ/no-show */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            Phân tích booking theo ngày
          </h3>
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
      </Section>

      {/* ── PHẦN 3: TOP HOTELS ── */}
      <Section label="Xếp hạng cơ sở">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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
                {topHotels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 italic text-sm">
                      Không có dữ liệu trong khoảng thời gian này
                    </td>
                  </tr>
                ) : (
                  topHotels.map((h, idx) => {
                    const revenue = Number(h.totalRevenue ?? 0)
                    const pct = grandRevenue > 0 ? ((revenue / grandRevenue) * 100).toFixed(1) : '0'
                    return (
                      <tr key={h.hotelId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-400 font-bold text-xs">{idx + 1}</td>
                        <td className="px-5 py-3">
                          <div className="font-bold text-gray-900">{h.hotelName}</div>
                        </td>
                        <td className="px-5 py-3 text-right font-medium">
                          {h.completedBookings}
                        </td>
                        <td className="px-5 py-3 text-right text-red-500 font-medium">
                          {h.totalCancelled}
                        </td>
                        <td className="px-5 py-3 text-right text-orange-500 font-medium">
                          {h.totalNoShow}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600">
                          {revenue.toLocaleString('vi-VN')}₫
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-semibold text-gray-500">{pct}%</span>
                            <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── PHẦN 4: RECENT BOOKINGS ── */}
      <Section label="Booking gần đây">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Booking gần đây</h2>
            <span className="text-xs text-gray-400">{recentBookings.length} giao dịch</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Mã booking</th>
                  <th className="text-left px-5 py-3">Khách</th>
                  <th className="text-left px-5 py-3">Khách sạn</th>
                  <th className="text-left px-5 py-3">Check-in</th>
                  <th className="text-left px-5 py-3">Check-out</th>
                  <th className="text-right px-5 py-3">Tổng tiền</th>
                  <th className="text-center px-5 py-3">Trạng thái</th>
                  <th className="text-center px-5 py-3">Thanh toán</th>
                  <th className="text-right px-5 py-3">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400 italic text-sm">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  recentBookings.map(b => (
                    <tr key={b.bookingId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-bold text-blue-600">
                          #{b.bookingCode}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{b.guestName}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-[160px] truncate">
                        {b.hotelName}
                      </td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(b.checkInDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(b.checkOutDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600">
                        {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            BOOKING_STATUS_COLORS[b.status] ?? 'text-gray-500 bg-gray-50 border-gray-200'
                          }`}
                        >
                          {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`text-xs font-semibold ${
                            PAYMENT_STATUS_COLORS[b.paymentStatus] ?? 'text-gray-400'
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[b.paymentStatus] ?? b.paymentStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                        {new Date(b.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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