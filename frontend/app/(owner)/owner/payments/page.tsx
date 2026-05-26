'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOwnerHotel } from '../../owner-hotel-context'
import paymentApi from '@/lib/api/payment.api'
import { PaymentStatus, PaymentResponse } from '@/types/payment.types'
import { useHotelStatistics } from '@/hooks/useStatistic'
import { exportPayments } from '@/lib/api/export.api'

import {
  Search,
  Download,
  Eye,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  CircleDollarSign,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ReceiptText,
  Calendar,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
  onPageSizeChange
}: {
  currentPage: number
  pageSize: number
  totalPages: number
  totalElements: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}) {
  const start = currentPage * pageSize + 1
  const end = Math.min((currentPage + 1) * pageSize, totalElements)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
      <span className="text-xs">
        Hiển thị <b className="text-slate-700">{start}–{end}</b> / {totalElements} giao dịch
      </span>

      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={e => {
            onPageSizeChange(Number(e.target.value))
            onPageChange(0)
          }}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500"
        >
          {[10, 20, 50].map(s => (
            <option key={s} value={s}>
              {s} / trang
            </option>
          ))}
        </select>

        <button
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="text-xs font-medium px-1">
          {currentPage + 1} / {Math.max(totalPages, 1)}
        </span>

        <button
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PaymentStatus,
  {
    label: string
    dot: string
    badge: string
  }
> = {
  PAID: {
    label: 'Đã thanh toán',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  },

  PENDING: {
    label: 'Chờ xử lý',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  },

  UNPAID: {
    label: 'Chưa thanh toán',
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
  },

  FAILED: {
    label: 'Thất bại',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200'
  },

  CANCELLED: {
    label: 'Đã hủy',
    dot: 'bg-gray-400',
    badge: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
  },

  REFUNDED: {
    label: 'Hoàn tiền',
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
  }
}

const METHOD_CONFIG: Record<
  string,
  {
    label: string
    badge: string
  }
> = {
  VNPAY: {
    label: 'VNPay',
    badge: 'text-blue-600 bg-blue-50 ring-1 ring-blue-200'
  },

  MOMO: {
    label: 'MoMo',
    badge: 'text-pink-600 bg-pink-50 ring-1 ring-pink-200'
  },

  ZALOPAY: {
    label: 'ZaloPay',
    badge: 'text-cyan-600 bg-cyan-50 ring-1 ring-cyan-200'
  },

  CREDIT_CARD: {
    label: 'Thẻ tín dụng',
    badge: 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200'
  },

  BANK_TRANSFER: {
    label: 'Chuyển khoản',
    badge: 'text-teal-600 bg-teal-50 ring-1 ring-teal-200'
  },

  CASH: {
    label: 'Tiền mặt',
    badge: 'text-orange-600 bg-orange-50 ring-1 ring-orange-200'
  }
}

// ─────────────────────────────────────────────────────────
// DRAWER
// ─────────────────────────────────────────────────────────

function PaymentDetailDrawer({
  payment,
  onClose
}: {
  payment: PaymentResponse | null
  onClose: () => void
}) {
  if (!payment) return null

  const cfg = STATUS_CONFIG[payment.status]

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">

        <div className="p-6 bg-gradient-to-br from-teal-600 to-teal-700 text-white">

          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-teal-200 text-xs font-medium uppercase tracking-widest mb-1">
                Chi tiết giao dịch
              </p>

              <h2 className="text-xl font-bold font-mono">
                {payment.transactionId || 'N/A'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20"
            >
              <XCircle size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.badge} bg-white/90`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 mb-1">Số tiền</p>

          <p className="text-3xl font-black text-teal-700 tracking-tight">
            {payment.amount.toLocaleString('vi-VN')}
            <span className="text-lg font-semibold text-teal-500 ml-1">₫</span>
          </p>
        </div>

        <div className="p-6 space-y-4">
          {[
            {
              label: 'Khách sạn',
              value: payment.hotelName
            },
            {
              label: 'Booking',
              value: payment.bookingCode
            },
            {
              label: 'Phương thức',
              value: METHOD_CONFIG[payment.paymentMethod]?.label || payment.paymentMethod
            },
            {
              label: 'Ngày thanh toán',
              value: payment.paymentDate
                ? new Date(payment.paymentDate).toLocaleString('vi-VN')
                : '---'
            }
          ].map(item => (
            <div
              key={item.label}
              className="flex justify-between gap-4"
            >
              <span className="text-xs text-slate-500">
                {item.label}
              </span>

              <span className="text-sm font-semibold text-right text-slate-800">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────

export default function OwnerPaymentsPage() {

  const {
    activeHotel,
    activeHotelId,
    hotels,
    setActiveHotelId,
    isLoading: isHotelLoading
  } = useOwnerHotel()

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] =
    useState<PaymentStatus | ''>('')

  const [methodFilter, setMethodFilter] = useState('')

  const [isExporting, setIsExporting] = useState(false)

  type SortType =
    | 'newest'
    | 'oldest'
    | 'amount_desc'
    | 'amount_asc'

  const [sortBy, setSortBy] =
    useState<SortType>('newest')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  const [selectedPayment, setSelectedPayment] =
    useState<PaymentResponse | null>(null)

  // debounce search

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: statsData, isLoading: isLoadingStats } = useHotelStatistics({
    hotelId: activeHotelId as number,
    fromDate: dateFrom || '2000-01-01',
    toDate: dateTo || '2099-12-31'
  }, !!activeHotelId)

  const { data: paymentsPage, isLoading: isPaymentsLoading, refetch } = useQuery({
    queryKey: ['owner-payments', search, statusFilter],
    queryFn: () => paymentApi.getAll(0, 10000, search || undefined, statusFilter || undefined).then(res => res.data),
    enabled: !!activeHotelId,
  })

  const isLoading = isHotelLoading || isPaymentsLoading

  // hotel payments

  const hotelPayments = useMemo(() => {
    if (!paymentsPage?.content || !activeHotelId) return []
    return paymentsPage.content.filter(p => p.hotelId === activeHotelId)
  }, [paymentsPage, activeHotelId])

  // filtered

  const filtered = useMemo(() => {

    let data = [...hotelPayments]

    if (search) {
      const q = search.toLowerCase()

      data = data.filter(p =>
        p.bookingCode?.toLowerCase().includes(q) ||
        p.transactionId?.toLowerCase().includes(q)
      )
    }

    if (statusFilter) {
      data = data.filter(
        p => p.status === statusFilter
      )
    }

    if (methodFilter) {
      data = data.filter(
        p => p.paymentMethod === methodFilter
      )
    }

    if (minAmount) {
      data = data.filter(
        p => p.amount >= Number(minAmount)
      )
    }

    if (maxAmount) {
      data = data.filter(
        p => p.amount <= Number(maxAmount)
      )
    }

    if (dateFrom) {
      const from = new Date(dateFrom)

      data = data.filter(p =>
        p.paymentDate &&
        new Date(p.paymentDate) >= from
      )
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)

      data = data.filter(p =>
        p.paymentDate &&
        new Date(p.paymentDate) <= to
      )
    }

    switch (sortBy) {

      case 'oldest':
        data.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        )
        break

      case 'amount_desc':
        data.sort((a, b) => b.amount - a.amount)
        break

      case 'amount_asc':
        data.sort((a, b) => a.amount - b.amount)
        break

      default:
        data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        )
    }

    return data

  }, [hotelPayments, search, statusFilter, methodFilter, minAmount, maxAmount, dateFrom, dateTo, sortBy])

  // stats

  const stats = useMemo(() => {
    // Doanh thu từ API Thống kê (Chỉ tính khi booking đã hoàn thành)
    const revenueFromApi = statsData?.reduce((sum, item) => sum + (item.totalRevenue || 0), 0) || 0

    // Các số liệu khác vẫn tính dựa trên list payment hiện tại
    const paidInList = filtered.filter(p => p.status === 'PAID')
    const pendingInList = filtered.filter(p => p.status === 'PENDING')

    return {
      total: filtered.length,
      paidCount: paidInList.length,
      pendingCount: pendingInList.length,
      revenue: revenueFromApi
    }
  }, [filtered, statsData])

  // paging

  const totalPages = Math.ceil(
    filtered.length / pageSize
  )

  const pagedResults = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  )

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportPayments({
        keyword: search || undefined,
        status: statusFilter || undefined,
        hotelId: activeHotelId,
      })
      toast.success('Xuất file thành công!')
    } catch {
      toast.error('Xuất file thất bại, vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

  // switch hotel

  const handleHotelSwitch = (id: number) => {
    setActiveHotelId(id)
    setCurrentPage(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-6 space-y-6">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row justify-between gap-4">

        <div>
          <div className="flex items-center gap-2 mb-1">
            <ReceiptText size={20} className="text-teal-600" />

            <h1 className="text-2xl font-black text-slate-900">
              Giao dịch thanh toán
            </h1>
          </div>

          <p className="text-sm text-slate-500">
            Theo dõi dòng tiền khách sạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting || !activeHotelId}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shrink-0"
          >
            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* HOTEL SWITCHER */}

      {hotels.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto">

          {hotels.map(h => (
            <button
              key={h.id}
              onClick={() => handleHotelSwitch(h.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border
              ${activeHotelId === h.id
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white border-slate-200 text-slate-600'
                }`}
            >
              {h.hotelName}
            </button>
          ))}
        </div>
      )}

      {/* STATS */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg shadow-teal-200/50 relative overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider">
                Doanh thu thực tế (Đã hoàn tất)
              </p>
              <p className="text-3xl font-black mt-1">
                {isLoadingStats ? (
                  <Loader2 className="animate-spin h-8 w-8" />
                ) : (
                  <>
                    {stats.revenue.toLocaleString('vi-VN')}
                    <span className="text-lg ml-1">₫</span>
                  </>
                )}
              </p>
            </div>
            <div className="bg-white/20 p-2 rounded-xl">
              <CircleDollarSign size={24} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-teal-100 bg-white/10 w-fit px-2 py-1 rounded-md">
            <TrendingUp size={13} />
            <span>Dựa trên các kỳ lưu trú đã kết thúc</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm group hover:border-teal-200 transition-colors">
          <p className="text-xs text-slate-400 font-semibold uppercase">Tổng lượt thanh toán</p>
          <div className="flex items-end justify-between mt-3">
            <p className="text-2xl font-black text-slate-800">{stats.total}</p>
            <div className="text-teal-500 bg-teal-50 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <ReceiptText size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase">Đang chờ xử lý</p>
          <div className="flex items-end justify-between mt-3">
            <p className="text-2xl font-black text-amber-500">{stats.pendingCount}</p>
            <div className="text-amber-500 bg-amber-50 p-2 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">

        <div className="flex flex-wrap gap-3">

          <div className="relative flex-1 min-w-[260px]">

            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Tìm mã đặt phòng, giao dịch..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm"
              value={searchInput}
              onChange={e =>
                setSearchInput(e.target.value)
              }
            />
          </div>

          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(
                e.target.value as PaymentStatus | ''
              )
            }
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
          >
            <option value="">Tất cả trạng thái</option>

            {Object.entries(STATUS_CONFIG).map(
              ([v, c]) => (
                <option key={v} value={v}>
                  {c.label}
                </option>
              )
            )}
          </select>

          <select
            value={methodFilter}
            onChange={e =>
              setMethodFilter(e.target.value)
            }
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
          >
            <option value="">Tất cả phương thức</option>

            {Object.entries(METHOD_CONFIG).map(
              ([v, c]) => (
                <option key={v} value={v}>
                  {c.label}
                </option>
              )
            )}
          </select>

          <select
            value={sortBy}
            onChange={e =>
              setSortBy(e.target.value as SortType)
            }
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="amount_desc">
              Số tiền giảm dần
            </option>
            <option value="amount_asc">
              Số tiền tăng dần
            </option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent py-1.5 text-sm outline-none"
              title="Từ ngày"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent py-1.5 text-sm outline-none"
              title="Đến ngày"
            />
          </div>

          <input
            type="number"
            placeholder="Min ₫"
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm w-[130px] outline-none focus:ring-2 focus:ring-teal-500"
          />

          <input
            type="number"
            placeholder="Max ₫"
            value={maxAmount}
            onChange={e => setMaxAmount(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm w-[130px] outline-none focus:ring-2 focus:ring-teal-500"
          />

          <button
            onClick={() => {
              setSearch('')
              setSearchInput('')
              setStatusFilter('')
              setMethodFilter('')
              setDateFrom('')
              setDateTo('')
              setMinAmount('')
              setMaxAmount('')
              setSortBy('newest')
              setCurrentPage(0)
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-all"
          >
            Làm mới bộ lọc
          </button>

        </div>
      </div>

      {(search || statusFilter) && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          📌 File Excel sẽ được xuất theo bộ lọc đang áp dụng.
        </p>
      )}

      {/* TABLE */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">

                <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">
                  Mã giao dịch
                </th>

                <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">
                  Mã đặt phòng
                </th>

                <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">
                  Số tiền
                </th>

                <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">
                  Phương thức
                </th>

                <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">
                  Ngày thanh toán
                </th>

                <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">
                  Trạng thái
                </th>

                <th className="px-6 py-3 w-12" />
              </tr>
            </thead>

            <tbody>

              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Loader2
                      className="animate-spin mx-auto text-teal-500 mb-3"
                      size={28}
                    />

                    <p className="text-sm text-slate-400">
                      Đang tải dữ liệu...
                    </p>
                  </td>
                </tr>
              ) : pagedResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">

                    <ReceiptText
                      size={32}
                      className="mx-auto text-slate-200 mb-3"
                    />

                    <p className="text-sm text-slate-400">
                      Không có giao dịch
                    </p>
                  </td>
                </tr>
              ) : (
                pagedResults.map(p => {

                  const cfg =
                    STATUS_CONFIG[p.status]

                  const method =
                    METHOD_CONFIG[p.paymentMethod] ?? {
                      label: p.paymentMethod,
                      badge:
                        'text-slate-600 bg-slate-50 ring-1 ring-slate-200'
                    }

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-teal-50/30 border-b border-slate-50 group"
                    >

                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {p.transactionId || '—'}
                      </td>

                      <td className="px-6 py-4 font-bold text-teal-600">
                        {p.bookingCode}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-800">
                        {p.amount.toLocaleString('vi-VN')}₫
                      </td>

                      <td className="px-6 py-4">

                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${method.badge}`}>
                          {method.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {p.paymentDate
                          ? new Date(
                            p.paymentDate
                          ).toLocaleString('vi-VN')
                          : '—'}
                      </td>

                      <td className="px-6 py-4">

                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.badge}`}>

                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />

                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">

                        <button
                          onClick={() =>
                            setSelectedPayment(p)
                          }
                          className="p-1.5 rounded-lg text-slate-300 hover:text-teal-600 hover:bg-teal-50"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">

            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              totalElements={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      <PaymentDetailDrawer
        payment={selectedPayment}
        onClose={() =>
          setSelectedPayment(null)
        }
      />
    </div>
  )
}