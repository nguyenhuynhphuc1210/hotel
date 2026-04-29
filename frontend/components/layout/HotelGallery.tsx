'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
    Images, X, ChevronLeft, ChevronRight, Heart, 
    Loader2, Grid, PlayCircle
} from 'lucide-react'
import { HotelImageResponse } from '@/lib/api/hotel.api'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import favoriteApi from '@/lib/api/favorite.api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

// --- ĐỊNH NGHĨA INTERFACE ĐỂ TRÁNH LỖI ANY ---
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

interface Props {
    images: HotelImageResponse[]
    hotelId: number
}

export default function HotelGallery({ images, hotelId }: Props) {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const router = useRouter()
    
    const [isTogglingFav, setIsTogglingFav] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'slideshow'>('grid')
    const [currentIdx, setCurrentIdx] = useState(0)
    const thumbnailRefs = useRef<(HTMLDivElement | null)[]>([])

    // Khóa cuộn trang khi mở modal
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isModalOpen])

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

    // --- FETCH DANH SÁCH YÊU THÍCH VỚI TYPE RÕ RÀNG ---
    const { data: myFavsPage } = useQuery<FavoritePageResponse>({
        queryKey: ['my-favorites', user?.id],
        queryFn: () => favoriteApi.getMyFavorites(0, 100).then(r => r.data as FavoritePageResponse),
        enabled: !!token && !!user,
        staleTime: 1000 * 60 * 5,
    })

    // Kiểm tra trạng thái bằng cách tìm trong danh sách
    const isFavorited = useMemo(() => {
        if (!myFavsPage?.content) return false
        return myFavsPage.content.some((fav: FavoriteItem) => fav.hotel.id === hotelId)
    }, [myFavsPage, hotelId])

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
            // Làm mới query list để cập nhật trạng thái trái tim
            await queryClient.invalidateQueries({ queryKey: ['my-favorites', user?.id] })
            toast.success(res.data.isFavorited ? 'Đã thêm vào yêu thích!' : 'Đã xóa khỏi yêu thích!')
        } catch { 
            toast.error('Có lỗi xảy ra') 
        } finally { 
            setIsTogglingFav(false) 
        }
    }

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setCurrentIdx(prev => (prev + 1) % images.length)
    }
    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setCurrentIdx(prev => (prev - 1 + images.length) % images.length)
    }

    // Tự động cuộn thumbnail vào giữa
    useEffect(() => {
        if (viewMode === 'slideshow' && thumbnailRefs.current[currentIdx]) {
            thumbnailRefs.current[currentIdx]?.scrollIntoView({
                behavior: 'smooth', block: 'nearest', inline: 'center'
            })
        }
    }, [currentIdx, viewMode])

    const primaryImage = images.find(img => img.isPrimary) || images[0]
    const others = images.filter(img => img.id !== primaryImage?.id)

    return (
        <div className="relative group">
            {/* GRID HIỂN THỊ NGOÀI TRANG CHI TIẾT */}
            <div className="h-[450px] grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
                <div className="col-span-2 row-span-2 cursor-pointer overflow-hidden relative group/item" 
                     onClick={() => { setIsModalOpen(true); setViewMode('slideshow'); setCurrentIdx(0); }}>
                    <img src={primaryImage?.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                </div>
                {others.slice(0, 4).map((img, idx) => (
                    <div key={img.id} className="relative cursor-pointer overflow-hidden group/item" 
                         onClick={() => { setIsModalOpen(true); setViewMode('slideshow'); setCurrentIdx(images.findIndex(i => i.id === img.id)); }}>
                        <img src={img.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                        {idx === 3 && images.length > 5 && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                <Images size={24} />
                                <span className="font-bold mt-1">+{images.length - 5} ảnh</span>
                            </div>
                        )}
                    </div>
                ))}

                <button
                    onClick={() => { setIsModalOpen(true); setViewMode('grid'); }}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg hover:bg-white transition-all text-sm font-bold text-gray-800 z-10"
                >
                    <Grid size={16} className="text-blue-600" />
                    Xem tất cả {images.length} ảnh
                </button>

                <button
                    onClick={handleToggleFavorite}
                    disabled={isTogglingFav}
                    className={cn(
                        "absolute top-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 z-10",
                        isFavorited ? "bg-red-500 text-white" : "bg-white/90 text-gray-700 hover:bg-white"
                    )}
                >
                    {isTogglingFav ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} fill={isFavorited ? 'white' : 'none'} />}
                    {isFavorited ? 'Đã lưu' : 'Yêu thích'}
                </button>
            </div>

            {/* MODAL THƯ VIỆN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

                    <div className="relative bg-white w-full max-w-[1400px] h-full max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10">
                        <div className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-white">
                            <div className="flex items-center gap-2">
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setViewMode('slideshow')}
                                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all", 
                                            viewMode === 'slideshow' ? "bg-white shadow text-blue-600" : "text-gray-500")}
                                    >
                                        <PlayCircle size={14} /> Chiếu ảnh
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('grid')}
                                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all", 
                                            viewMode === 'grid' ? "bg-white shadow text-blue-600" : "text-gray-500")}
                                    >
                                        <Grid size={14} /> Thư viện ({images.length})
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden bg-gray-50 flex flex-col">
                            {viewMode === 'grid' ? (
                                <div className="p-8 overflow-y-auto h-full custom-scrollbar">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                                        {images.map((img, idx) => (
                                            <div 
                                                key={img.id} 
                                                className="aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer group relative shadow-sm"
                                                onClick={() => { setViewMode('slideshow'); setCurrentIdx(idx); }}
                                            >
                                                <img src={img.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col relative bg-gray-900 overflow-hidden">
                                    <div className="flex-1 relative w-full h-full flex items-center justify-center p-4">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20">
                                            <button onClick={prevImage} className="p-4 rounded-full bg-black/40 text-white hover:bg-white hover:text-black transition-all shadow-xl backdrop-blur-md border border-white/10 active:scale-90">
                                                <ChevronLeft size={28} />
                                            </button>
                                        </div>
                                        <div className="w-full h-full flex items-center justify-center">
                                            <img src={images[currentIdx]?.imageUrl} className="max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-2xl" alt="" key={currentIdx} />
                                        </div>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
                                            <button onClick={nextImage} className="p-4 rounded-full bg-black/40 text-white hover:bg-white hover:text-black transition-all shadow-xl backdrop-blur-md border border-white/10 active:scale-90">
                                                <ChevronRight size={28} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-28 bg-black/20 border-t border-white/5 p-4 flex justify-center shrink-0 overflow-hidden">
                                        <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                                            {images.map((img, idx) => (
                                                <div
                                                    key={img.id}
                                                    ref={el => { thumbnailRefs.current[idx] = el }}
                                                    onClick={() => setCurrentIdx(idx)}
                                                    className={cn(
                                                        "h-full aspect-[16/10] rounded-xl overflow-hidden cursor-pointer border-2 transition-all shrink-0",
                                                        currentIdx === idx ? "border-blue-500 scale-105 shadow-xl opacity-100" : "border-transparent opacity-30 hover:opacity-70"
                                                    )}
                                                >
                                                    <img src={img.imageUrl} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="absolute top-4 left-6 bg-black/50 text-white px-4 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                                        {currentIdx + 1} / {images.length}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    )
}