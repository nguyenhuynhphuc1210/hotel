'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, BedDouble, Users, Maximize2, Star, ZoomIn, Loader2 } from 'lucide-react'
import { RoomTypeResponse } from '@/types/room.types'
import { useQuery } from '@tanstack/react-query'
import roomApi from '@/lib/api/room.api'

interface RoomGalleryModalProps {
    room: RoomTypeResponse
    onClose: () => void
    onBook: (roomId: number) => void
    hasFullDates: boolean
    nights: number
}

type TabKey = 'all' 

const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    
]

export default function RoomGalleryModal({
    room: basicRoom, // Đổi tên prop nhận vào thành basicRoom
    onClose,
    onBook,
    hasFullDates,
    nights,
}: RoomGalleryModalProps) {
    // 1. Gọi API lấy chi tiết đầy đủ của phòng (bao gồm mảng images)
    const { data: fullRoom, isLoading } = useQuery({
        queryKey: ['room-detail-public', basicRoom.id],
        queryFn: () => roomApi.getById(basicRoom.id).then(r => r.data),
        enabled: !!basicRoom.id,
    })

    // 2. Ưu tiên lấy dữ liệu từ fullRoom, nếu chưa tải xong thì dùng basicRoom
    const room = fullRoom || basicRoom
    
    // 3. Lấy mảng ảnh từ room
    const images = useMemo(() => room.images ?? [], [room.images])
    const allUrls = useMemo(() => images.map(i => i.imageUrl), [images])

    const [tab, setTab] = useState<TabKey>('all')
    const [mainIdx, setMainIdx] = useState(0)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIdx, setLightboxIdx] = useState(0)

    // Lọc ảnh (Hiện tại mặc định lấy tất cả, có thể mở rộng nếu backend có tag)
    const filtered = allUrls

    const totalPrice = room.basePrice * (nights || 1)

    const prev = useCallback(() => {
        setMainIdx(i => (i - 1 + filtered.length) % filtered.length)
    }, [filtered.length])

    const next = useCallback(() => {
        setMainIdx(i => (i + 1) % filtered.length)
    }, [filtered.length])

    const openLightbox = (idx: number) => {
        setLightboxIdx(idx)
        setLightboxOpen(true)
    }

    // Điều hướng bàn phím
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (lightboxOpen) setLightboxOpen(false)
                else onClose()
            }
            if (e.key === 'ArrowLeft') lightboxOpen ? setLightboxIdx(i => (i - 1 + filtered.length) % filtered.length) : prev()
            if (e.key === 'ArrowRight') lightboxOpen ? setLightboxIdx(i => (i + 1) % filtered.length) : next()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [lightboxOpen, filtered.length, prev, next, onClose])

    return (
        <>
            {/* ── Lightbox (Khi nhấn Phóng to) ── */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.92)' }}
                    onClick={() => setLightboxOpen(false)}
                >
                    <button
                        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/10"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <X size={20} />
                    </button>

                    {filtered.length > 1 && (
                        <>
                            <button
                                className="absolute left-4 w-12 h-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-all"
                                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + filtered.length) % filtered.length) }}
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                className="absolute right-4 w-12 h-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-all"
                                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % filtered.length) }}
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}

                    <img
                        src={filtered[lightboxIdx]}
                        alt=""
                        className="rounded-xl object-contain shadow-2xl"
                        style={{ maxWidth: '86vw', maxHeight: '80vh' }}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}

            {/* ── Modal Chính ── */}
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300"
                    style={{ maxWidth: 960, maxHeight: '90vh' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Top Bar */}
                    <div className="shrink-0 flex items-center justify-between px-6 pt-4 pb-0 border-b border-gray-100">
                        <div className="flex items-center gap-1">
                            {TABS.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => { setTab(t.key); setMainIdx(0) }}
                                    className="relative px-4 py-3 text-sm font-bold transition-all"
                                    style={{
                                        color: tab === t.key ? '#1D4ED8' : '#6B7280',
                                        borderBottom: tab === t.key ? '3px solid #1D4ED8' : '3px solid transparent',
                                    }}
                                >
                                    {t.label}
                                    {t.key === 'all' && (
                                        <span className="ml-1.5 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                                            {isLoading ? '...' : filtered.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* LEFT: Thư viện ảnh */}
                        <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 border-r">
                            {isLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                    <Loader2 className="animate-spin mb-2" size={32} />
                                    <p className="text-sm">Đang tải ảnh phòng...</p>
                                </div>
                            ) : filtered.length > 0 ? (
                                <>
                                    <div className="relative flex-1 bg-gray-900 flex items-center justify-center group overflow-hidden">
                                        <img
                                            src={filtered[mainIdx]}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        
                                        {/* Nav */}
                                        <button onClick={prev} className="absolute left-4 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"><ChevronLeft size={20}/></button>
                                        <button onClick={next} className="absolute right-4 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"><ChevronRight size={20}/></button>
                                        
                                        <div className="absolute bottom-4 right-4 flex gap-2">
                                            <button onClick={() => openLightbox(mainIdx)} className="bg-black/50 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-black/70 transition-colors">
                                                <ZoomIn size={14}/> Phóng to
                                            </button>
                                            <div className="bg-black/50 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                                                {mainIdx + 1} / {filtered.length}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Thumbnail strip */}
                                    <div className="p-4 flex gap-2 overflow-x-auto bg-white border-t scrollbar-hide">
                                        {filtered.map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setMainIdx(idx)}
                                                className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${idx === mainIdx ? 'border-blue-600 scale-105' : 'border-transparent opacity-60'}`}
                                            >
                                                <img src={url} className="w-full h-full object-cover" alt="" />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                    <BedDouble size={48} className="opacity-20 mb-2" />
                                    <p className="text-sm">Loại phòng này chưa cập nhật ảnh</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Thông tin phòng */}
                        <div className="w-72 shrink-0 flex flex-col p-6 bg-white overflow-y-auto">
                            <div className="flex-1 space-y-5">
                                <div>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Loại phòng</span>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight mt-1">{room.typeName}</h2>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Users size={16} className="text-blue-500" />
                                        <span>{room.maxAdults} Người lớn, {room.maxChildren} Trẻ em</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Maximize2 size={16} className="text-blue-500" />
                                        <span>{room.roomSize} m²</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <BedDouble size={16} className="text-blue-500" />
                                        <span>{room.bedType}</span>
                                    </div>
                                </div>

                                {room.description && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 leading-relaxed italic">{room.description}</p>
                                    </div>
                                )}                                
                            </div>

                            <div className="mt-6 space-y-2">
                                <button
                                    onClick={() => { onBook(room.id); onClose() }}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    {hasFullDates ? 'Đặt phòng ngay' : 'Chọn ngày để xem giá'}
                                </button>
                                <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                                    Quay lại
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}