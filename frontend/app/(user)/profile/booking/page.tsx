'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Loader2,
  MapPin,
  Ban
} from 'lucide-react'
import toast from 'react-hot-toast'

import bookingApi from '@/lib/api/booking.api'
import { BookingStatus } from '@/types/booking.types'
import Pagination from '@/components/ui/Pagination'

interface ApiError {
  response?: { data?: { message?: string } | string }
}

export default function BookingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [bookingPage, setBookingPage] = useState(0)
  const [bookingSize] = useState(10)

  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null)

  const { data: bookingsPageData, isLoading } = useQuery({
    queryKey: ['my-bookings', bookingPage, bookingSize],
    queryFn: () =>
      bookingApi.getMyBookings(bookingPage, bookingSize).then(r => r.data),
  })

  const bookings = bookingsPageData?.content ?? []
  const totalPages = bookingsPageData?.totalPages ?? 0
  const totalElements = bookingsPageData?.totalElements ?? 0

  const cancelBookingMutation = useMutation({
    mutationFn: (id: number) => bookingApi.cancelBooking(id),
    onSuccess: () => {
      toast.success('Đã hủy đơn đặt phòng thành công!')
      setCancellingId(null)
      setConfirmCancelId(null)

      queryClient.invalidateQueries({
        queryKey: ['my-bookings'],
      })
    },
    onError: (err: ApiError) => {
      const msg =
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message || 'Hủy đơn thất bại'

      toast.error(msg)
      setCancellingId(null)
    },
  })

  const handleCancelBooking = (id: number) => {
    setCancellingId(id)
    cancelBookingMutation.mutate(id)
    setConfirmCancelId(null)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const getStatusInfo = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: 'Đã xác nhận',
          style: 'bg-emerald-100 text-emerald-700',
        }
      case 'PENDING':
        return {
          label: 'Chờ xử lý',
          style: 'bg-amber-100 text-amber-700',
        }
      case 'CANCELLED':
        return {
          label: 'Đã hủy',
          style: 'bg-red-100 text-red-700',
        }
      case 'COMPLETED':
        return {
          label: 'Đã hoàn thành',
          style: 'bg-blue-100 text-blue-700',
        }
      case 'CHECKED_IN':
        return {
          label: 'Đã nhận phòng',
          style: 'bg-purple-100 text-purple-700',
        }
      case 'NO_SHOW':
        return {
          label: 'Không đến',
          style: 'bg-gray-100 text-gray-700',
        }
      default:
        return {
          label: status,
          style: 'bg-gray-100 text-gray-700',
        }
    }
  }

  const isCancellable = (status: BookingStatus) =>
    status === 'PENDING' || status === 'CONFIRMED'

  return (
    <div className="space-y-4">

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl font-bold text-gray-900">
            Đơn đặt phòng của tôi
          </h3>

          {totalElements > 0 && (
            <span className="text-sm text-gray-400">
              {totalElements} đơn
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-blue-600" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />

            <p className="text-gray-500 font-medium">
              Bạn chưa có đơn đặt phòng nào.
            </p>

            <button
              onClick={() => router.push('/')}
              className="mt-4 text-blue-600 font-bold text-sm"
            >
              Khám phá ngay
            </button>
          </div>
        ) : (
          <>
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5 flex flex-col md:flex-row gap-5">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">
                        #{booking.bookingCode}
                      </span>

                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full ${getStatusInfo(booking.status).style}`}
                      >
                        {getStatusInfo(booking.status).label}
                      </span>
                    </div>

                    <h4 className="font-bold text-gray-900 text-lg mb-1">
                      {booking.hotelName}
                    </h4>

                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4">
                      <MapPin size={12} />
                      {booking.hotelAddress}
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                          Nhận phòng
                        </p>

                        <p className="text-sm font-bold text-gray-700">
                          {formatDate(booking.checkInDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                          Trả phòng
                        </p>

                        <p className="text-sm font-bold text-gray-700">
                          {formatDate(booking.checkOutDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-48 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-medium">
                        Tổng thanh toán
                      </p>

                      <p className="text-xl font-black text-blue-600">
                        {booking.totalAmount.toLocaleString('vi-VN')}₫
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full mt-4">
                      <button
                        onClick={() =>
                          router.push(`/booking/detail/${booking.id}`)
                        }
                        className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold transition-colors"
                      >
                        Xem chi tiết
                      </button>

                      {isCancellable(booking.status) && (
                        confirmCancelId === booking.id ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors"
                            >
                              Không
                            </button>

                            <button
                              onClick={() =>
                                handleCancelBooking(booking.id)
                              }
                              disabled={cancellingId === booking.id}
                              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60 transition-colors"
                            >
                              {cancellingId === booking.id ? (
                                <Loader2
                                  size={12}
                                  className="animate-spin"
                                />
                              ) : (
                                'Xác nhận'
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setConfirmCancelId(booking.id)
                            }
                            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Ban size={13} />
                            Hủy đơn
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
              <Pagination
                currentPage={bookingPage}
                totalPages={totalPages}
                totalElements={totalElements}
                pageSize={bookingSize}
                onPageChange={(p) => setBookingPage(p)}
              />
            </div>
          </>
        )}
      </div>
  )
}