'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  Loader2,
  Building2,
  Download,
  ShieldAlert,
  ArrowUpRight,
  CalendarCheck,
  Users,
  BadgeDollarSign,
  Percent,
  ArrowRight,
} from 'lucide-react'
import { exportRevenue } from '@/lib/api/export.api'
import toast from 'react-hot-toast'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import statisticApi from '@/lib/api/statistic.api'
import hotelApi, { HotelResponse, HotelStatus, PageResponse } from '@/lib/api/hotel.api'
import { DashboardParams, RecentBookingResponse } from '@/types/statistic.types'

// ── Constants ──────────────────────────────────────────────────────────────────
const BOOKING_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Chờ xác nhận', bg: '#FFF7ED', text: '#C2410C' },
  CONFIRMED: { label: 'Đã xác nhận', bg: '#EFF6FF', text: '#1D4ED8' },
  CHECKED_IN: { label: 'Nhận phòng', bg: '#F5F3FF', text: '#7C3AED' },
  COMPLETED: { label: 'Hoàn thành', bg: '#ECFDF5', text: '#065F46' },
  CANCELLED: { label: 'Đã huỷ', bg: '#FEF2F2', text: '#B91C1C' },
  NO_SHOW: { label: 'No-show', bg: '#F9FAFB', text: '#6B7280' },
}

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  UNPAID: { label: 'Chưa TT', color: '#9CA3AF' },
  PENDING: { label: 'Chờ TT', color: '#D97706' },
  PAID: { label: 'Đã TT', color: '#059669' },
  FAILED: { label: 'Thất bại', color: '#DC2626' },
  REFUNDED: { label: 'Hoàn tiền', color: '#2563EB' },
  CANCELLED: { label: 'Đã huỷ', color: '#EF4444' },
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit = '₫', sub, accent, icon: Icon, badge,
}: {
  label: string; value: string; unit?: string; sub: string
  accent: string; icon: React.ElementType; badge?: string
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: 16,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />

      {badge && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          fontSize: 10, fontWeight: 700,
          background: '#FEF3C7', color: '#92400E',
          border: '1px solid #FCD34D',
          borderRadius: 999, padding: '2px 8px',
        }}>{badge}</span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#9CA3AF', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accent} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</span>
        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{unit}</span>
      </div>

      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, fontWeight: 500 }}>{sub}</p>
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
interface TooltipEntry {
  name: string
  value: number
  color: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontWeight: 700, color: '#374151', marginBottom: 6, fontSize: 11 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#6B7280', fontSize: 11 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 11 }}>
            {['Doanh thu', 'Hoa hồng', 'Lợi nhuận', 'Tài trợ'].includes(p.name)
              ? Number(p.value).toLocaleString('vi-VN') + '₫'
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = BOOKING_STATUS_CONFIG[status] ?? { label: status, bg: '#F9FAFB', text: '#6B7280' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
      background: cfg.bg, color: cfg.text,
    }}>{cfg.label}</span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isExporting, setIsExporting] = useState(false)

  const dashboardParams = useMemo((): DashboardParams => (
    filterMode === 'month' ? { month: filterMonth, year: filterYear } : { fromDate, toDate }
  ), [filterMode, filterMonth, filterYear, fromDate, toDate])

  const filterKey = useMemo(() =>
    filterMode === 'month' ? `${filterMonth}-${filterYear}` : `${fromDate}_${toDate}`,
    [filterMode, filterMonth, filterYear, fromDate, toDate])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportRevenue(filterMode === 'month' ? { month: filterMonth, year: filterYear } : { fromDate, toDate })
      toast.success('Xuất file thành công!')
    } catch { toast.error('Xuất file thất bại.') }
    finally { setIsExporting(false) }
  }

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin-dashboard', filterKey],
    queryFn: () => statisticApi.getDashboard(dashboardParams).then(r => r.data),
  })

  const { data: hotelsData } = useQuery({
    queryKey: ['admin-hotels-pending'],
    queryFn: () => hotelApi.getAll(0, 100).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const pendingHotelsCount = useMemo(() => {
    if (!hotelsData) return 0
    return ((hotelsData as PageResponse<HotelResponse>).content || []).filter(h => h.status === HotelStatus.PENDING).length
  }, [hotelsData])

  // Chart data — now includes commission lanes
  const areaData = useMemo(() =>
  (dashboard?.chartData ?? []).map(d => ({
    date: new Date(d.statDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    'Doanh thu': Number(d.grossRevenue ?? 0),
    'Hoa hồng':  Number(d.totalCommission ?? 0),
    'Tài trợ':   Number(d.systemSponsorAmount ?? 0),
    'Lợi nhuận': Number(d.totalCommission ?? 0) - Number(d.systemSponsorAmount ?? 0),
    'Lượt đặt':  d.completedBookings ?? 0,
    'Huỷ':       d.totalCancelled ?? 0,
  })),
  [dashboard])

  const pieData = useMemo(() => {
    const s = dashboard?.summary
    if (!s) return []
    return [
      { name: 'Hoàn thành', value: s.completedBookings, fill: '#10B981' },
      { name: 'Đã huỷ', value: s.totalCancelled, fill: '#EF4444' },
      { name: 'No-show', value: s.totalNoShow, fill: '#F59E0B' },
    ].filter(d => d.value > 0)
  }, [dashboard])

  const topHotels = dashboard?.topHotels ?? []
  const maxRev = Math.max(...topHotels.map(h => Number(h.grossRevenue ?? 0)), 1)
  const recentBookings: RecentBookingResponse[] = dashboard?.recentBookings ?? []
  const summary = dashboard?.summary

  if (isLoading) return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, color: '#9CA3AF' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={28} />
        <p style={{ fontSize: 13 }}>Đang tải dữ liệu...</p>
      </div>
    </>
  )

  return (
    <div style={{ padding: '24px 28px', background: '#F8FAFC', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            {filterMode === 'month' ? `Tháng ${filterMonth}/${filterYear}` : `${fromDate} → ${toDate}`}
            {' · '}
            <span style={{ fontWeight: 700, color: '#374151' }}>{(dashboard?.totalBookings ?? 0).toLocaleString()}</span> giao dịch
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* filter mode toggle */}
          <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: 10, padding: 3 }}>
            {(['month', 'range'] as const).map(m => (
              <button key={m} onClick={() => setFilterMode(m)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s',
                background: filterMode === m ? '#fff' : 'transparent',
                color: filterMode === m ? '#1E40AF' : '#64748B',
                boxShadow: filterMode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
                {m === 'month' ? 'Theo tháng' : 'Khoảng ngày'}
              </button>
            ))}
          </div>

          {/* filter inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px 12px' }}>
            {filterMode === 'month' ? (
              <>
                <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', cursor: 'pointer', background: 'transparent' }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <span style={{ color: '#CBD5E1' }}>/</span>
                <select value={filterYear} onChange={e => setFilterYear(+e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', cursor: 'pointer', background: 'transparent' }}>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            ) : (
              <>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', cursor: 'pointer', background: 'transparent' }} />
                <ArrowRight size={12} color="#9CA3AF" />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', cursor: 'pointer', background: 'transparent' }} />
              </>
            )}
          </div>

          <button onClick={handleExport} disabled={isExporting} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: '#059669', color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: isExporting ? 'not-allowed' : 'pointer',
            opacity: isExporting ? 0.7 : 1,
          }}>
            {isExporting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* ── Pending alert ── */}
      {pendingHotelsCount > 0 && (
        <a href="/admin/hotels" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12,
          padding: '12px 16px', marginBottom: 20, textDecoration: 'none', color: 'inherit',
        }}>
          <ShieldAlert size={16} color="#D97706" />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{pendingHotelsCount} khách sạn đang chờ duyệt</span>
            <p style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>Nhấn để xem và xét duyệt</p>
          </div>
          <ArrowUpRight size={13} color="#D97706" />
        </a>
      )}

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard icon={Building2} label="Khách sạn" value={(dashboard?.totalHotels ?? 0).toLocaleString()} unit="" sub="Tổng cơ sở" accent="#3B82F6"
          badge={pendingHotelsCount > 0 ? `${pendingHotelsCount} chờ duyệt` : undefined} />
        <KpiCard icon={CalendarCheck} label="Đặt phòng" value={(dashboard?.totalBookings ?? 0).toLocaleString()} unit="" sub={`${summary?.completedBookings ?? 0} hoàn thành`} accent="#8B5CF6" />
        <KpiCard icon={Users} label="Người dùng" value={(dashboard?.totalUsers ?? 0).toLocaleString()} unit="" sub="Khách & chủ sở hữu" accent="#0EA5E9" />
        <KpiCard icon={TrendingUp} label="Doanh thu gộp"
          value={Number(summary?.grossRevenue ?? 0).toLocaleString('vi-VN')}
          unit="₫" sub="Trước hoa hồng" accent="#F59E0B" />

        <KpiCard icon={Percent} label="Hoa hồng"
          value={Number(summary?.totalCommission ?? 0).toLocaleString('vi-VN')}
          unit="₫" sub="Thu của hệ thống" accent="#EF4444" />

        <KpiCard icon={BadgeDollarSign} label="Tài trợ hệ thống"
          value={Number(summary?.systemSponsorAmount ?? 0).toLocaleString('vi-VN')}
          unit="₫" sub="Platform bù cho KS" accent="#10B981" />

        <KpiCard icon={TrendingUp} label="Lợi nhuận ròng"
          value={Number(summary?.platformNetProfit ?? 0).toLocaleString('vi-VN')}
          unit="₫" sub="Hoa hồng – Tài trợ" accent="#6366F1" />
      </div>



      {/* ── Area chart ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 4, height: 18, background: '#3B82F6', borderRadius: 999 }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Biến động doanh thu & hoa hồng</h2>
        </div>
        {areaData.length === 0
          ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#CBD5E1', fontSize: 13 }}>Không có dữ liệu</div>
          : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  {[
                    { id: 'gGross', color: '#3B82F6' },
                    { id: 'gComm', color: '#F59E0B' },
                    { id: 'gNet', color: '#10B981' },
                  ].map(({ id, color }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + 'M' : String(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area 
  type="monotone" dataKey="Doanh thu" 
  stroke="#3B82F6" strokeWidth={2} 
  fill="url(#gGross)" 
  dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
  activeDot={{ r: 6 }}
/>
<Area 
  type="monotone" dataKey="Hoa hồng"  
  stroke="#F59E0B" strokeWidth={1.5} 
  fill="url(#gComm)" 
  dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }}
  activeDot={{ r: 6 }}
  strokeDasharray="5 3" 
/>
<Area 
  type="monotone" dataKey="Lợi nhuận"    
  stroke="#10B981" strokeWidth={2} 
  fill="url(#gNet)" 
  dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
  activeDot={{ r: 6 }}
/>

              </AreaChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* ── Pie + Top Hotels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Pie */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Tỷ lệ trạng thái đơn</h2>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 16px' }}>Dựa trên kỳ lọc hiện tại</p>
          {pieData.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: '#E5E7EB', fontSize: 12 }}>Không có dữ liệu</div>
            : (
              <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: d.fill, flexShrink: 0 }} />
                      {d.name}: <strong style={{ color: '#111827' }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
        </div>

        {/* Top Hotels with commission breakdown */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Top khách sạn — doanh thu</h2>
          {topHotels.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: '#E5E7EB', fontSize: 12 }}>Không có dữ liệu</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topHotels.map((h, i) => {
                  const gross = Number(h.grossRevenue ?? 0)
                  const comm = Number(h.totalCommission ?? 0)
                  const net = Number(h.netRevenue ?? 0)
                  const pct = (gross / maxRev) * 100
                  return (
                    <div key={h.hotelId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#CBD5E1', flexShrink: 0 }}>#{i + 1}</span>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.hotelName}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: '#059669', margin: 0 }}>
                            {gross.toLocaleString('vi-VN')} ₫
                          </p>
                          <p style={{ fontSize: 10, color: '#F59E0B', margin: '1px 0 0', fontWeight: 600 }}>
                            HC: {comm.toLocaleString('vi-VN')} ₫
                          </p>
                        </div>
                      </div>
                      <div style={{ height: 5, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #3B82F6, #6366F1)', borderRadius: 999 }} />
                      </div>
                      <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                        {h.completedBookings} đặt · Net: {net.toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </div>

      {/* ── Recent Bookings table ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Giao dịch gần đây</h2>
          <a href="/admin/bookings" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#3B82F6', textDecoration: 'none' }}>
            Xem tất cả <ArrowUpRight size={12} />
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Mã', 'Khách hàng', 'Khách sạn', 'Check-in', 'Doanh thu', 'Hoa hồng', 'Tài trợ', 'Trạng thái', 'Thanh toán'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px 0', color: '#CBD5E1', fontSize: 13 }}>Không có giao dịch</td></tr>
              ) : recentBookings.map(b => (
                <tr key={b.bookingId} style={{ borderTop: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#3B82F6', whiteSpace: 'nowrap' }}>#{b.bookingCode}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: 12 }}>{b.guestName}</p>
                    <p style={{ color: '#94A3B8', margin: '2px 0 0', fontSize: 10 }}>{new Date(b.createdAt).toLocaleDateString('vi-VN')}</p>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.hotelName}</td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>{new Date(b.checkInDate).toLocaleDateString('vi-VN')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', fontSize: 12 }}>{Number(b.totalAmount).toLocaleString('vi-VN')}₫</td>
                  {/* Commission columns - not in RecentBookingResponse so show dash */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
                    {b.commissionAmount != null ? `${Number(b.commissionAmount).toLocaleString('vi-VN')}₫` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#059669', fontWeight: 600 }}>
                    {b.netAmount != null ? `${Number(b.netAmount).toLocaleString('vi-VN')}₫` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: PAYMENT_STATUS[b.paymentStatus]?.color ?? '#9CA3AF' }}>
                      {PAYMENT_STATUS[b.paymentStatus]?.label ?? b.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}