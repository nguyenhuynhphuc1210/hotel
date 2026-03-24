'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Star, SlidersHorizontal,
  Search, X, ArrowUpDown,
} from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelResponse } from '@/lib/api/hotel.api'
import SearchBar from '@/components/common/SearchBar'

// ── Types ─────────────────────────────────────────────────
type MinPriceMap = Record<number, number | null>
type SortOption  = 'recommended' | 'price_asc' | 'price_desc' | 'star_desc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Đề xuất' },
  { value: 'price_asc',   label: 'Giá thấp nhất trước' },
  { value: 'price_desc',  label: 'Giá cao nhất trước' },
  { value: 'star_desc',   label: 'Hạng sao cao nhất' },
]

// ── Page ──────────────────────────────────────────────────
export default function HotelsPage() {
  const router = useRouter()
  const params = useSearchParams()

  const keyword  = params.get('keyword')  ?? ''
  const district = params.get('district') ?? ''
  const checkIn  = params.get('checkIn')  ?? ''
  const checkOut = params.get('checkOut') ?? ''
  const adults   = Number(params.get('adults')   ?? 2)
  const children = Number(params.get('children') ?? 0)
  const rooms    = Number(params.get('rooms')    ?? 1)

  const [starFilter, setStarFilter] = useState<number[]>([])
  const [sortBy,     setSortBy]     = useState<SortOption>('recommended')
  const [showFilter, setShowFilter] = useState(true)
  const [priceMin,   setPriceMin]   = useState('')
  const [priceMax,   setPriceMax]   = useState('')

  // ── Fetch hotels ──
  const { data: hotels = [], isLoading } = useQuery<HotelResponse[]>({
    queryKey: ['hotels-search', keyword, district, checkIn, checkOut, adults],
    queryFn: () =>
      axiosInstance.get<HotelResponse[]>(API_CONFIG.ENDPOINTS.HOTELS_SEARCH, {
        params: {
          keyword:   keyword   || undefined,
          district:  district  || undefined,
          checkIn:   checkIn   || undefined,
          checkOut:  checkOut  || undefined,
          guests:    adults,
        },
      }).then(r => r.data),
  })

  // ── Fetch min prices ──
  const hotelIds = hotels.map(h => h.id).join(',')
  const { data: minPrices = {} } = useQuery<MinPriceMap>({
    queryKey: ['min-prices', hotelIds, checkIn, checkOut],
    queryFn: async () => {
      if (!checkIn || !checkOut || hotels.length === 0) return {}
      const results = await Promise.allSettled(
        hotels.map(h =>
          axiosInstance
            .get<number>(API_CONFIG.ENDPOINTS.HOTEL_MIN_PRICE(h.id), {
              params: { checkIn, checkOut },
            })
            .then(r => ({ id: h.id, price: r.data }))
        )
      )
      const map: MinPriceMap = {}
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          map[r.value.id] = r.value.price
        }
      })
      return map
    },
    enabled: !!checkIn && !!checkOut && hotels.length > 0,
  })

  // ── Filter + Sort (plain function, no useMemo) ──
  function getFiltered(): HotelResponse[] {
    let list: HotelResponse[] = [...hotels]

    if (starFilter.length > 0) {
      list = list.filter(h =>
        starFilter.includes(Math.floor(Number(h.starRating ?? 0)))
      )
    }

    if (priceMin) {
      const min = Number(priceMin)
      list = list.filter(h => {
        const p = minPrices[h.id] ?? 0
        return p >= min
      })
    }

    if (priceMax) {
      const max = Number(priceMax)
      list = list.filter(h => {
        const p = minPrices[h.id] ?? 0
        return p <= max
      })
    }

    list.sort((a, b) => {
      const pa = minPrices[a.id] ?? 0
      const pb = minPrices[b.id] ?? 0
      if (sortBy === 'price_asc')  return pa - pb
      if (sortBy === 'price_desc') return pb - pa
      if (sortBy === 'star_desc')  return Number(b.starRating ?? 0) - Number(a.starRating ?? 0)
      return 0
    })

    return list
  }

  const filtered = getFiltered()

  const nights = checkIn && checkOut
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0

  const title = keyword || district
    ? `${keyword || district}: tìm thấy ${filtered.length} khách sạn`
    : `Tất cả khách sạn tại TP.HCM: ${filtered.length} kết quả`

  const activeFilterCount =
    starFilter.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky search bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <SearchBar
            variant="compact"
            defaultValues={{ keyword, checkIn, checkOut, adults, children, rooms }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* Filter sidebar */}
          {showFilter && (
            <aside className="w-64 shrink-0 space-y-4">

              {/* Star rating */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Đánh giá sao</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={starFilter.includes(s)}
                        onChange={() =>
                          setStarFilter(prev =>
                            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                          )
                        }
                        className="w-4 h-4 rounded accent-green-600"
                      />
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: s }).map((_, i) => (
                          <Star key={i} size={13} fill="#f59e0b" className="text-amber-400" />
                        ))}
                        {Array.from({ length: 5 - s }).map((_, i) => (
                          <Star key={i} size={13} className="text-gray-200" />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{s} sao</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Khoảng giá / đêm</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Từ (₫)</label>
                    <input
                      type="number" value={priceMin}
                      onChange={e => setPriceMin(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Đến (₫)</label>
                    <input
                      type="number" value={priceMax}
                      onChange={e => setPriceMax(e.target.value)}
                      placeholder="Không giới hạn"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Quick buttons */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { label: '< 500K',  min: '',        max: '500000'  },
                    { label: '500K-1M', min: '500000',  max: '1000000' },
                    { label: '1M-2M',   min: '1000000', max: '2000000' },
                    { label: '> 2M',    min: '2000000', max: ''        },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setPriceMin(p.min); setPriceMax(p.max) }}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        priceMin === p.min && priceMax === p.max
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-green-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setStarFilter([]); setPriceMin(''); setPriceMax('') }}
                  className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Xoá tất cả bộ lọc
                </button>
              )}
            </aside>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                {nights > 0 && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(checkIn).toLocaleDateString('vi-VN')} →{' '}
                    {new Date(checkOut).toLocaleDateString('vi-VN')} · {nights} đêm ·{' '}
                    {adults} người lớn{children > 0 ? `, ${children} trẻ em` : ''} · {rooms} phòng
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    showFilter
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <SlidersHorizontal size={15} />
                  Bộ lọc
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {starFilter.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                    {s} sao
                    <button onClick={() => setStarFilter(p => p.filter(x => x !== s))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {(priceMin || priceMax) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                    {priceMin ? `${Number(priceMin).toLocaleString('vi-VN')}₫` : '0'} –{' '}
                    {priceMax ? `${Number(priceMax).toLocaleString('vi-VN')}₫` : '∞'}
                    <button onClick={() => { setPriceMin(''); setPriceMax('') }}>
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 h-52 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
                <Search size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Không tìm thấy khách sạn nào</p>
                <p className="text-gray-400 text-sm mt-1">Thử thay đổi bộ lọc hoặc tìm địa điểm khác</p>
                <button
                  onClick={() => { setStarFilter([]); setPriceMin(''); setPriceMax('') }}
                  className="mt-4 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Xoá bộ lọc
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(h => (
                  <HotelCard
                    key={h.id}
                    hotel={h}
                    minPrice={minPrices[h.id]}
                    nights={nights}
                    onClick={() =>
                      router.push(
                        `/hotels/${h.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&rooms=${rooms}`
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hotel Card ───────────────────────────────────────────
function HotelCard({
  hotel: h, minPrice, nights, onClick,
}: {
  hotel: HotelResponse
  minPrice: number | null | undefined
  nights: number
  onClick: () => void
}) {
  const images       = h.images ?? []
  const primaryImage = images.find(i => i.isPrimary)?.imageUrl ?? images[0]?.imageUrl
  const stars        = Math.round(Number(h.starRating ?? 0))
  const hasPrice     = minPrice != null && minPrice > 0

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group flex"
    >
      {/* Image */}
      <div className="w-64 shrink-0 relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 min-h-[200px]">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={h.hotelName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🏨</div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            +{images.length} ảnh
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-1 mb-1">
            {h.hotelName}
          </h3>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: stars }).map((_, i) => (
              <Star key={i} size={13} fill="#f59e0b" className="text-amber-400" />
            ))}
            {Array.from({ length: 5 - stars }).map((_, i) => (
              <Star key={i} size={13} className="text-gray-200" />
            ))}
            {stars > 0 && (
              <span className="text-xs text-gray-500 ml-1">{h.starRating} sao</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-green-600 mb-3">
            <MapPin size={13} />
            <span>{h.district}, {h.city}</span>
          </div>

          {/* Description */}
          {h.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{h.description}</p>
          )}

          {/* Room types */}
          {h.roomTypes && h.roomTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {h.roomTypes.slice(0, 3).map((rt, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {rt.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            {hasPrice ? (
              <>
                <div className="text-xs text-gray-400">
                  {nights > 0 ? 'Giá trung bình mỗi đêm' : 'Giá từ'}
                </div>
                <div className="text-xl font-bold text-red-500">
                  {Number(minPrice).toLocaleString('vi-VN')}₫
                </div>
                {nights > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    Tổng {(Number(minPrice) * nights).toLocaleString('vi-VN')}₫ / {nights} đêm
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-xs text-gray-400">Liên hệ để biết giá</div>
                <div className="text-sm font-medium text-gray-500 mt-0.5">Xem chi tiết</div>
              </>
            )}
          </div>

          <button
            onClick={e => { e.stopPropagation(); onClick() }}
            className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shrink-0"
          >
            Kiểm tra phòng trống
          </button>
        </div>
      </div>
    </div>
  )
}