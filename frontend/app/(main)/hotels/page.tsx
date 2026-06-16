'use client'

import { useState, useMemo, Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
    MapPin, Star, SlidersHorizontal,
    Search, X, ArrowUpDown, Heart,
    Loader2, Tag
} from 'lucide-react'
import hotelApi, { HotelSummaryResponse, HotelSearchParams } from '@/lib/api/hotel.api'
import SearchBar from '@/components/common/SearchBar'
import Pagination from '@/components/ui/Pagination'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import favoriteApi from '@/lib/api/favorite.api'
import { cn } from '@/lib/utils'
import { PromotionResponse } from '@/types/promotion.types'
import promotionApi from '@/lib/api/promotion.api'


type SortOption = 'recommended' | 'price_asc' | 'price_desc' | 'star_desc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'recommended', label: 'Đề xuất' },
    { value: 'price_asc', label: 'Giá thấp nhất trước' },
    { value: 'price_desc', label: 'Giá cao nhất trước' },
    { value: 'star_desc', label: 'Hạng sao cao nhất' },
]

const ALL_DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Tân Bình',
    'Quận Tân Phú', 'Quận Phú Nhuận', 'Quận Thủ Đức', 'Quận Bình Tân',
    'Huyện Củ Chi', 'Huyện Hóc Môn', 'Huyện Nhà Bè', 'Huyện Bình Chánh', 'Huyện Cần Giờ',
]

function HotelsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    
    const keyword = searchParams.get('keyword') ?? ''
    const districts = searchParams.getAll('districts')
    const checkIn = searchParams.get('checkIn') ?? ''
    const checkOut = searchParams.get('checkOut') ?? ''
    const adults = Number(searchParams.get('adults') ?? 1)
    const children = Number(searchParams.get('children') ?? 0)
    const rooms = Number(searchParams.get('rooms') ?? 1)
    const currentPage = Number(searchParams.get('page') ?? 0)

    const stars = useMemo(() => searchParams.getAll('stars').map(Number), [searchParams])
    const minPriceUrl = searchParams.get('minPrice') ?? ''
    const maxPriceUrl = searchParams.get('maxPrice') ?? ''
    const sortBy = (searchParams.get('sortBy') as SortOption) ?? 'recommended'

    const hasFullDates = !!checkIn && !!checkOut
    const [showFilter, setShowFilter] = useState(true)
    const pageSize = 10

    const [localMin, setLocalMin] = useState(minPriceUrl)
    const [localMax, setLocalMax] = useState(maxPriceUrl)
    const isQuickClickRef = useRef(false)

    useEffect(() => { setLocalMin(minPriceUrl) }, [minPriceUrl])
    useEffect(() => { setLocalMax(maxPriceUrl) }, [maxPriceUrl])

    const queryParams: HotelSearchParams = useMemo(() => ({
        keyword: keyword || undefined,
        districts: districts.length > 0 ? districts : undefined,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        adults,
        children,
        stars: stars.length > 0 ? stars : undefined,
        minPrice: minPriceUrl ? Number(minPriceUrl) : undefined,
        maxPrice: maxPriceUrl ? Number(maxPriceUrl) : undefined,
        sortBy: sortBy,
        page: currentPage,
        size: pageSize,
    }), [keyword, districts, checkIn, checkOut, adults, children, stars, minPriceUrl, maxPriceUrl, sortBy, currentPage])

    const { data: pageData, isLoading } = useQuery({
        queryKey: ['hotels-search', queryParams],
        queryFn: () => hotelApi.search(queryParams).then(r => r.data),
    })

    const hotels = useMemo(() => {
    const list = pageData?.content || []
    if (sortBy === 'star_desc') {
        return [...list].sort((a, b) => Number(b.starRating ?? 0) - Number(a.starRating ?? 0))
    }
    if (sortBy === 'price_asc') {
        return [...list].sort((a, b) => Number(a.minPrice ?? 0) - Number(b.minPrice ?? 0))
    }
    if (sortBy === 'price_desc') {
        return [...list].sort((a, b) => Number(b.minPrice ?? 0) - Number(a.minPrice ?? 0))
    }
    return list
}, [pageData, sortBy])
    const totalElements = pageData?.totalElements || 0

    
    const updateQueryParams = (updates: Record<string, string | string[] | number[] | number | null>) => {
        const p = new URLSearchParams(searchParams.toString())

        Object.entries(updates).forEach(([key, value]) => {
            p.delete(key)
            if (Array.isArray(value)) {
                value.forEach(v => p.append(key, String(v)))
            } else if (value !== null && value !== '') {
                p.set(key, String(value))
            }
        })

        if (!updates.hasOwnProperty('page')) {
            p.set('page', '0')
        }

        router.push(`/hotels?${p.toString()}`)
    }

    const { data: promotions = [] } = useQuery<PromotionResponse[]>({
    queryKey: ['promotions-active'],
    queryFn: async () => {
        const response = await promotionApi.getAll()
        const data: PromotionResponse[] = response.data
        const now = new Date()
        return data.filter((p: PromotionResponse) =>
            p.isActive &&
            new Date(p.startDate) <= now &&
            new Date(p.endDate) >= now
        )
    },
})

    const toggleDistrict = (district: string) => {
        const next = districts.includes(district)
            ? districts.filter(d => d !== district)
            : [...districts, district]
        updateQueryParams({ districts: next })
    }

    const toggleStar = (star: number) => {
        const next = stars.includes(star)
            ? stars.filter(s => s !== star)
            : [...stars, star]
        updateQueryParams({ stars: next })
    }

    const clearAllFilters = () => {
        setLocalMin('')
        setLocalMax('')
        const p = new URLSearchParams()
        if (keyword) p.set('keyword', keyword)
        if (checkIn) p.set('checkIn', checkIn)
        if (checkOut) p.set('checkOut', checkOut)
        p.set('adults', String(adults))
        p.set('children', String(children))
        p.set('rooms', String(rooms))
        router.push(`/hotels?${p.toString()}`)
    }

    const nights = hasFullDates
        ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
        : 0

    const activeFilterCount = stars.length + (minPriceUrl ? 1 : 0) + (maxPriceUrl ? 1 : 0)
    const title = keyword || districts.length > 0
        ? `${keyword || districts.join(', ')}: tìm thấy ${totalElements} khách sạn`
        : `Tất cả khách sạn tại TP.HCM: ${totalElements} kết quả`

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 sticky top-16 z-40 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <SearchBar
                        key={keyword + districts.join('') + checkIn + checkOut}
                        variant="compact"
                        defaultValues={{
                            keyword: keyword || districts.join(', '),
                            checkIn, checkOut, adults, children, rooms,
                        }}
                        onSearch={(p) => router.push(`/hotels?${p.toString()}`)}
                    />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    <aside className={showFilter ? "w-64 shrink-0 space-y-4" : "hidden"}>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Khu vực / Quận</h3>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {ALL_DISTRICTS.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => toggleDistrict(d)}
                                        className={`flex items-center gap-2.5 w-full text-left py-1.5 px-2 rounded-lg transition-all ${districts.includes(d) ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border shrink-0 ${districts.includes(d) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`} />
                                        <span className="text-sm">{d}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Đánh giá sao</h3>
                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map(s => (
                                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={stars.includes(s)}
                                            onChange={() => toggleStar(s)}
                                            className="w-4 h-4 rounded accent-blue-600"
                                        />
                                        <div className="flex items-center gap-0.5">
                                            {Array.from({ length: s }).map((_, i) => (
                                                <Star key={i} size={13} fill="#f59e0b" className="text-amber-400" />
                                            ))}
                                        </div>
                                        <span className="text-sm text-gray-600">{s} sao</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Khoảng giá / đêm</h3>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={localMin}
                                    onChange={e => setLocalMin(e.target.value.replace(/\D/g, ''))}
                                    onKeyDown={e => e.key === 'Enter' && updateQueryParams({ minPrice: localMin, maxPrice: localMax })}
                                    onBlur={() => {
                                        if (!isQuickClickRef.current) {
                                            updateQueryParams({ minPrice: localMin, maxPrice: localMax })
                                        }
                                        isQuickClickRef.current = false
                                    }}
                                    placeholder="Từ (₫)"
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={localMax}
                                    onChange={e => setLocalMax(e.target.value.replace(/\D/g, ''))}
                                    onKeyDown={e => e.key === 'Enter' && updateQueryParams({ minPrice: localMin, maxPrice: localMax })}
                                    onBlur={() => {
                                        if (!isQuickClickRef.current) {
                                            updateQueryParams({ minPrice: localMin, maxPrice: localMax })
                                        }
                                        isQuickClickRef.current = false
                                    }}
                                    placeholder="Đến (₫)"
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                />
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <button onClick={clearAllFilters} className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                                Xoá tất cả bộ lọc
                            </button>
                        )}
                    </aside>

                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                                {nights > 0 && (
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {new Date(checkIn).toLocaleDateString('vi-VN')} → {new Date(checkOut).toLocaleDateString('vi-VN')} · {nights} đêm
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFilter(!showFilter)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border ${showFilter ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}
                                >
                                    <SlidersHorizontal size={15} /> Bộ lọc
                                    {activeFilterCount > 0 && <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilterCount}</span>}
                                </button>
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={e => updateQueryParams({ sortBy: e.target.value })}
                                        className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white appearance-none cursor-pointer"
                                    >
                                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200 h-52 animate-pulse" />)}
                            </div>
                        ) : hotels.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
                                <Search size={40} className="text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Không tìm thấy khách sạn nào</p>
                                <button onClick={clearAllFilters} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Xoá bộ lọc</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {hotels.map(h => (
                                    <HotelCard
                                        key={h.id}
                                        hotel={h}
                                        nights={nights}
                                        promotions={promotions}
                                        hasFullDates={hasFullDates}
                                        onCardClick={() => router.push(`/hotels/${h.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&rooms=${rooms}&children=${children}`)}
                                    />
                                ))}
                            </div>
                        )}

                        {pageData && pageData.totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                pageSize={pageSize}
                                totalPages={pageData.totalPages}
                                totalElements={pageData.totalElements}
                                onPageChange={(page) => updateQueryParams({ page })}
                            />
                        )}
                    </div>
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    )
}


