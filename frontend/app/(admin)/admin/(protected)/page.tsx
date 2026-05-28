'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Hotel,
  CalendarCheck,
  Users,
  TrendingUp,
  XCircle,
  EyeOff,
  ArrowUpRight,
  BarChart3,
  ShieldAlert,
  Loader2,
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
import hotelApi, { HotelResponse, HotelStatus, PageResponse } from '@/lib/api/hotel.api'
import { BookingStatus } from '@/types/booking.types'
import { DashboardParams, RecentBookingResponse } from '@/types/statistic.types'

// ── Constants ──
const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b']

const BOOKING_STATUS_CONFIG: Record<string, { label: string; colorClass: string }> = {
  PENDING:    { label: 'Chờ xác nhận', colorClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  CONFIRMED:  { label: 'Đã xác nhận',  colorClass: 'text-blue-700 bg-blue-50 border-blue-200'   },
  CHECKED_IN: { label: 'Nhận phòng',   colorClass: 'text-purple-700 bg-purple-50 border-purple-200' },
  COMPLETED:  { label: 'Hoàn thành',   colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  CANCELLED:  { label: 'Đã huỷ',       colorClass: 'text-red-600 bg-red-50 border-red-200'       },
  NO_SHOW:    { label: 'No-show',      colorClass: 'text-gray-500 bg-gray-100 border-gray-200'   },
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Chờ TT',   color: 'text-amber-600'  },
  PAID:      { label: 'Đã TT',    color: 'text-emerald-600' },
  FAILED:    { label: 'Thất bại', color: 'text-red-500'    },
  REFUNDED:  { label: 'Hoàn tiền',color: 'text-blue-500'   },
  CANCELLED: { label: 'Đã huỷ',  color: 'text-gray-400'   },
}

// ── Helpers ──
function formatCurrency(val: number): string {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + ' tỷ ₫'
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' tr ₫'
  return val.toLocaleString('vi-VN') + ' ₫'
}

// ── Sub-components ──
interface TooltipPayloadItem { name: string; value: number; color: string }
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm min-w-[180px]">
      <p className="font-bold text-gray-500 mb-2 text-xs uppercase tracking-wide">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-gray-500 text-xs">{p.name}</span>
          </div>
          <span className="font-bold text-gray-900 text-xs">
            {p.name === 'Doanh thu' ? Number(p.value).toLocaleString('vi-VN') + '₫' : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  color: 'blue' | 'purple' | 'teal' | 'amber' | 'red' | 'orange'
  badge?: string
}

function StatCard({ icon: Icon, label, value, sub, color, badge }: StatCardProps) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-500',
    orange: 'bg-orange-50 text-orange-500',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
      {badge && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
          {badge}
        </span>
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}><Icon size={16} /></div>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <p className="text-[11px] text-gray-400 mt-1 font-medium">{sub}</p>
    </div>
  )
}

function EmptyChart({ small = false }: { small?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-gray-300 italic text-xs ${small ? 'h-[180px]' : 'h-40'}`}>
      Không có dữ liệu
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = BOOKING_STATUS_CONFIG[status] ?? { label: status, colorClass: 'text-gray-500 bg-gray-100 border-gray-200' }
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.colorClass}`}>
      {cfg.label}
    </span>
  )
}

