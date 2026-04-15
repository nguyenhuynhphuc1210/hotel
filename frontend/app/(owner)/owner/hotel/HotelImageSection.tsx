'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Upload, Star, Trash2, Loader2,
    Plus, X, ZoomIn, ChevronLeft, ChevronRight, Images,
} from 'lucide-react'
import hotelImageApi from '@/lib/api/hotel-image.api'
import { HotelResponse, HotelImageResponse } from '@/lib/api/hotel.api'
import toast from 'react-hot-toast'

function Lightbox({ images, startIdx, onClose }: {
    images: HotelImageResponse[]
    startIdx: number
    onClose: () => void
}) {
    const [idx, setIdx] = useState(startIdx)
    const nav = (dir: number) => setIdx(i => (i + dir + images.length) % images.length)

    return (
        <div
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(0,0,0,0.94)' }}
            onClick={onClose}
        >
            <button
                className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(255,255,255,0.12)' }}
                onClick={onClose}
            >
                <X size={18} />
            </button>
            <img
                src={images[idx]?.imageUrl}
                alt=""
                className="rounded-2xl object-contain shadow-2xl"
                style={{ maxWidth: '86vw', maxHeight: '74vh' }}
                onClick={e => e.stopPropagation()}
            />
            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => nav(-1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                    <ChevronLeft size={15} /> Trước
                </button>
                <span className="text-sm px-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {idx + 1} / {images.length}
                </span>
                <button
                    onClick={() => nav(1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                    Sau <ChevronRight size={15} />
                </button>
            </div>
        </div>
    )
}

export function HotelImageSection({ hotel }: { hotel: HotelResponse }) {
    const qc = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
    const [showAllModal, setShowAllModal] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null)

    const images: HotelImageResponse[] = hotel.images ?? []

    const refresh = () => qc.invalidateQueries({ queryKey: ['owner-hotels'] })

    const uploadMutation = useMutation({
        mutationFn: (files: File[]) => hotelImageApi.upload(hotel.id, files),
        onSuccess: () => { toast.success('Upload ảnh thành công!'); refresh() },
        onError: () => toast.error('Upload thất bại!'),
    })

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? [])
        if (files.length) uploadMutation.mutate(files)
        e.target.value = ''
    }

    const handleDelete = async (img: HotelImageResponse) => {
        if (!confirm('Xoá ảnh này?')) return
        setDeletingId(img.id)
        try {
            await hotelImageApi.delete(String(img.publicId))
            toast.success('Đã xoá ảnh!')
            refresh()
        } catch { toast.error('Xoá thất bại!') }
        finally { setDeletingId(null) }
    }

    const handleSetPrimary = async (img: HotelImageResponse) => {
        setSettingPrimaryId(img.id)
        try {
            await hotelImageApi.setPrimary(img.id)
            toast.success('Đã đặt làm ảnh đại diện!')
            refresh()
        } catch { toast.error('Thất bại!') }
        finally { setSettingPrimaryId(null) }
    }

    const renderGallery = () => {
        const count = images.length
        if (count === 0) return null

        if (count === 1) {
            return (
                <div className="relative h-full w-full cursor-pointer group" onClick={() => setLightboxIdx(0)}>
                    <img src={images[0].imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                    <ImageHoverActions img={images[0]} onDelete={() => handleDelete(images[0])} onSetPrimary={() => handleSetPrimary(images[0])} isDeleting={deletingId === images[0].id} isSettingPrimary={settingPrimaryId === images[0].id} hidePrimary />
                </div>
            )
        }

        if (count === 2) {
            return (
                <div className="grid grid-cols-2 h-full gap-2">
                    {images.map((img, idx) => (
                        <div key={img.id} className="relative h-full cursor-pointer group overflow-hidden" onClick={() => setLightboxIdx(idx)}>
                            <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                            <ImageHoverActions img={img} onDelete={() => handleDelete(img)} onSetPrimary={() => handleSetPrimary(img)} isDeleting={deletingId === img.id} isSettingPrimary={settingPrimaryId === img.id} hidePrimary={img.isPrimary} />
                        </div>
                    ))}
                </div>
            )
        }

        if (count === 3) {
            return (
                <div className="grid grid-cols-3 h-full gap-2">
                    <div className="col-span-2 relative cursor-pointer group overflow-hidden" onClick={() => setLightboxIdx(0)}>
                        <img src={images[0].imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                        <ImageHoverActions img={images[0]} onDelete={() => handleDelete(images[0])} onSetPrimary={() => handleSetPrimary(images[0])} isDeleting={deletingId === images[0].id} isSettingPrimary={settingPrimaryId === images[0].id} hidePrimary />
                    </div>
                    <div className="col-span-1 grid grid-rows-2 gap-2">
                        {images.slice(1, 3).map((img, idx) => (
                            <div key={img.id} className="relative cursor-pointer group overflow-hidden" onClick={() => setLightboxIdx(idx + 1)}>
                                <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                <ImageHoverActions img={img} onDelete={() => handleDelete(img)} onSetPrimary={() => handleSetPrimary(img)} isDeleting={deletingId === img.id} isSettingPrimary={settingPrimaryId === img.id} />
                            </div>
                        ))}
                    </div>
                </div>
            )
        }

        const primaryImg = images.find(i => i.isPrimary) ?? images[0]
        const others = images.filter(i => i.id !== primaryImg.id).slice(0, 4)

        return (
            <div className="grid grid-cols-4 grid-rows-2 h-full gap-2">
                <div className="col-span-2 row-span-2 relative cursor-pointer group overflow-hidden" onClick={() => setLightboxIdx(images.indexOf(primaryImg))}>
                    <img src={primaryImg.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                    <ImageHoverActions img={primaryImg} onDelete={() => handleDelete(primaryImg)} onSetPrimary={() => handleSetPrimary(primaryImg)} isDeleting={deletingId === primaryImg.id} isSettingPrimary={settingPrimaryId === primaryImg.id} hidePrimary />
                </div>
                {others.map((img, idx) => (
                    <div key={img.id} className="relative cursor-pointer group overflow-hidden" onClick={() => setLightboxIdx(images.indexOf(img))}>
                        <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                        <ImageHoverActions img={img} onDelete={() => handleDelete(img)} onSetPrimary={() => handleSetPrimary(img)} isDeleting={deletingId === img.id} isSettingPrimary={settingPrimaryId === img.id} />
                    </div>
                ))}
            </div>
        )
    }

    // ── Empty state ──
    if (images.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Images size={16} style={{ color: '#2563EB' }} />
                        <h2 className="text-sm font-bold text-gray-900">Ảnh khách sạn</h2>
                    </div>
                    <UploadButton
                        onFileChange={handleFileUpload}
                        isPending={uploadMutation.isPending}
                        fileInputRef={fileInputRef}
                    />
                </div>
                <div
                    className="flex flex-col items-center justify-center gap-3 py-16 mx-6 mb-6 mt-4 rounded-2xl border-2 border-dashed cursor-pointer transition-colors"
                    style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                        <Images size={24} style={{ color: '#2563EB' }} />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Chưa có ảnh nào</p>
                    <p className="text-xs text-gray-400">Upload ảnh để hiển thị trên trang khách sạn</p>
                    <button
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white mt-1"
                        style={{ background: '#2563EB' }}
                        onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                    >
                        <Plus size={14} /> Thêm ảnh đầu tiên
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            {lightboxIdx !== null && (
                <Lightbox images={images} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
            )}

            {showAllModal && (
                <AllImagesModal
                    images={images}
                    onClose={() => setShowAllModal(false)}
                    onDelete={handleDelete}
                    onSetPrimary={handleSetPrimary}
                    onOpenLightbox={idx => { setShowAllModal(false); setLightboxIdx(idx) }}
                    deletingId={deletingId}
                    settingPrimaryId={settingPrimaryId}
                    onUpload={() => fileInputRef.current?.click()}
                    isProcessing={uploadMutation.isPending}
                    fileInputRef={fileInputRef}
                    onFileChange={handleFileUpload}
                    uploadPending={uploadMutation.isPending}
                />
            )}

            <input
                ref={fileInputRef}
                type="file" multiple accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
            />

            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Images size={18} className="text-blue-600" />
                        <h2 className="text-base font-bold text-gray-900">Hình ảnh khách sạn</h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600">{images.length} ảnh</span>
                    </div>
                    <UploadButton
                        onFileChange={handleFileUpload}
                        isPending={uploadMutation.isPending}
                        fileInputRef={fileInputRef}
                    />
                </div>

                <div className="p-4">
                    <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ height: 450 }}>
                        {renderGallery()}
                        <button
                            onClick={() => setShowAllModal(true)}
                            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-800 bg-white/90 hover:bg-white shadow-xl backdrop-blur-md transition-all active:scale-95 border border-white/50 z-10"
                        >
                            <Images size={16} className="text-blue-600" />
                            Quản lý tất cả ({images.length})
                        </button>
                        <div className="absolute top-4 left-4 z-10 pointer-events-none">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-lg">
                                <Star size={12} fill="white" /> Ảnh đại diện
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

function ImageHoverActions({ img, onDelete, onSetPrimary, isDeleting, isSettingPrimary, hidePrimary = false }: {
    img: HotelImageResponse
    onDelete: () => void
    onSetPrimary: () => void
    isDeleting: boolean
    isSettingPrimary: boolean
    hidePrimary?: boolean
}) {
    return (
        <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
            {!hidePrimary && !img.isPrimary && (
                <button
                    onClick={e => { e.stopPropagation(); onSetPrimary() }}
                    disabled={isSettingPrimary}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
                    style={{ background: '#F59E0B', color: '#fff' }}
                >
                    {isSettingPrimary ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                    Đặt chính
                </button>
            )}
            <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                disabled={isDeleting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
                style={{ background: '#EF4444', color: '#fff' }}
            >
                {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Xoá
            </button>
        </div>
    )
}

function UploadButton({ onFileChange, isPending, fileInputRef }: {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    isPending: boolean
    fileInputRef: React.RefObject<HTMLInputElement | null>
}) {
    return (
        <label
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer transition-opacity"
            style={{
                background: '#2563EB',
                opacity: isPending ? 0.6 : 1,
                pointerEvents: isPending ? 'none' : 'auto',
            }}
        >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Upload ảnh
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={onFileChange} />
        </label>
    )
}

function AllImagesModal({ images, onClose, onDelete, onSetPrimary, onOpenLightbox,
    deletingId, settingPrimaryId, onUpload, isProcessing,
    fileInputRef, onFileChange, uploadPending,
}: {
    images: HotelImageResponse[]
    onClose: () => void
    onDelete: (img: HotelImageResponse) => void
    onSetPrimary: (img: HotelImageResponse) => void
    onOpenLightbox: (idx: number) => void
    deletingId: number | null
    settingPrimaryId: number | null
    onUpload: () => void
    isProcessing: boolean
    fileInputRef: React.RefObject<HTMLInputElement | null>
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    uploadPending: boolean
}) {
    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full flex flex-col overflow-hidden"
                style={{ maxWidth: 900, maxHeight: '92vh' }}
            >
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                            <Images size={18} style={{ color: '#2563EB' }} />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-gray-900">Tất cả ảnh khách sạn</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{images.length} ảnh · Nhấn đôi để phóng to</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <UploadButton
                            onFileChange={onFileChange}
                            isPending={uploadPending}
                            fileInputRef={fileInputRef}
                        />
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-3 gap-4">
                        {images.map((img, idx) => (
                            <div
                                key={`modal-img-${img.id}-${idx}`}
                                className="relative rounded-2xl overflow-hidden group cursor-pointer"
                                style={{
                                    aspectRatio: '4/3',
                                    border: img.isPrimary ? '2.5px solid #F59E0B' : '2px solid transparent',
                                }}
                                onDoubleClick={() => onOpenLightbox(idx)}
                            >
                                <img
                                    src={img.imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3"
                                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)' }}
                                >
                                    <div className="flex justify-end">
                                        <button
                                            onClick={e => { e.stopPropagation(); onOpenLightbox(idx) }}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                                            style={{ background: 'rgba(255,255,255,0.9)' }}
                                        >
                                            <ZoomIn size={13} style={{ color: '#1E293B' }} />
                                        </button>
                                    </div>
                                    <div className="flex gap-1.5 justify-end">
                                        {!img.isPrimary && (
                                            <button
                                                onClick={e => { e.stopPropagation(); onSetPrimary(img) }}
                                                disabled={settingPrimaryId === img.id}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
                                                style={{ background: '#F59E0B', color: '#fff' }}
                                            >
                                                {settingPrimaryId === img.id ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                                                Đặt chính
                                            </button>
                                        )}
                                        <button
                                            onClick={e => { e.stopPropagation(); onDelete(img) }}
                                            disabled={deletingId === img.id}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60"
                                            style={{ background: '#EF4444', color: '#fff' }}
                                        >
                                            {deletingId === img.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                            Xoá
                                        </button>
                                    </div>
                                </div>
                                {img.isPrimary && (
                                    <div
                                        className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                        style={{ background: '#F59E0B', color: '#fff' }}
                                    >
                                        <Star size={10} fill="white" /> Ảnh chính
                                    </div>
                                )}
                            </div>
                        ))}

                        <div
                            className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors"
                            style={{ aspectRatio: '4/3', border: '2px dashed #CBD5E1', background: '#F8FAFC' }}
                            onClick={onUpload}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#EFF6FF' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC' }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E2E8F0' }}>
                                <Plus size={18} style={{ color: '#64748B' }} />
                            </div>
                            <p className="text-xs font-semibold text-gray-400">Thêm ảnh</p>
                        </div>
                    </div>
                </div>

                <div
                    className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-gray-100"
                    style={{ background: '#F8FAFC' }}
                >
                    <p className="text-xs text-gray-400">{images.length} ảnh · Nhấn đôi để phóng to</p>
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
    )
}