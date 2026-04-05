'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    X, Upload, Star, Trash2, Loader2, Grid3X3, List,
    ChevronLeft, ChevronRight, ZoomIn, CheckCircle2, Image as ImageIcon,
    Images, LayoutGrid,
} from 'lucide-react'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import roomApi from '@/lib/api/room.api'
import toast from 'react-hot-toast'
import { RoomTypeResponse, RoomImageResponse } from '@/types/room.types'

type TabType = 'all' | 'primary' | 'others'
type ViewMode = 'grid' | 'list'

export function RoomImageModal({
    room,
    onClose,
}: {
    room: RoomTypeResponse
    onClose: () => void
}) {
    const qc = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data: fullRoom, isLoading: isFetchingRoom } = useQuery({
        queryKey: ['room-detail', room.id],
        queryFn: () => roomApi.getById(room.id).then(r => r.data),
        enabled: !!room.id,
    })

    const [images, setImages] = useState<RoomImageResponse[]>([])
    const [uploading, setUploading] = useState(false)
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
    const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null)
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [tab, setTab] = useState<TabType>('all')
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)

    useEffect(() => {
        if (fullRoom?.images) {
            setImages(fullRoom.images)
        }
    }, [fullRoom])

    const refreshData = useCallback(() => {
        qc.invalidateQueries({ queryKey: ['owner-rooms'] })
        qc.invalidateQueries({ queryKey: ['room-detail', room.id] })
    }, [qc, room.id])

    // ── Upload ────────────────────────────────────────────────
    const handleFiles = useCallback(async (files: File[]) => {
        if (!files.length) return
        setUploading(true)
        try {
            const form = new FormData()
            form.append('roomTypeId', String(room.id))
            files.forEach(f => form.append('files', f))
            const res = await axiosInstance.post(API_CONFIG.ENDPOINTS.ROOM_IMAGES_UPLOAD, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            toast.success(`Đã tải lên ${files.length} ảnh!`)
            refreshData()
            if (Array.isArray(res.data)) {
                setImages(prev => [...prev, ...res.data])
            }
        } catch {
            toast.error('Tải ảnh thất bại!')
        } finally {
            setUploading(false)
        }
    }, [room.id, refreshData])

    // ── Delete single ─────────────────────────────────────────
    const handleDelete = async (img: RoomImageResponse) => {
        if (!confirm('Xoá ảnh này?')) return
        setDeletingIds(prev => new Set(prev).add(img.id))
        try {
            await axiosInstance.delete(API_CONFIG.ENDPOINTS.ROOM_IMAGES_DELETE, {
                params: { publicId: img.publicId },
            })
            setImages(prev => prev.filter(i => i.id !== img.id))
            setSelected(prev => { const s = new Set(prev); s.delete(img.id); return s })
            toast.success('Đã xoá ảnh!')
            refreshData()
        } catch {
            toast.error('Xoá thất bại!')
        } finally {
            setDeletingIds(prev => { const s = new Set(prev); s.delete(img.id); return s })
        }
    }

    // ── Delete selected ───────────────────────────────────────
    const handleDeleteSelected = async () => {
        if (!selected.size || !confirm(`Xoá ${selected.size} ảnh đã chọn?`)) return
        const ids = Array.from(selected)
        await Promise.all(
            ids.map(id => {
                const img = images.find(i => i.id === id)
                if (!img) return Promise.resolve()
                return axiosInstance.delete(API_CONFIG.ENDPOINTS.ROOM_IMAGES_DELETE, {
                    params: { publicId: img.publicId },
                })
            })
        )
        setImages(prev => prev.filter(i => !selected.has(i.id)))
        setSelected(new Set())
        toast.success(`Đã xoá ${ids.length} ảnh!`)
        refreshData()
    }

    // ── Set primary ───────────────────────────────────────────
    const handleSetPrimary = async (img: RoomImageResponse) => {
        setSettingPrimaryId(img.id)
        try {
            await axiosInstance.put(API_CONFIG.ENDPOINTS.ROOM_IMAGE_SET_PRIMARY(img.id))
            setImages(prev => prev.map(i => ({ ...i, isPrimary: i.id === img.id })))
            toast.success('Đã đặt làm ảnh đại diện!')
            refreshData()
        } catch {
            toast.error('Thất bại!')
        } finally {
            setSettingPrimaryId(null)
        }
    }

    // ── Helpers ───────────────────────────────────────────────
    const toggleSelect = (id: number) => {
        setSelected(prev => {
            const s = new Set(prev)
            s.has(id) ? s.delete(id) : s.add(id)
            return s
        })
    }

    const filtered =
        tab === 'primary' ? images.filter(i => i.isPrimary) :
            tab === 'others' ? images.filter(i => !i.isPrimary) :
                images

    const lightboxNav = (dir: number) => {
        if (lightboxIdx === null) return
        setLightboxIdx((lightboxIdx + dir + filtered.length) % filtered.length)
    }

    const primaryCount = images.filter(i => i.isPrimary).length
    const othersCount = images.filter(i => !i.isPrimary).length

    return (
        <>
            {/* ── Lightbox ── */}
            {lightboxIdx !== null && (
                <div
                    className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5"
                    style={{ background: 'rgba(0,0,0,0.92)' }}
                    onClick={() => setLightboxIdx(null)}
                >
                    <button
                        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white"
                        style={{ background: 'rgba(255,255,255,0.12)' }}
                        onClick={() => setLightboxIdx(null)}
                    >
                        <X size={18} />
                    </button>
                    <img
                        src={filtered[lightboxIdx]?.imageUrl}
                        alt=""
                        className="rounded-2xl object-contain shadow-2xl"
                        style={{ maxWidth: '82vw', maxHeight: '72vh' }}
                        onClick={e => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => lightboxNav(-1)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                            <ChevronLeft size={15} /> Trước
                        </button>
                        <span className="text-sm px-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {lightboxIdx + 1} / {filtered.length}
                        </span>
                        <button
                            onClick={() => lightboxNav(1)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                            Sau <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Modal ── */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            >
                <div
                    className="bg-white rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden"
                    style={{ maxWidth: 800, maxHeight: '92vh' }}
                >
                    {/* ── Header ── */}
                    <div className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                                    style={{ background: '#EFF6FF' }}
                                >
                                    <Images size={19} style={{ color: '#2563EB' }} />
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
                                        {room.typeName}
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {room.roomSize && `${room.roomSize}m²`}
                                        {room.maxAdults && ` · ${room.maxAdults} người lớn`}
                                        {room.maxChildren ? `, ${room.maxChildren} trẻ em` : ''}
                                        {room.basePrice
                                            ? ` · ${Number(room.basePrice).toLocaleString('vi-VN')}₫/đêm`
                                            : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <input
                                    ref={fileInputRef}
                                    type="file" multiple accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                        handleFiles(Array.from(e.target.files ?? []))
                                        e.target.value = ''
                                    }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                                    style={{ background: '#2563EB' }}
                                >
                                    {uploading
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <Upload size={14} />
                                    }
                                    Tải ảnh lên
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Stats chips */}
                        <div className="flex items-center gap-2 mt-4">
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                style={{ background: '#F1F5F9', color: '#475569' }}
                            >
                                <LayoutGrid size={11} />
                                {images.length} ảnh
                            </div>
                            {primaryCount > 0 && (
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                    style={{ background: '#FFFBEB', color: '#B45309' }}
                                >
                                    <Star size={11} fill="currentColor" />
                                    {primaryCount} ảnh chính
                                </div>
                            )}
                            {selected.size > 0 && (
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                    style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                                >
                                    <CheckCircle2 size={11} />
                                    {selected.size} đã chọn
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Toolbar ── */}
                    <div
                        className="shrink-0 flex items-center justify-between px-6 py-2 border-b border-gray-100"
                        style={{ background: '#F8FAFC' }}
                    >
                        <div className="flex gap-1">
                            {([
                                { key: 'all' as TabType, label: 'Tất cả', count: images.length },
                                { key: 'primary' as TabType, label: 'Ảnh chính', count: primaryCount },
                                { key: 'others' as TabType, label: 'Ảnh phụ', count: othersCount },
                            ]).map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => { setTab(t.key); setSelected(new Set()) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                    style={
                                        tab === t.key
                                            ? { background: '#2563EB', color: '#fff' }
                                            : { background: 'transparent', color: '#64748B' }
                                    }
                                >
                                    {t.label}
                                    <span
                                        className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                                        style={
                                            tab === t.key
                                                ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                                                : { background: '#E2E8F0', color: '#475569' }
                                        }
                                    >
                                        {t.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1">
                            {(['grid', 'list'] as ViewMode[]).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setViewMode(v)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                    style={
                                        viewMode === v
                                            ? { background: '#EFF6FF', color: '#2563EB' }
                                            : { background: 'transparent', color: '#94A3B8' }
                                    }
                                >
                                    {v === 'grid' ? <Grid3X3 size={14} /> : <List size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                        {/* Drop zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={e => {
                                e.preventDefault()
                                setIsDragOver(false)
                                handleFiles(
                                    Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                                )
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
                            style={{
                                borderColor: isDragOver ? '#2563EB' : '#CBD5E1',
                                background: isDragOver ? '#EFF6FF' : '#F8FAFC',
                            }}
                        >
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background: isDragOver ? '#DBEAFE' : '#E2E8F0' }}
                            >
                                <Upload size={16} style={{ color: isDragOver ? '#2563EB' : '#94A3B8' }} />
                            </div>
                            <p className="text-sm text-gray-500">
                                Kéo thả ảnh vào đây hoặc{' '}
                                <span className="font-semibold" style={{ color: '#2563EB' }}>
                                    nhấn để chọn file
                                </span>
                            </p>
                            <p className="text-xs text-gray-400">PNG, JPG, WEBP · Nhiều file cùng lúc</p>
                        </div>

                        {/* Loading */}
                        {isFetchingRoom ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Loader2 size={28} className="animate-spin" style={{ color: '#2563EB' }} />
                                <p className="text-sm text-gray-400">Đang tải danh sách ảnh...</p>
                            </div>

                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border-2 border-dashed border-gray-100">
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                    style={{ background: '#F1F5F9' }}
                                >
                                    <ImageIcon size={24} style={{ color: '#CBD5E1' }} />
                                </div>
                                <p className="text-sm font-medium text-gray-400">Chưa có ảnh nào</p>
                                <p className="text-xs text-gray-300">Tải ảnh lên để bắt đầu</p>
                            </div>

                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-3 gap-3">
                                {filtered.map((img, idx) => {
                                    // KEY FIX: dùng `id-idx` để luôn unique, tránh lỗi key warning
                                    const itemKey = `img-${img.id ?? 'x'}-${idx}`
                                    const isSelected = selected.has(img.id)
                                    const isDeleting = deletingIds.has(img.id)
                                    return (
                                        <div
                                            key={itemKey}
                                            onClick={() => toggleSelect(img.id)}
                                            onDoubleClick={() => setLightboxIdx(idx)}
                                            className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all"
                                            style={{
                                                border: img.isPrimary
                                                    ? '2px solid #F59E0B'
                                                    : isSelected
                                                        ? '2px solid #2563EB'
                                                        : '2px solid transparent',
                                                boxShadow: isSelected
                                                    ? '0 0 0 3px rgba(37,99,235,0.15)'
                                                    : 'none',
                                            }}
                                        >
                                            <img
                                                src={img.imageUrl}
                                                alt=""
                                                className="w-full object-cover"
                                                style={{ aspectRatio: '4/3' }}
                                                loading="lazy"
                                            />

                                            {/* Hover overlay */}
                                            <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5"
                                                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }}
                                            >
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setLightboxIdx(idx) }}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                                                        style={{ background: 'rgba(255,255,255,0.9)' }}
                                                    >
                                                        <ZoomIn size={13} style={{ color: '#1E293B' }} />
                                                    </button>
                                                </div>
                                                <div className="flex gap-1.5 justify-end">
                                                    {!img.isPrimary && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handleSetPrimary(img) }}
                                                            disabled={settingPrimaryId === img.id}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
                                                            style={{ background: '#F59E0B', color: '#fff' }}
                                                        >
                                                            {settingPrimaryId === img.id
                                                                ? <Loader2 size={11} className="animate-spin" />
                                                                : <Star size={11} />
                                                            }
                                                            Chính
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDelete(img) }}
                                                        disabled={isDeleting}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
                                                        style={{ background: '#EF4444', color: '#fff' }}
                                                    >
                                                        {isDeleting
                                                            ? <Loader2 size={11} className="animate-spin" />
                                                            : <Trash2 size={11} />
                                                        }
                                                        Xoá
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Primary badge */}
                                            {img.isPrimary && (
                                                <div
                                                    className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                                                    style={{ background: '#F59E0B', color: '#fff' }}
                                                >
                                                    <Star size={9} fill="white" /> Ảnh chính
                                                </div>
                                            )}

                                            {/* Selected indicator */}
                                            {isSelected && (
                                                <div
                                                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                                    style={{ background: '#2563EB' }}
                                                >
                                                    <CheckCircle2 size={14} style={{ color: '#fff' }} />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                        ) : (
                            <div className="space-y-2">
                                {filtered.map((img, idx) => {
                                    const itemKey = `img-${img.id ?? 'x'}-${idx}`
                                    const isSelected = selected.has(img.id)
                                    return (
                                        <div
                                            key={itemKey}
                                            onClick={() => toggleSelect(img.id)}
                                            className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer group transition-all"
                                            style={{
                                                borderColor: isSelected ? '#93C5FD' : '#F1F5F9',
                                                background: isSelected ? '#EFF6FF' : '#fff',
                                            }}
                                        >
                                            <img
                                                src={img.imageUrl}
                                                alt=""
                                                className="rounded-xl object-cover shrink-0"
                                                style={{ width: 72, height: 54 }}
                                                onDoubleClick={e => { e.stopPropagation(); setLightboxIdx(idx) }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-800 truncate">
                                                        ảnh_{img.id}
                                                    </span>
                                                    {img.isPrimary && (
                                                        <span
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                                                            style={{ background: '#FFFBEB', color: '#B45309' }}
                                                        >
                                                            <Star size={9} /> Chính
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">ID: {img.id}</p>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!img.isPrimary && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleSetPrimary(img) }}
                                                        disabled={settingPrimaryId === img.id}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-60"
                                                        style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}
                                                    >
                                                        {settingPrimaryId === img.id
                                                            ? <Loader2 size={11} className="animate-spin" />
                                                            : <Star size={11} />
                                                        }
                                                        Đặt chính
                                                    </button>
                                                )}
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDelete(img) }}
                                                    disabled={deletingIds.has(img.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-60"
                                                    style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
                                                >
                                                    {deletingIds.has(img.id)
                                                        ? <Loader2 size={11} className="animate-spin" />
                                                        : <Trash2 size={11} />
                                                    }
                                                    Xoá
                                                </button>
                                            </div>
                                            {isSelected && (
                                                <CheckCircle2 size={16} className="shrink-0" style={{ color: '#2563EB' }} />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <div
                        className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-gray-100"
                        style={{ background: '#F8FAFC' }}
                    >
                        <p className="text-xs text-gray-400">
                            {images.length} ảnh · Nhấn để chọn · Nhấn đôi để phóng to
                        </p>
                        <div className="flex gap-2">
                            {selected.size > 0 && (
                                <button
                                    onClick={handleDeleteSelected}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                                    style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
                                >
                                    <Trash2 size={12} /> Xoá {selected.size} ảnh
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                                style={{ border: '1px solid #E2E8F0' }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </>
    )
}