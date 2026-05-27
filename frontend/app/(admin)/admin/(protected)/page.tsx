'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Hotel,
  CalendarCheck,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  BarChart3,
  ShieldAlert,
  Eye,
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
import hotelApi, { HotelResponse, HotelStatus, PageResponse } from '@/lib/api/hotel.api'
import bookingApi from '@/lib/api/booking.api'
import userApi from '@/lib/api/user.api'
import { BookingResponse } from '@/types/booking.types'
import { UserResponse } from '@/types/auth.types'

// ── Types ──
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

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const
type BookingStatus = (typeof BOOKING_STATUSES)[number]

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string; chartColor: string }> = {
  PENDING:   { label: 'Chờ xác nhận', color: 'text-amber-600',  bg: 'bg-amber-50',  chartColor: '#f59e0b' },
  CONFIRMED: { label: 'Đã xác nhận',  color: 'text-blue-600',   bg: 'bg-blue-50',   chartColor: '#3b82f6' },
  COMPLETED: { label: 'Hoàn thành',   color: 'text-emerald-600',bg: 'bg-emerald-50',chartColor: '#10b981' },
  CANCELLED: { label: 'Đã huỷ',       color: 'text-red-500',    bg: 'bg-red-50',    chartColor: '#ef4444' },
  NO_SHOW:   { label: 'No-show',      color: 'text-gray-500',   bg: 'bg-gray-100',  chartColor: '#6b7280' },
}

