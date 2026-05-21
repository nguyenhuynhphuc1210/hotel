'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  Heart,
  MapPin,
  Star,
  Hotel,
  CalendarDays,
  X,
} from 'lucide-react'

import toast from 'react-hot-toast'

import favoriteApi from '@/lib/api/favorite.api'

import {
  FavoriteResponse,
  FavoritePage,
} from '@/types/favorite.types'

export default function FavoritePages() {
  const router = useRouter()

  const [removingId, setRemovingId] =
    useState<number | null>(null)

  const {
    data: favoritesPage,
    isLoading: favLoading,
    refetch: refetchFavs,
  } = useQuery({
    queryKey: ['my-favorites'],
    queryFn: () =>
      favoriteApi
        .getMyFavorites(0, 20)
        .then((r) => r.data as FavoritePage),
  })

  const favorites: FavoriteResponse[] =
    favoritesPage?.content ?? []

  const handleRemoveFavorite = async (
    hotelId: number
  ) => {
    setRemovingId(hotelId)

    try {
      await favoriteApi.toggle(hotelId)

      toast.success('Đã xóa khỏi yêu thích!')

      refetchFavs()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-gray-900">
          Khách sạn yêu thích
        </h3>

        {favorites.length > 0 && (
          <span className="text-sm text-gray-400">
            {favorites.length} khách sạn
          </span>
        )}
      </div>

      {favLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin mx-auto text-red-400" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart
              size={32}
              className="text-red-300"
            />
          </div>

          <p className="text-gray-500 font-medium mb-1">
            Chưa có khách sạn yêu thích nào.
          </p>

          <p className="text-xs text-gray-400 mb-4">
            Nhấn vào nút ❤️ trên trang khách
            sạn để lưu lại.
          </p>

          <button
            onClick={() => router.push('/')}
            className="text-blue-600 font-bold text-sm"
          >
            Khám phá khách sạn
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {favorites.map(
            (fav: FavoriteResponse, index: number) => (
              <div
                key={fav.hotel.id || index}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex"
              >
                <div
                  className="w-36 shrink-0 bg-gray-100 cursor-pointer overflow-hidden"
                  onClick={() =>
                    router.push(
                      `/hotels/${fav.hotel.id}`
                    )
                  }
                >
                  {fav.hotel.thumbnailUrl ? (
                    <img
                      src={fav.hotel.thumbnailUrl}
                      alt={fav.hotel.hotelName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Hotel
                        size={32}
                        className="text-gray-300"
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <h4
                      className="font-bold text-gray-900 text-base mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() =>
                        router.push(
                          `/hotels/${fav.hotel.id}`
                        )
                      }
                    >
                      {fav.hotel.hotelName}
                    </h4>

                    {fav.hotel.city && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                        <MapPin size={11} />
                        {fav.hotel.city}
                      </div>
                    )}

                    {fav.hotel.starRating && (
                      <div className="flex items-center gap-0.5">
                        {[
                          ...Array(
                            Math.round(
                              fav.hotel.starRating
                            )
                          ),
                        ].map((_, i) => (
                          <Star
                            key={`${fav.hotel.id}-star-${i}`}
                            size={11}
                            fill="#f59e0b"
                            className="text-amber-400"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <CalendarDays size={11} />
                      Đã lưu{' '}
                      {new Date(
                        fav.createdAt
                      ).toLocaleDateString('vi-VN')}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          router.push(
                            `/hotels/${fav.hotel.id}`
                          )
                        }
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        Xem khách sạn
                      </button>

                      <button
                        onClick={() =>
                          handleRemoveFavorite(
                            fav.hotel.id
                          )
                        }
                        disabled={
                          removingId === fav.hotel.id
                        }
                        className="p-1.5 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {removingId ===
                        fav.hotel.id ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <X size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}