// ── Main Page ──
export default function AdminDashboardPage() {
  // Filter state
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])

  const dashboardParams = useMemo((): DashboardParams => {
    if (filterMode === 'month') return { month: filterMonth, year: filterYear }
    return { fromDate, toDate }
  }, [filterMode, filterMonth, filterYear, fromDate, toDate])

  const filterKey = useMemo(
    () => filterMode === 'month' ? `${filterMonth}-${filterYear}` : `${fromDate}_${toDate}`,
    [filterMode, filterMonth, filterYear, fromDate, toDate]
  )

  // ── Export ──
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportRevenue(
        filterMode === 'month'
          ? { month: filterMonth, year: filterYear }
          : { fromDate, toDate }
      )
      toast.success('Xuất file thành công!')
    } catch {
      toast.error('Xuất file thất bại, vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

  // ── Single API call ──
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin-dashboard', filterKey],
    queryFn: () => statisticApi.getDashboard(dashboardParams).then(r => r.data),
  })

  // Pending hotels — cần call riêng vì getDashboard không trả về status breakdown
  const { data: hotelsData } = useQuery({
    queryKey: ['admin-hotels-pending'],
    queryFn: () => hotelApi.getAll(0, 100).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const pendingHotelsCount = useMemo(() => {
    if (!hotelsData) return 0
    const list = (hotelsData as PageResponse<HotelResponse>).content || []
    return list.filter(h => h.status === HotelStatus.PENDING).length
  }, [hotelsData])

  // Chart data
  const areaChartData = useMemo(() =>
    (dashboard?.chartData ?? []).map(d => ({
      date: new Date(d.statDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      'Doanh thu': Number(d.totalRevenue ?? 0),
      'Lượt đặt': d.completedBookings ?? 0,
      'Huỷ': d.totalCancelled ?? 0,
    })),
  [dashboard])

  const statusPieData = useMemo(() => {
    const s = dashboard?.summary
    if (!s) return []
    return [
      { name: 'Hoàn thành', value: s.completedBookings },
      { name: 'Đã huỷ',    value: s.totalCancelled   },
      { name: 'No-show',   value: s.totalNoShow       },
    ].filter(d => d.value > 0)
  }, [dashboard])

  const topHotels = dashboard?.topHotels ?? []
  const maxRevenue = Math.max(...topHotels.map(h => Number(h.totalRevenue ?? 0)), 1)
  const recentBookings: RecentBookingResponse[] = dashboard?.recentBookings ?? []
  const summary = dashboard?.summary

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 gap-3">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-sm">Đang tải dữ liệu hệ thống...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header + Filter ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản trị</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Hệ thống ghi nhận{' '}
            <span className="font-semibold text-gray-700">
              {(dashboard?.totalBookings ?? 0).toLocaleString()}
            </span>{' '}
            giao dịch
          </p>
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
                filterMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Theo tháng
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterMode === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
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
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="text-sm text-gray-700 outline-none cursor-pointer" />
              <span className="text-gray-400 text-sm">→</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="text-sm text-gray-700 outline-none cursor-pointer" />
            </div>
          )}
        </div>
      </div>

      {/* ── Pending alert ── */}
      {pendingHotelsCount > 0 && (
        <a
          href="/admin/hotels"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors"
        >
          <ShieldAlert size={18} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-amber-800">
              {pendingHotelsCount} khách sạn đang chờ duyệt
            </span>
            <p className="text-xs text-amber-600 mt-0.5">Nhấn để xem và xét duyệt</p>
          </div>
          <ArrowUpRight size={14} className="text-amber-600" />
        </a>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Building2} label="Khách sạn" color="blue"
          value={(dashboard?.totalHotels ?? 0).toLocaleString()}
          sub="Tổng cơ sở đăng ký"
          badge={pendingHotelsCount > 0 ? `${pendingHotelsCount} chờ duyệt` : undefined}
        />
        <StatCard
          icon={CalendarCheck} label="Đặt phòng" color="purple"
          value={(dashboard?.totalBookings ?? 0).toLocaleString()}
          sub={`${summary?.completedBookings ?? 0} đã hoàn thành`}
        />
        <StatCard
          icon={Users} label="Người dùng" color="teal"
          value={(dashboard?.totalUsers ?? 0).toLocaleString()}
          sub="Khách hàng & chủ sở hữu"
        />
        <StatCard
          icon={TrendingUp} label="Doanh thu" color="amber"
          value={formatCurrency(Number(summary?.totalRevenue ?? 0))}
          sub="Tổng doanh thu thực nhận"
        />
      </div>

      {/* ── Area chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 size={15} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-900">Biến động doanh thu & giao dịch</h2>
        </div>
        {areaChartData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={areaChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBooking" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <YAxis yAxisId="rev" orientation="left" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + 'M' : String(v)} />
              <YAxis yAxisId="bk" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<RevenueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area yAxisId="rev" type="monotone" dataKey="Doanh thu" stroke="#3b82f6" strokeWidth={2} fill="url(#gRevenue)" dot={false} />
              <Area yAxisId="bk" type="monotone" dataKey="Lượt đặt" stroke="#10b981" strokeWidth={2} fill="url(#gBooking)" dot={false} />
              <Area yAxisId="bk" type="monotone" dataKey="Huỷ" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Pie + Top Hotels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Tỷ lệ trạng thái đơn hàng</h2>
          <p className="text-xs text-gray-400 mb-4">Dựa trên kỳ lọc hiện tại</p>
          {statusPieData.length === 0 ? <EmptyChart small /> : (
            <>
              <div className="flex gap-4 mb-3 flex-wrap">
                {statusPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                    {d.name}: <span className="font-bold text-gray-700">{d.value}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                    {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Top Hotels */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Khách sạn tiêu biểu</h2>
          {topHotels.length === 0 ? <EmptyChart small /> : (
            <div className="space-y-4">
              {topHotels.map((h, i) => {
                const revenue = Number(h.totalRevenue ?? 0)
                const pct = (revenue / maxRevenue) * 100
                return (
                  <div key={h.hotelId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black text-gray-300 w-4 flex-shrink-0">#{i + 1}</span>
                        <p className="text-sm font-bold text-gray-800 truncate">{h.hotelName}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(revenue)}</p>
                        <p className="text-[10px] text-gray-400">
                          {h.completedBookings} đặt · {h.totalCancelled} huỷ · {h.totalNoShow} no-show
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Bookings ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Giao dịch gần đây</h2>
          <a href="/admin/bookings" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700">
            Xem tất cả <ArrowUpRight size={12} />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Mã</th>
                <th className="text-left px-5 py-3">Khách hàng</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Khách sạn</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Check-in</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Check-out</th>
                <th className="text-right px-5 py-3">Giá trị</th>
                <th className="text-center px-5 py-3">Trạng thái</th>
                <th className="text-center px-5 py-3 hidden sm:table-cell">Thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400 italic text-sm">
                    Không có giao dịch nào
                  </td>
                </tr>
              ) : (
                recentBookings.map(b => (
                  <tr key={b.bookingId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                      #{b.bookingCode}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900 text-xs">{b.guestName}</div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(b.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-500 max-w-[160px] truncate">
                      {b.hotelName}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-600 whitespace-nowrap">
                      {new Date(b.checkInDate).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-600 whitespace-nowrap">
                      {new Date(b.checkOutDate).toLocaleDateString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900 whitespace-nowrap text-xs">
                      {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3 text-center hidden sm:table-cell">
                      <span className={`text-xs font-semibold ${PAYMENT_STATUS_CONFIG[b.paymentStatus]?.color ?? 'text-gray-400'}`}>
                        {PAYMENT_STATUS_CONFIG[b.paymentStatus]?.label ?? b.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}