// ── Custom Tooltip ──
function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm min-w-[160px]">
      <p className="font-bold text-gray-600 mb-2 text-xs uppercase tracking-wide">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-gray-500 text-xs">{p.name}</span>
          </div>
          <span className="font-bold text-gray-900 text-xs">
            {p.name === 'Doanh thu'
              ? Number(p.value).toLocaleString('vi-VN') + '₫'
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [revenueRange, setRevenueRange] = useState<7 | 30>(30)

  // ── Data fetching ──
  const { data: hotelsData } = useQuery({
    queryKey: ['admin-hotels-all'],
    queryFn: () => hotelApi.getAll(0, 200).then(r => r.data),
  })
  const { data: bookingsData } = useQuery({
    queryKey: ['admin-bookings-all'],
    queryFn: () => bookingApi.getAll().then(r => r.data),
  })
  const { data: usersData } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => userApi.getAll().then(r => r.data),
  })

  // ── Data extraction ──
  const hotelList = useMemo((): HotelResponse[] => {
    if (!hotelsData) return []
    return Array.isArray(hotelsData) ? hotelsData : (hotelsData as PageResponse<HotelResponse>).content || []
  }, [hotelsData])

  const bookingList = useMemo((): BookingResponse[] => {
    if (!bookingsData) return []
    const raw = bookingsData as unknown as PageResponse<BookingResponse>
    return raw.content || []
  }, [bookingsData])

  const userList = useMemo((): UserResponse[] => {
    if (!usersData) return []
    const raw = usersData as unknown as PageResponse<UserResponse>
    return raw.content || []
  }, [usersData])

  // ── Computed stats ──
  const totalRevenue = useMemo(
    () => bookingList.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
    [bookingList]
  )

  const pendingHotels  = hotelList.filter(h => h.status === HotelStatus.PENDING).length
  const activeHotels   = hotelList.filter(h => h.status === HotelStatus.APPROVED).length
  const totalCustomers = userList.filter(u => u.roleName === 'ROLE_USER').length
  const totalOwners    = userList.filter(u => u.roleName === 'ROLE_HOTEL_OWNER').length

  const bookingByStatus = useMemo(() =>
    BOOKING_STATUSES.reduce((acc, s) => {
      acc[s] = bookingList.filter(b => b.status === s).length
      return acc
    }, {} as Record<BookingStatus, number>),
    [bookingList]
  )

  // ── Chart: revenue & bookings by date (last N days) ──
  const revenueChartData = useMemo(() => {
    const days = revenueRange
    const result: { date: string; 'Doanh thu': number; 'Lượt đặt': number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      const dayBookings = bookingList.filter(b => b.createdAt?.startsWith(key))
      result.push({
        date: label,
        'Doanh thu': dayBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + Number(b.totalAmount || 0), 0),
        'Lượt đặt': dayBookings.length,
      })
    }
    return result
  }, [bookingList, revenueRange])

  // ── Chart: booking status pie ──
  const statusPieData = useMemo(() =>
    BOOKING_STATUSES
      .filter(s => bookingByStatus[s] > 0)
      .map(s => ({ name: STATUS_CONFIG[s].label, value: bookingByStatus[s], color: STATUS_CONFIG[s].chartColor })),
    [bookingByStatus]
  )

  // ── Chart: hotel status bar ──
  const hotelStatusData = useMemo(() => [
    { name: 'Hoạt động', value: activeHotels,  fill: '#10b981' },
    { name: 'Chờ duyệt', value: pendingHotels, fill: '#f59e0b' },
    { name: 'Tạm khóa',  value: hotelList.filter(h => h.status === HotelStatus.SUSPENDED).length, fill: '#ef4444' },
    { name: 'Từ chối',   value: hotelList.filter(h => h.status === HotelStatus.REJECTED).length,  fill: '#6b7280' },
  ].filter(d => d.value > 0), [hotelList, activeHotels, pendingHotels])

  // ── Chart: new users by role ──
  const userRoleData = useMemo(() => [
    { name: 'Khách hàng', value: totalCustomers, fill: '#3b82f6' },
    { name: 'Chủ KS',     value: totalOwners,    fill: '#8b5cf6' },
    { name: 'Admin',      value: userList.filter(u => u.roleName === 'ROLE_ADMIN').length, fill: '#f59e0b' },
  ].filter(d => d.value > 0), [userList, totalCustomers, totalOwners])

  const recentBookings = bookingList.slice(0, 8)
  const pendingHotelList = hotelList.filter(h => h.status === HotelStatus.PENDING).slice(0, 6)

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản trị</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Hệ thống ghi nhận <span className="font-semibold text-gray-700">{bookingList.length.toLocaleString()}</span> giao dịch
          </p>
        </div>
        {pendingHotels > 0 && (
          <a
            href="/admin/hotels"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <ShieldAlert size={14} />
            {pendingHotels} KS chờ duyệt
          </a>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Hotel} label="Khách sạn" color="blue"
          value={hotelList.length.toLocaleString()}
          sub={`${activeHotels} hoạt động · ${pendingHotels} chờ duyệt`}
        />
        <StatCard
          icon={CalendarCheck} label="Đặt phòng" color="purple"
          value={bookingList.length.toLocaleString()}
          sub={`${bookingByStatus.PENDING} chờ · ${bookingByStatus.COMPLETED} hoàn thành`}
        />
        <StatCard
          icon={Users} label="Người dùng" color="teal"
          value={userList.length.toLocaleString()}
          sub={`${totalCustomers} khách · ${totalOwners} chủ KS`}
        />
        <StatCard
          icon={TrendingUp} label="Doanh thu" color="amber"
          value={totalRevenue >= 1_000_000_000
            ? (totalRevenue / 1_000_000_000).toFixed(2) + ' tỷ ₫'
            : totalRevenue >= 1_000_000
              ? (totalRevenue / 1_000_000).toFixed(1) + ' tr ₫'
              : totalRevenue.toLocaleString('vi-VN') + ' ₫'}
          sub="Từ booking hoàn thành"
        />
      </div>

      {/* ── Revenue Area Chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900">Biến động doanh thu & giao dịch</h2>
          </div>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
            {([7, 30] as const).map(n => (
              <button
                key={n}
                onClick={() => setRevenueRange(n)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  revenueRange === n ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {n} ngày
              </button>
            ))}
          </div>
        </div>
        {revenueChartData.every(d => d['Doanh thu'] === 0 && d['Lượt đặt'] === 0) ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBooking" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <YAxis
                yAxisId="rev" orientation="left"
                tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + 'M' : String(v)}
              />
              <YAxis
                yAxisId="bk" orientation="right"
                tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<RevenueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area yAxisId="rev" type="monotone" dataKey="Doanh thu"
                stroke="#3b82f6" strokeWidth={2} fill="url(#gRevenue)"
                dot={false} activeDot={{ r: 4 }} />
              <Area yAxisId="bk" type="monotone" dataKey="Lượt đặt"
                stroke="#10b981" strokeWidth={2} fill="url(#gBooking)"
                dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 2: Pie charts + Hotel status bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Booking status pie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Tỷ lệ booking</h2>
          <p className="text-xs text-gray-400 mb-4">Phân bổ theo trạng thái</p>
          {statusPieData.length === 0 ? <EmptyChart small /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="45%" innerRadius={50} outerRadius={78}
                  dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                  {statusPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [v ?? '—', '']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}
                  formatter={(v, e: { payload?: { value?: number } }) => `${v}: ${e.payload?.value ?? 0}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hotel status bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Trạng thái khách sạn</h2>
          <p className="text-xs text-gray-400 mb-4">Tổng {hotelList.length} cơ sở</p>
          {hotelStatusData.length === 0 ? <EmptyChart small /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hotelStatusData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip formatter={(v) => [v ?? 0, 'Số lượng']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {hotelStatusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* User role pie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Phân bổ người dùng</h2>
          <p className="text-xs text-gray-400 mb-4">Tổng {userList.length} tài khoản</p>
          {userRoleData.length === 0 ? <EmptyChart small /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={userRoleData} cx="50%" cy="45%" innerRadius={50} outerRadius={78}
                  dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                  {userRoleData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => [v ?? '—', '']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}
                  formatter={(v, e: { payload?: { value?: number } }) => `${v}: ${e.payload?.value ?? 0}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3: Booking status list + Pending hotels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking status breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Chi tiết trạng thái đặt phòng</h2>
          <div className="space-y-2">
            {BOOKING_STATUSES.map(s => {
              const count = bookingByStatus[s]
              const pct = bookingList.length > 0 ? ((count / bookingList.length) * 100).toFixed(0) : '0'
              const cfg = STATUS_CONFIG[s]
              return (
                <div key={s} className="flex items-center gap-3 py-2">
                  <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                    {s === 'PENDING'   && <Clock       size={13} className={cfg.color} />}
                    {s === 'CONFIRMED' && <CheckCircle size={13} className={cfg.color} />}
                    {s === 'COMPLETED' && <CheckCircle size={13} className={cfg.color} />}
                    {s === 'CANCELLED' && <XCircle     size={13} className={cfg.color} />}
                    {s === 'NO_SHOW'   && <Eye         size={13} className={cfg.color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                      <span className="text-xs font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.chartColor }} />
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending hotel approval queue */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Khách sạn chờ duyệt</h2>
            {pendingHotels > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                {pendingHotels} yêu cầu
              </span>
            )}
          </div>
          {pendingHotelList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-2">
              <CheckCircle size={36} className="text-emerald-200" />
              <p className="text-sm italic text-gray-400">Hệ thống đã xử lý hết yêu cầu</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingHotelList.map(hotel => (
                <div key={hotel.id}
                  className="flex items-center justify-between py-2.5 px-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg transition-colors group">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-900 truncate">{hotel.hotelName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{hotel.district} · {hotel.city} · {hotel.ownerName}</div>
                  </div>
                  <a
                    href={`/admin/hotels/${hotel.id}/edit`}
                    className="ml-3 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Xem xét <ArrowUpRight size={11} />
                  </a>
                </div>
              ))}
              {pendingHotels > 6 && (
                <a href="/admin/hotels"
                  className="block text-center text-xs font-bold text-blue-600 hover:text-blue-800 pt-3">
                  + {pendingHotels - 6} khách sạn khác
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Bookings Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Giao dịch gần đây</h2>
          <a href="/admin/bookings"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
            Xem tất cả <ArrowUpRight size={11} />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Mã</th>
                <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Khách hàng</th>
                <th className="text-left pb-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell">Khách sạn</th>
                <th className="text-right pb-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Giá trị</th>
                <th className="text-right pb-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 italic text-sm">
                    Chưa có giao dịch nào được ghi nhận
                  </td>
                </tr>
              ) : (
                recentBookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs font-bold text-blue-600">{b.bookingCode}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-gray-900 text-sm">{b.guestName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{b.guestEmail}</div>
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <span className="text-xs text-gray-600">{b.hotelName}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                      </span> 
                    </td>
                    <td className="py-3 text-right">
                      <StatusBadge status={b.status} />
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

// ── Helper Components ──

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  color: 'blue' | 'purple' | 'teal' | 'amber'
}) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
    amber:  'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={17} />
        </div>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1 font-medium">{sub}</div>
    </div>
  )
}

function EmptyChart({ small = false }: { small?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-gray-300 italic text-sm ${small ? 'h-[200px]' : 'h-40'}`}>
      Không có dữ liệu
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as BookingStatus] ?? {
    label: status,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  }
  return (
    <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}