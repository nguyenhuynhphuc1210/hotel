'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    CalendarCheck, TrendingUp, XCircle, EyeOff,
    Loader2, BarChart3, Download, LayoutDashboard,
    Target, Calendar, ChevronDown, Users, Hotel,
} from 'lucide-react'
import { exportRevenue } from '@/lib/api/export.api'
import toast from 'react-hot-toast'
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, LineChart, Line,
} from 'recharts'
import type {
    TooltipProps,
} from 'recharts'
import statisticApi from '@/lib/api/statistic.api'
import { useOwnerHotel } from '../owner-hotel-context'
import type {
    DashboardParams,
    HotelStatisticSummaryResponse,
    DailyStatisticResponse,
    RecentBookingResponse,
} from '@/types/statistic.types'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────
type FilterMode = 'month' | 'range'
type StatColor = 'blue' | 'green' | 'red' | 'orange' | 'purple'

interface ChartDataPoint {
    date: string
    revenue: number
    bookings: number
    cancelled: number
}

interface PieDataPoint {
    name: string
    value: number
}

interface BarDataPoint {
    hotelName: string
    revenue: number
    bookings: number
    cancelled: number
}

// ── Constants ────────────────────────────────────────────
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e']

const BOOKING_STATUS_LABELS: Record<string, string> = {
    PENDING:    'Chờ xác nhận',
    CONFIRMED:  'Đã xác nhận',
    CHECKED_IN: 'Đã nhận phòng',
    COMPLETED:  'Hoàn thành',
    CANCELLED:  'Đã huỷ',
    NO_SHOW:    'No-show',
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
    PENDING:    'text-yellow-600 bg-yellow-50 border-yellow-200',
    CONFIRMED:  'text-blue-600 bg-blue-50 border-blue-200',
    COMPLETED:  'text-emerald-600 bg-emerald-50 border-emerald-200',
    CANCELLED:  'text-red-500 bg-red-50 border-red-200',
    NO_SHOW:    'text-gray-500 bg-gray-50 border-gray-200',
    CHECKED_IN: 'text-purple-600 bg-purple-50 border-purple-200',
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const YEARS  = Array.from({ length: 5 },  (_, i) => new Date().getFullYear() - i)

// ── Helpers ───────────────────────────────────────────────
function fmtMoney(v: number) {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B'
    if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + 'M'
    if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'K'
    return String(v)
}

// ── Custom Tooltip (typed properly) ──────────────────────
interface TooltipPayload {
    name?: string
    value?: number | string
    color?: string
}

interface CustomTooltipProps extends TooltipProps<number, string> {
    active?: boolean
    payload?: TooltipPayload[]
    label?: string
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm min-w-[160px]">
            <p className="font-bold text-gray-700 mb-2 text-xs">{label}</p>
            {payload.map((p, i) => {
                const name = p.name ?? ''
                const val  = Number(p.value ?? 0)
                const isRevenue = name === 'Doanh thu' || name === 'value' || name === 'revenue'
                return (
                    <div key={i} className="flex items-center justify-between gap-4 mb-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                            <span className="text-gray-500 text-xs">{name === 'value' ? 'Doanh thu' : name}</span>
                        </div>
                        <span className="font-semibold text-gray-900 text-xs">
                            {isRevenue ? val.toLocaleString('vi-VN') + '₫' : val}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

// ── StatCard ──────────────────────────────────────────────
interface StatCardProps {
    icon: React.ComponentType<{ size?: number; className?: string }>
    label: string
    value: string
    sub: string
    color: StatColor
    trend?: number
}

function StatCard({ icon: Icon, label, value, sub, color, trend }: StatCardProps) {
    const colorMap: Record<StatColor, string> = {
        blue:   'bg-blue-50 text-blue-600 border-blue-100',
        green:  'bg-emerald-50 text-emerald-600 border-emerald-100',
        red:    'bg-red-50 text-red-500 border-red-100',
        orange: 'bg-orange-50 text-orange-500 border-orange-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
    }
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                <div className={cn('p-2 rounded-xl border transition-transform group-hover:scale-110', colorMap[color])}>
                    <Icon size={18} />
                </div>
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
            <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-medium text-gray-400">{sub}</p>
                {trend !== undefined && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
        </div>
    )
}

// ── RecentBookingCard ─────────────────────────────────────
function RecentBookingCard({ booking: b }: { booking: RecentBookingResponse }) {
    return (
        <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:shadow-sm transition-all">
            <div className="flex justify-between items-start mb-1.5">
                <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    #{b.bookingCode}
                </span>
                <span className={cn(
                    'text-[9px] font-black uppercase px-2 py-0.5 rounded-full border',
                    BOOKING_STATUS_COLORS[b.status] ?? 'text-gray-500 bg-gray-50 border-gray-200'
                )}>
                    {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                </span>
            </div>
            <p className="text-xs font-bold text-gray-900">{b.guestName}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-emerald-600 font-bold">
                    {Number(b.totalAmount).toLocaleString('vi-VN')}₫
                </p>
                <p className="text-[10px] text-gray-400">
                    {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                </p>
            </div>
        </div>
    )
}

// ── Section Header ────────────────────────────────────────
function SectionHeader({
    color, icon: Icon, title, onExport, isExporting,
}: {
    color: 'blue' | 'emerald'
    icon: React.ComponentType<{ size?: number; className?: string }>
    title: string
    onExport: () => void
    isExporting: boolean
}) {
    const btnCls = color === 'blue'
        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
        : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
    return (
        <div className="flex items-center gap-2">
            <div className={cn('w-1 h-6 rounded-full', color === 'blue' ? 'bg-blue-600' : 'bg-emerald-500')} />
            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Icon size={18} className={color === 'blue' ? 'text-blue-600' : 'text-emerald-500'} />
                {title}
            </h2>
            <button
                onClick={onExport}
                disabled={isExporting}
                className={cn('ml-auto text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50', btnCls)}
            >
                {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Xuất Excel
            </button>
        </div>
    )
}

// ── DateFilter ────────────────────────────────────────────
function DateFilter({
    mode, month, year, fromDate, toDate,
    onModeChange, onMonthChange, onYearChange, onFromChange, onToChange,
}: {
    mode: FilterMode
    month: number
    year: number
    fromDate: string
    toDate: string
    onModeChange: (m: FilterMode) => void
    onMonthChange: (v: number) => void
    onYearChange: (v: number) => void
    onFromChange: (v: string) => void
    onToChange: (v: string) => void
}) {
    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['month', 'range'] as FilterMode[]).map(m => (
                    <button key={m} onClick={() => onModeChange(m)}
                        className={cn('px-4 py-2 text-xs font-bold rounded-lg transition-all', mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400')}>
                        {m === 'month' ? 'Theo tháng' : 'Khoảng ngày'}
                    </button>
                ))}
            </div>

            {mode === 'month' ? (
                <div className="flex items-center gap-2">
                    {[
                        { items: MONTHS, value: month, onChange: onMonthChange, label: (v: number) => `Tháng ${v}` },
                        { items: YEARS,  value: year,  onChange: onYearChange,  label: (v: number) => String(v) },
                    ].map((sel, i) => (
                        <div key={i} className="relative">
                            <select value={sel.value} onChange={e => sel.onChange(Number(e.target.value))}
                                className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer">
                                {sel.items.map(v => <option key={v} value={v}>{sel.label(v)}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    {[
                        { value: fromDate, onChange: onFromChange },
                        { value: toDate,   onChange: onToChange },
                    ].map((inp, i) => (
                        <div key={i} className="relative">
                            {i === 1 && <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">→</span>}
                            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input type="date" value={inp.value} onChange={e => inp.onChange(e.target.value)}
                                className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────
export default function OwnerDashboardPage() {
    const { activeHotelId, activeHotel } = useOwnerHotel()

    const [filterMode, setFilterMode] = useState<FilterMode>('month')
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
    const [filterYear,  setFilterYear]  = useState(new Date().getFullYear())
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
    })
    const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0])

    const commonParams = useMemo<DashboardParams>(() => (
        filterMode === 'month'
            ? { month: filterMonth, year: filterYear }
            : { fromDate, toDate }
    ), [filterMode, filterMonth, filterYear, fromDate, toDate])

    const { data: globalData, isLoading: isGlobalLoading } = useQuery({
        queryKey: ['owner-dashboard-global', commonParams],
        queryFn: () => statisticApi.getDashboard(commonParams).then(r => r.data),
    })

    const { data: localData, isLoading: isLocalLoading } = useQuery({
        queryKey: ['owner-dashboard-local', activeHotelId, commonParams],
        queryFn: () => statisticApi.getDashboard({ ...commonParams, hotelId: activeHotelId! }).then(r => r.data),
        enabled: !!activeHotelId,
    })

    const [isExporting, setIsExporting] = useState(false)
    const handleExport = async (isGlobal: boolean) => {
        if (isExporting) return
        setIsExporting(true)
        try {
            await exportRevenue({ ...commonParams, hotelId: isGlobal ? undefined : (activeHotelId ?? undefined) })
            toast.success('Xuất file thành công!')
        } catch {
            toast.error('Có lỗi xảy ra khi xuất file')
        } finally { setIsExporting(false) }
    }

    // ── Processed chart data ──────────────────────────────
    const hotelPieData = useMemo<PieDataPoint[]>(() =>
        (globalData?.topHotels ?? [])
            .filter((h: HotelStatisticSummaryResponse) => Number(h.totalRevenue) > 0)
            .map((h: HotelStatisticSummaryResponse) => ({ name: h.hotelName, value: Number(h.totalRevenue) })),
        [globalData]
    )

    const barData = useMemo<BarDataPoint[]>(() =>
        (globalData?.topHotels ?? []).map((h: HotelStatisticSummaryResponse) => ({
            hotelName: h.hotelName.length > 14 ? h.hotelName.slice(0, 14) + '…' : h.hotelName,
            revenue:   Number(h.totalRevenue ?? 0),
            bookings:  Number(h.completedBookings ?? 0),
            cancelled: Number(h.totalCancelled ?? 0),
        })),
        [globalData]
    )

    const areaChartData = useMemo<ChartDataPoint[]>(() =>
        (localData?.chartData ?? []).map((s: DailyStatisticResponse) => ({
            date:      new Date(s.statDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            revenue:   Number(s.totalRevenue ?? 0),
            bookings:  Number(s.completedBookings ?? 0),
            cancelled: Number(s.totalCancelled ?? 0),
        })),
        [localData]
    )

    // ── Cancel rate line data ─────────────────────────────
    const cancelRateData = useMemo(() =>
        areaChartData.map(d => ({
            date: d.date,
            'Tỉ lệ huỷ (%)': d.bookings + d.cancelled > 0
                ? Math.round((d.cancelled / (d.bookings + d.cancelled)) * 100)
                : 0,
        })),
        [areaChartData]
    )

    if (isGlobalLoading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={36} />
            <p className="text-gray-400 text-sm font-medium animate-pulse">Đang tổng hợp dữ liệu...</p>
        </div>
    )

    const gs = globalData?.summary
    const ls = localData?.summary

    return (
        <div className="space-y-10 pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Thống kê kinh doanh</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Báo cáo hiệu suất từ các cơ sở lưu trú</p>
                </div>
                <DateFilter
                    mode={filterMode} month={filterMonth} year={filterYear}
                    fromDate={fromDate} toDate={toDate}
                    onModeChange={setFilterMode} onMonthChange={setFilterMonth}
                    onYearChange={setFilterYear} onFromChange={setFromDate} onToChange={setToDate}
                />
            </div>

            {/* ══════════ SECTION 1: TOÀN HỆ THỐNG ══════════ */}
            <div className="space-y-5">
                <SectionHeader
                    color="blue" icon={LayoutDashboard}
                    title="Toàn bộ hệ thống"
                    onExport={() => handleExport(true)}
                    isExporting={isExporting}
                />

                {/* Global stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={TrendingUp}    color="green"  label="Tổng doanh thu" value={Number(gs?.totalRevenue ?? 0).toLocaleString('vi-VN') + '₫'} sub="Toàn bộ cơ sở" />
                    <StatCard icon={CalendarCheck} color="blue"   label="Đã hoàn thành"  value={Number(gs?.completedBookings ?? 0).toLocaleString()} sub="Booking thành công" />
                    <StatCard icon={XCircle}       color="red"    label="Đã huỷ"          value={Number(gs?.totalCancelled ?? 0).toLocaleString()} sub="Tất cả KS" />
                    <StatCard icon={EyeOff}        color="orange" label="No-show"          value={Number(gs?.totalNoShow ?? 0).toLocaleString()} sub="Tất cả KS" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Bar chart: so sánh KS */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <BarChart3 size={16} className="text-blue-500" /> So sánh doanh thu theo cơ sở
                        </h3>
                        <p className="text-xs text-gray-400 mb-5">Doanh thu & số lượt đặt phòng thành công</p>
                        {barData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center text-xs text-gray-400 italic">Chưa có dữ liệu</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={barData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="hotelName" tick={{ fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="rev" orientation="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtMoney} />
                                    <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                                    <Tooltip content={<RevenueTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                                    <Bar yAxisId="rev" dataKey="revenue"  name="Doanh thu" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {barData.map((_: BarDataPoint, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Bar>
                                    <Bar yAxisId="cnt" dataKey="bookings" name="Lượt đặt" radius={[4, 4, 0, 0]} fill="#8f9193" maxBarSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Pie chart */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">Tỷ trọng doanh thu</h3>
                        <p className="text-xs text-gray-400 mb-4">Phân bổ theo từng cơ sở</p>
                        {hotelPieData.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">Chưa có dữ liệu</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={hotelPieData} innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value" strokeWidth={0}>
                                            {hotelPieData.map((_: PieDataPoint, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<RevenueTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Custom legend */}
                                <div className="space-y-2 mt-2">
                                    {hotelPieData.map((d: PieDataPoint, i: number) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                <span className="text-gray-600 truncate">{d.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-800 shrink-0 ml-2">{fmtMoney(d.value)}₫</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════ SECTION 2: CHI TIẾT KS ĐANG CHỌN ══════════ */}
            <div className="space-y-5 pt-6 border-t border-dashed border-gray-200">
                <SectionHeader
                    color="emerald"
                    icon={Target}
                    title={`Chi tiết: ${activeHotel?.hotelName ?? 'Đang chọn...'}`}
                    onExport={() => handleExport(false)}
                    isExporting={isExporting}
                />

                {/* Local stats */}
                {!isLocalLoading && ls && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={TrendingUp}    color="green"  label="Doanh thu KS"  value={Number(ls.totalRevenue ?? 0).toLocaleString('vi-VN') + '₫'} sub={activeHotel?.hotelName ?? ''} />
                        <StatCard icon={CalendarCheck} color="blue"   label="Hoàn thành"    value={Number(ls.completedBookings ?? 0).toLocaleString()} sub="Booking" />
                        <StatCard icon={XCircle}       color="red"    label="Đã huỷ"         value={Number(ls.totalCancelled ?? 0).toLocaleString()} sub="Phòng" />
                        <StatCard icon={EyeOff}        color="orange" label="No-show"         value={Number(ls.totalNoShow ?? 0).toLocaleString()} sub="Không đến" />
                    </div>
                )}

                {isLocalLoading ? (
                    <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-gray-100">
                        <Loader2 className="animate-spin text-blue-400 mr-2" size={18} />
                        <span className="text-sm text-gray-400">Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Row 1: Area chart + Recent bookings */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-1">
                                    Biến động doanh thu
                                    {filterMode === 'month' ? ` — Tháng ${filterMonth}/${filterYear}` : ` (${fromDate} → ${toDate})`}
                                </h3>
                                <p className="text-xs text-gray-400 mb-5">Doanh thu theo từng ngày trong kỳ</p>
                                {areaChartData.length === 0 ? (
                                    <div className="h-64 flex items-center justify-center text-xs text-gray-400 italic">Chưa có dữ liệu</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <AreaChart data={areaChartData}>
                                            <defs>
                                                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtMoney} />
                                            <Tooltip content={<RevenueTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRev)" dot={false} activeDot={{ r: 4 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Booking gần đây</h3>
                                <p className="text-xs text-gray-400 mb-4">Giao dịch mới nhất của cơ sở</p>
                                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                                    {(localData?.recentBookings ?? []).length === 0 ? (
                                        <p className="text-center py-10 text-xs text-gray-400 italic">Chưa có giao dịch</p>
                                    ) : (
                                        (localData?.recentBookings ?? []).map((b: RecentBookingResponse) => (
                                            <RecentBookingCard key={b.bookingId} booking={b} />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Booking count + Cancel rate */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Bar: số lượt đặt & huỷ theo ngày */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Lượt đặt & Huỷ phòng</h3>
                                <p className="text-xs text-gray-400 mb-5">Theo từng ngày trong kỳ</p>
                                {areaChartData.length === 0 ? (
                                    <div className="h-52 flex items-center justify-center text-xs text-gray-400 italic">Chưa có dữ liệu</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={areaChartData} barGap={2}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
                                            <Tooltip content={<RevenueTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Bar dataKey="bookings"  name="Hoàn thành" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                            <Bar dataKey="cancelled" name="Đã huỷ"     fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Line: tỉ lệ huỷ */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Tỉ lệ huỷ phòng (%)</h3>
                                <p className="text-xs text-gray-400 mb-5">Xu hướng theo ngày — mục tiêu dưới 15%</p>
                                {cancelRateData.length === 0 ? (
                                    <div className="h-52 flex items-center justify-center text-xs text-gray-400 italic">Chưa có dữ liệu</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart data={cancelRateData}>
                                            <defs>
                                                <linearGradient id="gradCancel" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={30} domain={[0, 100]} unit="%" />
                                            <Tooltip content={<RevenueTooltip />} />
                                            <Line type="monotone" dataKey="Tỉ lệ huỷ (%)" stroke="#f87171" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}