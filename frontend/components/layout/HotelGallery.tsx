'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
    Images, X, ChevronLeft, ChevronRight, Star,
    Heart, Loader2, LayoutGrid, Play, BedDouble, ZoomIn, Camera
} from 'lucide-react'
import { HotelImageResponse } from '@/lib/api/hotel.api'
import { RoomTypeResponse } from '@/types/room.types'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import favoriteApi from '@/lib/api/favorite.api'
import toast from 'react-hot-toast'
import axiosInstance from '@/lib/api/axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import roomApi from '@/lib/api/room.api'

type ViewMode = 'grid' | 'slideshow'
type TabKey = 'all' | 'rooms'

interface Props {
    images: HotelImageResponse[]
    hotelId: number
    roomTypes?: RoomTypeResponse[]
    onBook?: (roomId: number) => void
    hasFullDates?: boolean
    nights?: number
    externalOpen?: boolean
    externalTab?: TabKey
    onExternalClose?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Slideshow tab "Tất cả"
// ─────────────────────────────────────────────────────────────────────────────
function HotelSlideshowView({ images }: { images: HotelImageResponse[] }) {
    const [idx, setIdx] = useState(0)
    const [auto, setAuto] = useState(true)
    const ref = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (auto && images.length > 1) {
            ref.current = setInterval(() => setIdx(i => (i + 1) % images.length), 3000)
        } else {
            if (ref.current) clearInterval(ref.current)
        }
        return () => { if (ref.current) clearInterval(ref.current) }
    }, [auto, images.length])

    if (!images.length) return null

    return (
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <img key={idx} src={images[idx].imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                {images.length > 1 && (
                    <>
                        <button onClick={() => { setIdx(i => (i - 1 + images.length) % images.length); setAuto(false) }}
                            className="absolute left-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center">
                            <ChevronLeft size={22} />
                        </button>
                        <button onClick={() => { setIdx(i => (i + 1) % images.length); setAuto(false) }}
                            className="absolute right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center">
                            <ChevronRight size={22} />
                        </button>
                    </>
                )}
                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full">{idx + 1} / {images.length}</div>
            </div>
            <div className="shrink-0 bg-gray-900 px-4 py-3 flex items-center gap-3">
                <button onClick={() => setAuto(a => !a)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${auto ? 'bg-blue-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <Play size={11} /> {auto ? 'Đang chiếu' : 'Tự động'}
                </button>
                <div className="flex gap-2 overflow-x-auto flex-1 no-scrollbar">
                    {images.map((img, i) => (
                        <button key={img.id} onClick={() => { setIdx(i); setAuto(false) }}
                            className={`shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-blue-400' : 'border-transparent opacity-50 hover:opacity-75'}`}>
                            <img src={img.imageUrl} className="w-full h-full object-cover" alt="" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Room Gallery (Grid & Slideshow)
// ─────────────────────────────────────────────────────────────────────────────
function RoomGalleryView({
    roomTypes, fullRooms, isLoading, onBook, hasFullDates, onClose, viewMode
}: {
    roomTypes: RoomTypeResponse[]
    fullRooms: RoomTypeResponse[]
    isLoading: boolean
    onBook?: (id: number) => void
    hasFullDates?: boolean
    onClose?: () => void
    viewMode: ViewMode
}) {
    const [selIdx, setSelIdx] = useState(0)
    const [slideIdx, setSlideIdx] = useState(0)
    const [auto, setAuto] = useState(false)
    const ref = useRef<ReturnType<typeof setInterval> | null>(null)

    const selectedFull = fullRooms[selIdx]
    const roomImages: string[] = useMemo(
        () => (selectedFull?.images ?? []).map((img: { imageUrl: string }) => img.imageUrl),
        [selectedFull]
    )

    // Slideshow Effect
    useEffect(() => {
        if (auto && roomImages.length > 1) {
            ref.current = setInterval(() => setSlideIdx(i => (i + 1) % roomImages.length), 3000)
        } else {
            if (ref.current) clearInterval(ref.current)
        }
        return () => { if (ref.current) clearInterval(ref.current) }
    }, [auto, roomImages.length])

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center text-gray-400 bg-white">
            <Loader2 className="animate-spin mr-2" size={22} />
            <span className="text-sm">Đang tải dữ liệu phòng...</span>
        </div>
    )

    // RENDER MODE GRID (THƯ VIỆN ẢNH PHÒNG)
    if (viewMode === 'grid') {
        return (
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto space-y-10">
                    {roomTypes.map((room, idx) => {
                        const full = fullRooms[idx]
                        const images = full?.images || []
                        return (
                            <div key={room.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-white">
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{room.typeName}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Camera size={12} /> {images.length} hình ảnh
                                        </p>
                                    </div>
                                    {onBook && full && (
                                        <button onClick={() => { onBook(full.id); onClose?.() }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                                            {hasFullDates ? 'Đặt ngay' : 'Xem giá'}
                                        </button>
                                    )}
                                </div>
                                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {images.length > 0 ? (
                                        images.map((img, imgIdx) => (
                                            <div key={img.id} className={`relative rounded-xl overflow-hidden bg-gray-100 group cursor-pointer ${imgIdx === 0 ? 'col-span-2 row-span-2' : 'aspect-square'}`}>
                                                <img src={img.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-4 py-10 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
                                            <BedDouble size={32} className="opacity-20 mb-2" />
                                            <p className="text-sm italic">Chưa có hình ảnh cho loại phòng này</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // RENDER MODE SLIDESHOW (CHIẾU ẢNH PHÒNG)
    return (
        <>
            {/* Sidebar danh sách phòng */}
            <div className="w-64 shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 pt-5 pb-3">Danh sách phòng</p>
                {roomTypes.map((room, idx) => {
                    const full = fullRooms[idx]
                    const thumb = full?.images?.[0]?.imageUrl || room.thumbnailUrl
                    const isSel = selIdx === idx
                    return (
                        <button key={room.id} 
                            onClick={() => { setSelIdx(idx); setSlideIdx(0); setAuto(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-l-[3px] transition-all ${isSel ? 'border-blue-600 bg-white shadow-sm' : 'border-transparent hover:bg-gray-100'}`}>
                            <div className="w-14 h-11 rounded-lg overflow-hidden bg-gray-200 shrink-0 shadow-sm">
                                {thumb ? <img src={thumb} className="w-full h-full object-cover" alt="" /> : <BedDouble size={14} className="m-auto mt-3 text-gray-300" />}
                            </div>
                            <div>
                                <span className={`text-[12px] font-bold leading-tight line-clamp-1 ${isSel ? 'text-blue-700' : 'text-gray-700'}`}>{room.typeName}</span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">{full?.images?.length || 0} ảnh</span>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Vùng hiển thị Slideshow */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
                {roomImages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <BedDouble size={40} className="opacity-20 mb-3" />
                        <p className="text-sm font-medium">Phòng này chưa cập nhật hình ảnh</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                            <img key={`${selIdx}-${slideIdx}`} src={roomImages[slideIdx]} alt="" className="max-w-full max-h-full object-contain" />
                            
                            <div className="absolute top-6 left-6 pointer-events-none">
                                <span className="bg-black/40 backdrop-blur-md text-white text-sm font-bold px-4 py-2 rounded-xl border border-white/10">
                                    {selectedFull?.typeName}
                                </span>
                            </div>

                            {roomImages.length > 1 && (
                                <>
                                    <button onClick={() => { setSlideIdx(i => (i - 1 + roomImages.length) % roomImages.length); setAuto(false) }}
                                        className="absolute left-5 w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors">
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button onClick={() => { setSlideIdx(i => (i + 1) % roomImages.length); setAuto(false) }}
                                        className="absolute right-5 w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors">
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}
                            <div className="absolute bottom-20 right-6 bg-black/50 text-white text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md">
                                {slideIdx + 1} / {roomImages.length}
                            </div>
                        </div>

                        <div className="shrink-0 bg-gray-900 px-5 py-4 flex items-center gap-4">
                            <button onClick={() => setAuto(a => !a)}
                                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${auto ? 'bg-blue-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                <Play size={12} fill={auto ? 'white' : 'none'} /> {auto ? 'Đang chiếu' : 'Tự động'}
                            </button>
                            <div className="flex gap-2.5 overflow-x-auto flex-1 no-scrollbar py-1">
                                {roomImages.map((url, i) => (
                                    <button key={i} onClick={() => { setSlideIdx(i); setAuto(false) }}
                                        className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === slideIdx ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                                        <img src={url} className="w-full h-full object-cover" alt="" />
                                    </button>
                                ))}
                            </div>
                            {onBook && selectedFull && (
                                <button onClick={() => { onBook(selectedFull.id); onClose?.() }}
                                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all active:scale-95">
                                    {hasFullDates ? 'Đặt phòng này' : 'Chọn ngày đặt'}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function HotelGallery({
    images, hotelId, roomTypes = [], onBook, hasFullDates,
    externalOpen, externalTab, onExternalClose,
}: Props) {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const router = useRouter()
    const [isTogglingFav, setIsTogglingFav] = useState(false)
    const [galleryOpen, setGalleryOpen] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [tab, setTab] = useState<TabKey>('all')
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

    // Sync external
    useEffect(() => {
        if (externalOpen !== undefined) {
            setGalleryOpen(externalOpen)
            if (externalOpen) { setViewMode('grid'); setLightboxIdx(null) }
        }
    }, [externalOpen])

    useEffect(() => {
        if (externalTab) {
            setTab(externalTab)
            setLightboxIdx(null)
            setViewMode(externalTab === 'rooms' ? 'slideshow' : 'grid')
        }
    }, [externalTab])

    const roomIds = useMemo(() => roomTypes.map(r => r.id), [roomTypes])
    const { data: fullRooms = [], isLoading: isRoomsLoading } = useQuery({
        queryKey: ['rooms-full-gallery', roomIds.join(',')],
        queryFn: () => Promise.all(roomIds.map(id => roomApi.getById(id).then(r => r.data))),
        enabled: galleryOpen && tab === 'rooms' && roomIds.length > 0,
        staleTime: 1000 * 60 * 10,
    })

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const { data: favStatus } = useQuery({
        queryKey: ['fav-status', hotelId, user?.id],
        queryFn: () => axiosInstance.get<{ isFavorited: boolean }>(`/api/favorites/${hotelId}/status`).then(r => r.data),
        enabled: !!token && !!hotelId,
    })
    const isFavorited = favStatus?.isFavorited ?? false

    // Keyboard navigation
    useEffect(() => {
        if (!galleryOpen) return
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { lightboxIdx !== null ? setLightboxIdx(null) : closeGallery(); return }
            if (lightboxIdx !== null && tab === 'all') {
                if (e.key === 'ArrowLeft') setLightboxIdx(i => (i! - 1 + images.length) % images.length)
                if (e.key === 'ArrowRight') setLightboxIdx(i => (i! + 1) % images.length)
            }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [galleryOpen, lightboxIdx, tab, images.length])

    const closeGallery = () => { setGalleryOpen(false); onExternalClose?.() }
    const openGallery = (t: TabKey = 'all') => {
        setTab(t); setViewMode('grid')
        setLightboxIdx(null); setGalleryOpen(true)
    }
    const switchTab = (t: TabKey) => {
        setTab(t); setLightboxIdx(null); setViewMode('grid')
    }

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!token) { toast.error('Vui lòng đăng nhập!'); router.push(`/login?redirect=/hotels/${hotelId}`); return }
        setIsTogglingFav(true)
        try {
            const res = await favoriteApi.toggle(hotelId)
            queryClient.setQueryData(['fav-status', hotelId, user?.id], { isFavorited: res.data.isFavorited })
            queryClient.invalidateQueries({ queryKey: ['my-favorites'] })
            toast.success(res.data.isFavorited ? 'Đã thêm vào yêu thích!' : 'Đã xóa khỏi yêu thích!')
        } catch { toast.error('Có lỗi xảy ra') }
        finally { setIsTogglingFav(false) }
    }

    const primaryImage = images.find(img => img.isPrimary) || images[0]
    const others = images.filter(img => img !== primaryImage)

    const renderInlineGrid = () => {
        const n = images.length
        if (!n) return <div className="h-full flex items-center justify-center"><BedDouble size={48} className="text-gray-300" /></div>
        if (n === 1) return <div className="h-full cursor-pointer overflow-hidden" onClick={() => openGallery()}><img src={images[0].imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" /></div>
        return (
            <div className="grid grid-cols-4 grid-rows-2 h-full gap-2">
                <div className="col-span-2 row-span-2 cursor-pointer overflow-hidden" onClick={() => openGallery()}><img src={primaryImage.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" /></div>
                {others.slice(0, 4).map((img, i) => (
                    <div key={img.id} className="relative cursor-pointer overflow-hidden" onClick={() => openGallery()}>
                        <img src={img.imageUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="" />
                        {i === 3 && images.length > 5 && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                <Images size={24} /><span className="font-bold text-base mt-1">+{images.length - 5}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="relative group/gallery">
            <div className="h-[500px] rounded-2xl overflow-hidden bg-gray-100 shadow-xl border border-gray-200">
                {renderInlineGrid()}
                <button onClick={() => openGallery('all')}
                    className="absolute bottom-5 right-5 flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl hover:bg-white text-sm font-bold text-gray-800 transition-all active:scale-95">
                    <Images size={16} className="text-blue-600" /> Xem tất cả ảnh
                </button>
                <button onClick={handleToggleFavorite} disabled={isTogglingFav}
                    className={`absolute top-5 right-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xl backdrop-blur-md transition-all active:scale-95 disabled:opacity-60
                        ${isFavorited ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-700 hover:bg-white border border-gray-200'}`}>
                    <Heart size={16} fill={isFavorited ? 'white' : 'none'} className={isFavorited ? 'animate-pulse' : ''} />
                    {isTogglingFav ? '...' : isFavorited ? 'Đã lưu' : 'Lưu lại'}
                </button>
            </div>

            {/* Gallery Modal */}
            {galleryOpen && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>

                    {/* Navbar */}
                    <div className="shrink-0 flex items-stretch h-[64px] px-6 bg-white border-b border-gray-100 shadow-sm">
                        <div className="flex items-center gap-8">
                            <div className="flex h-full">
                                <button onClick={() => switchTab('all')}
                                    className={`flex items-center px-4 text-sm font-bold border-b-2 transition-all ${tab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    Toàn cảnh ({images.length})
                                </button>
                                <button onClick={() => switchTab('rooms')}
                                    className={`flex items-center px-4 text-sm font-bold border-b-2 transition-all ${tab === 'rooms' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    Phòng nghỉ ({roomTypes.length})
                                </button>
                            </div>

                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => setViewMode('grid')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <LayoutGrid size={14} /> Thư viện
                                </button>
                                <button onClick={() => setViewMode('slideshow')}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'slideshow' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Play size={14} /> Trình chiếu
                                </button>
                            </div>
                        </div>

                        <button onClick={closeGallery} className="ml-auto self-center p-2.5 hover:bg-red-50 hover:text-red-500 rounded-full text-gray-400 transition-all">
                            <X size={22} />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {tab === 'all' ? (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {viewMode === 'grid' ? (
                                    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                                        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {images.map((img, idx) => (
                                                <div key={img.id}
                                                    className="relative group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 aspect-[4/3]"
                                                    onClick={() => setLightboxIdx(idx)}>
                                                    <img src={img.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                                                            <ZoomIn size={20} className="text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <HotelSlideshowView images={images} />
                                )}
                            </div>
                        ) : (
                            <RoomGalleryView
                                roomTypes={roomTypes}
                                fullRooms={fullRooms as RoomTypeResponse[]}
                                isLoading={isRoomsLoading}
                                onBook={onBook}
                                hasFullDates={hasFullDates}
                                onClose={closeGallery}
                                viewMode={viewMode}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Lightbox cho Thư viện */}
            {lightboxIdx !== null && (
                <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center animate-in zoom-in duration-200" onClick={() => setLightboxIdx(null)}>
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 p-2.5 rounded-full" onClick={() => setLightboxIdx(null)}>
                        <X size={24} />
                    </button>
                    <div className="relative flex items-center justify-center w-full px-24 h-[80vh]" onClick={e => e.stopPropagation()}>
                        {images.length > 1 && (
                            <>
                                <button className="absolute left-8 bg-white/5 hover:bg-white/20 p-4 rounded-full text-white transition-all" onClick={() => setLightboxIdx(i => (i! - 1 + images.length) % images.length)}><ChevronLeft size={32} /></button>
                                <button className="absolute right-8 bg-white/5 hover:bg-white/20 p-4 rounded-full text-white transition-all" onClick={() => setLightboxIdx(i => (i! + 1) % images.length)}><ChevronRight size={32} /></button>
                            </>
                        )}
                        <img src={images[lightboxIdx].imageUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    </div>
                    <div className="mt-6 flex flex-col items-center gap-2">
                        <p className="text-white font-medium text-sm">Ảnh {lightboxIdx + 1} trên {images.length}</p>
                        <div className="flex gap-1.5">
                            {images.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === lightboxIdx ? 'bg-blue-500 w-4' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}