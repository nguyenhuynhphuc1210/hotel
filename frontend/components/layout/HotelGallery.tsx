'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Images, X, ChevronLeft, ChevronRight, Star, Heart, Loader2 } from 'lucide-react'
import { HotelImageResponse } from '@/lib/api/hotel.api'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import favoriteApi from '@/lib/api/favorite.api'
import toast from 'react-hot-toast'
import axiosInstance from '@/lib/api/axios'

interface Props {
    images: HotelImageResponse[]
    hotelId: number
}

export default function HotelGallery({ images, hotelId }: Props) {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const router = useRouter()
    const [isTogglingFav, setIsTogglingFav] = useState(false)
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

    // 1. Fetch trạng thái yêu thích
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

    const { data: favStatus, isLoading: isFavLoading } = useQuery({
        queryKey: ['fav-status', hotelId, user?.id],
        queryFn: () =>
            axiosInstance
                .get<{ isFavorited: boolean }>(`/api/favorites/${hotelId}/status`)
                .then(r => r.data),
        // Chạy query nếu có token (không đợi user object từ store)
        enabled: !!token && !!hotelId,
        staleTime: 1000 * 60 * 10, // Giữ 10 phút để không bị fetch lại liên tục
    })

    const isFavorited = favStatus?.isFavorited ?? false

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!token) {
            toast.error('Vui lòng đăng nhập!')
            router.push(`/login?redirect=/hotels/${hotelId}`)
            return
        }
        setIsTogglingFav(true)
        try {
            const res = await favoriteApi.toggle(hotelId)
            const favorited = res.data.isFavorited
            queryClient.setQueryData(['fav-status', hotelId, user?.id], { isFavorited: favorited })
            queryClient.invalidateQueries({ queryKey: ['my-favorites'] })
            toast.success(favorited ? 'Đã thêm vào yêu thích!' : 'Đã xóa khỏi yêu thích!')
        } catch {
            toast.error('Có lỗi xảy ra')
        } finally {
            setIsTogglingFav(false)
        }
    }

    const primaryImage = images.find(img => img.isPrimary) || images[0]
    const others = images.filter(img => img.id !== primaryImage.id)

    const handleOpen = (img: HotelImageResponse) => {
        const idx = images.findIndex(i => i.id === img.id)
        setLightboxIdx(idx)
    }

    const renderGrid = () => {
        const count = images.length

        if (count === 1) {
            return (
                <div className="h-full w-full cursor-pointer overflow-hidden" onClick={() => handleOpen(images[0])}>
                    <img src={images[0].imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                </div>
            )
        }

        if (count === 2) {
            return (
                <div className="grid grid-cols-2 h-full gap-2">
                    {images.map((img) => (
                        <div key={img.id} className="cursor-pointer overflow-hidden" onClick={() => handleOpen(img)}>
                            <img src={img.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                        </div>
                    ))}
                </div>
            )
        }

        if (count === 3) {
            return (
                <div className="grid grid-cols-3 h-full gap-2">
                    <div className="col-span-2 cursor-pointer overflow-hidden" onClick={() => handleOpen(images[0])}>
                        <img src={images[0].imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                    </div>
                    <div className="grid grid-rows-2 gap-2">
                        {images.slice(1, 3).map((img) => (
                            <div key={img.id} className="cursor-pointer overflow-hidden" onClick={() => handleOpen(img)}>
                                <img src={img.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                            </div>
                        ))}
                    </div>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-4 grid-rows-2 h-full gap-2">
                <div className="col-span-2 row-span-2 cursor-pointer overflow-hidden" onClick={() => handleOpen(primaryImage)}>
                    <img src={primaryImage.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                </div>
                {others.slice(0, 4).map((img, idx) => (
                    <div key={img.id} className="relative cursor-pointer overflow-hidden" onClick={() => handleOpen(img)}>
                        <img src={img.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                        {idx === 3 && images.length > 5 && (
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                                <Images size={24} />
                                <span className="font-bold mt-1">+{images.length - 5} ảnh</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="relative group">
            <div className="h-[450px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
                {renderGrid()}

                {/* Nút Xem tất cả */}
                <button
                    onClick={() => setLightboxIdx(0)}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg hover:bg-white transition-all text-sm font-bold text-gray-800"
                >
                    <Images size={16} className="text-blue-600" />
                    Xem mọi bức ảnh
                </button>

                {/* Tag Ảnh chính */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-full text-[11px] font-bold shadow-lg">
                    <Star size={12} fill="white" /> Phổ biến nhất
                </div>

                {/* ── Nút Yêu thích ── */}
                <button
                    onClick={handleToggleFavorite}
                    disabled={isTogglingFav}
                    className={`absolute top-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 disabled:opacity-60 
                        ${isFavLoading ? 'bg-white/50 text-transparent' : ''} 
                        ${!isFavLoading && isFavorited ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-700 hover:bg-white border border-gray-200'}
                    `}
                >
                    {isFavLoading ? (
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                    ) : (
                        <Heart size={16} fill={isFavorited ? 'white' : 'none'} />
                    )}

                    {!isFavLoading && (isTogglingFav ? '...' : isFavorited ? 'Đã lưu' : 'Yêu thích')}
                    {isFavLoading && <span className="text-gray-400">Đang tải...</span>}
                </button>
            </div>

            {/* Lightbox */}
            {lightboxIdx !== null && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => setLightboxIdx(null)}>
                    <button className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full"><X size={30} /></button>
                    <div className="relative max-w-5xl w-full h-[80vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setLightboxIdx(i => (i! - 1 + images.length) % images.length)}
                            className="absolute left-0 bg-white/10 p-3 rounded-full text-white hover:bg-white/20"
                        ><ChevronLeft size={30} /></button>
                        <img src={images[lightboxIdx].imageUrl} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
                        <button
                            onClick={() => setLightboxIdx(i => (i! + 1) % images.length)}
                            className="absolute right-0 bg-white/10 p-3 rounded-full text-white hover:bg-white/20"
                        ><ChevronRight size={30} /></button>
                    </div>
                    <p className="text-white/60 mt-4 text-sm font-medium">{lightboxIdx + 1} / {images.length}</p>
                </div>
            )}
        </div>
    )
}