interface HotelCardProps {
    hotel: HotelSummaryResponse
    nights: number
    onCardClick: () => void
    hasFullDates: boolean
    promotions: PromotionResponse[]
}

interface FavoriteHotelSummary {
    id: number
    hotelName: string
    thumbnailUrl?: string
}

interface FavoriteItem {
    hotel: FavoriteHotelSummary
    createdAt: string
}

interface FavoritePageResponse {
    content: FavoriteItem[]
    totalElements: number
    totalPages: number
    number: number
    size: number
}

function HotelCard({ hotel: h, nights, onCardClick, hasFullDates, promotions }: HotelCardProps) {
    const { user } = useAuthStore()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isTogglingFav, setIsTogglingFav] = useState(false)

    const stars = Math.round(Number(h.starRating ?? 0))
    const displayImage = h.thumbnailUrl || h.images?.find(i => i.isPrimary)?.imageUrl
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

    
    const { data: myFavsPage } = useQuery<FavoritePageResponse>({
        queryKey: ['my-favorites', user?.id],
        queryFn: () => favoriteApi.getMyFavorites(0, 100).then(r => r.data as FavoritePageResponse),
        enabled: !!token && !!user,
        staleTime: 1000 * 60 * 5, 
    })

    const isFavorited = useMemo(() => {
        if (!myFavsPage?.content) return false
        return myFavsPage.content.some((fav: FavoriteItem) => fav.hotel.id === h.id)
    }, [myFavsPage, h.id])

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation() 
        if (!token) {
            toast.error('Vui lòng đăng nhập để lưu khách sạn!')
            router.push(`/login?redirect=${window.location.pathname}`)
            return
        }

        setIsTogglingFav(true)
        try {
            const res = await favoriteApi.toggle(h.id)
            
            await queryClient.invalidateQueries({ queryKey: ['my-favorites', user?.id] })
            toast.success(res.data.isFavorited ? 'Đã thêm vào yêu thích!' : 'Đã xóa khỏi yêu thích!')
        } catch {
            toast.error('Có lỗi xảy ra, vui lòng thử lại')
        } finally {
            setIsTogglingFav(false)
        }
    }

    const hotelPromo = promotions.find(p => p.hotelId === h.id);

    return (
        <div
            onClick={onCardClick}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group flex relative"
        >
            <div className="w-72 shrink-0 bg-gray-100 relative overflow-hidden">
                {displayImage ? (
                    <img 
                        src={displayImage} 
                        alt={h.hotelName} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🏨</div>
                )}
                
                <button
                    onClick={handleToggleFavorite}
                    disabled={isTogglingFav}
                    className={cn(
                        "absolute top-3 right-3 p-2 rounded-full shadow-md backdrop-blur-md transition-all active:scale-90 z-10",
                        isFavorited 
                            ? "bg-red-500 text-white" 
                            : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500"
                    )}
                >
                    {isTogglingFav ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Heart 
                            size={18} 
                            fill={isFavorited ? 'white' : 'none'} 
                            className={cn(isFavorited ? "text-white" : "text-current")}
                        />
                    )}
                </button>
            </div>

            <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate mb-1">
                        {h.hotelName}
                    </h3>
                    <div className="flex items-center gap-0.5 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                                key={i} 
                                size={14} 
                                fill={i < stars ? '#f59e0b' : 'none'} 
                                className={i < stars ? 'text-amber-400' : 'text-gray-200'} 
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-blue-600 mb-3">
                        <MapPin size={14} /> <span>{h.district}, {h.city}</span>
                    </div>
                </div>
                <div className="flex items-end justify-end mt-4 pt-4 border-t border-gray-100">
                    <div className="text-right">
                        
                        {hotelPromo && (
                            <div className="flex items-center justify-end gap-1 text-red-600 font-bold text-[10px] animate-pulse mb-1">
                                <Tag size={10} /> Có ưu đãi
                            </div>
                        )}

                        {h.minPrice ? (
                            <>
                                <div className="text-xs text-gray-400">Giá từ</div>
                                <div className="text-2xl font-bold text-red-500">
                                    {Number(h.minPrice).toLocaleString('vi-VN')}₫
                                </div>
                                {hasFullDates && nights > 0 && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Tổng {(Number(h.minPrice) * nights).toLocaleString('vi-VN')}₫ / {nights} đêm
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-lg font-bold text-gray-800">Đang cập nhật</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function HotelsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
            <HotelsContent />
        </Suspense>
    )
}