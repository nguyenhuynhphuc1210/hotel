'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, MapPin, Calendar, Users, ChevronLeft, ChevronRight, Plus, Minus, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelResponse } from '@/lib/api/hotel.api'


// ── Constants ──────────────────────────────────────────────
const DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7',
    'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh',
    'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Phú Nhuận', 'Thủ Đức', 'Bình Tân',
]
const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

// ── Types ──────────────────────────────────────────────────
interface Room { adults: number; children: number; childAges: number[] }

interface SearchBarProps {
    variant?: 'hero' | 'compact'
    defaultValues?: {
        keyword?: string; district?: string; checkIn?: string; checkOut?: string
        adults?: number; children?: number; rooms?: number
    }
}

// ── Helpers ────────────────────────────────────────────────
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const lastDay = new Date(2026, 11, 31)

const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

const fmtFull = (d: Date | null) => {
    if (!d) return 'Chọn ngày'
    return `${d.getDate()} thg ${d.getMonth() + 1} ${d.getFullYear()}`
}

const toISO = (d: Date | null) => {
    if (!d) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

export default function SearchBar({ variant = 'hero', defaultValues }: SearchBarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // ── State Initialization (Tránh lỗi Cascading Render bằng cách gán trực tiếp) ──
    const [keyword, setKeyword] = useState(defaultValues?.keyword || defaultValues?.district || '')
    const parseDate = (s?: string) => s ? new Date(s + 'T00:00:00') : null

    const [checkIn, setCheckIn] = useState<Date | null>(parseDate(defaultValues?.checkIn))
    const [checkOut, setCheckOut] = useState<Date | null>(parseDate(defaultValues?.checkOut))

    const [showDate, setShowDate] = useState(searchParams.get('openPicker') === 'true')
    const [pickingEnd, setPickingEnd] = useState(false)
    const [showSuggest, setShowSuggest] = useState(false)
    const [hoverDay, setHoverDay] = useState<Date | null>(null)
    const [calMonth, setCalMonth] = useState((checkIn || today()).getMonth())
    const [calYear, setCalYear] = useState((checkIn || today()).getFullYear())
    const [showGuests, setShowGuests] = useState(false)
    const [rooms, setRooms] = useState<Room[]>([{
        adults: defaultValues?.adults || 2,
        children: defaultValues?.children || 0,
        childAges: []
    }])

    const suggestRef = useRef<HTMLDivElement>(null)
    const dateRef = useRef<HTMLDivElement>(null)
    const guestRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggest(false)
            if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDate(false)
            if (guestRef.current && !guestRef.current.contains(e.target as Node)) setShowGuests(false)
        }
        document.addEventListener('mousedown', fn)
        return () => document.removeEventListener('mousedown', fn)
    }, [])

    const { data: hotelPage } = useQuery({
        queryKey: ['hotels-public'],
        queryFn: () => axiosInstance.get(`${API_CONFIG.ENDPOINTS.HOTELS}/active`).then(r => r.data),
    });


    const allHotels: HotelResponse[] = hotelPage?.content || [];

    const q = keyword.trim().toLowerCase();


    const hotelSuggestions = q.length >= 1
        ? allHotels.filter((h: HotelResponse) =>
            h.isActive && (
                h.hotelName.toLowerCase().includes(q) ||
                h.district.toLowerCase().includes(q)
            )
        ).slice(0, 5)
        : [];

    const districtSuggestions = DISTRICTS.filter(d =>
        !q || d.toLowerCase().includes(q)
    ).slice(0, q ? 6 : 8)

    // ── Calendar Logic ──
    const canPrevMonth = !(calYear === today().getFullYear() && calMonth === today().getMonth())
    const canNextMonth = !(calYear === 2026 && calMonth === 10)
    const prevMonth = () => {
        if (!canPrevMonth) return
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
        else setCalMonth(m => m - 1)
    }
    const nextMonth = () => {
        if (!canNextMonth) return
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
        else setCalMonth(m => m + 1)
    }

    const month2 = calMonth === 11 ? 0 : calMonth + 1
    const year2 = calMonth === 11 ? calYear + 1 : calYear

    const handleDay = (d: Date) => {
        if (d < today() || d > lastDay) return
        if (!checkIn || (checkIn && checkOut)) {
            setCheckIn(d); setCheckOut(null); setPickingEnd(true)
        } else {
            if (d <= checkIn) { setCheckIn(d); setCheckOut(null); setPickingEnd(true) }
            else { setCheckOut(d); setPickingEnd(false); setTimeout(() => setShowDate(false), 150) }
        }
    }

    const updateRoom = (index: number, field: 'adults' | 'children', delta: number) => {
        setRooms(prev => prev.map((room, i) => {
            if (i !== index) return room;
            const newValue = Math.max(field === 'adults' ? 1 : 0, room[field] + delta);
            return { ...room, [field]: newValue };
        }));
    };

    const addRoom = () => {
        if (rooms.length < 8) {
            setRooms([...rooms, { adults: 2, children: 0, childAges: [] }]);
        }
    };

    const removeRoom = (index: number) => {
        if (rooms.length > 1) {
            setRooms(rooms.filter((_, i) => i !== index));
        }
    };



    const renderCal = (y: number, m: number) => {
        const daysCount = getDaysInMonth(y, m); const firstDay = getFirstDay(y, m); const t = today(); const cells = []
        for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)
        for (let day = 1; day <= daysCount; day++) {
            const d = new Date(y, m, day)
            const isPast = d < t; const isStart = checkIn && sameDay(d, checkIn); const isEnd = checkOut && sameDay(d, checkOut)
            const inRange = checkIn && (checkOut || hoverDay) && d > checkIn && d < (checkOut ?? hoverDay!)
            const isHovered = !checkOut && hoverDay && sameDay(d, hoverDay) && checkIn && d > checkIn
            let cls = 'relative h-9 w-full text-sm flex items-center justify-center transition-all select-none '
            if (isPast) cls += 'text-gray-300 cursor-not-allowed '
            else {
                cls += 'cursor-pointer text-gray-800 '
                if (isStart || isEnd) cls += 'bg-green-600 text-white font-bold rounded-full z-10 '
                else if (inRange) cls += 'bg-green-100 text-green-900 '
                else if (isHovered) cls += 'bg-green-100 text-green-900 rounded-full '
                else cls += 'hover:bg-gray-100 rounded-full '
            }
            cells.push(
                <button key={day} disabled={isPast} className={cls}
                    onClick={() => handleDay(d)}
                    onMouseEnter={() => { if (pickingEnd && checkIn && !checkOut) setHoverDay(d) }}
                    onMouseLeave={() => setHoverDay(null)}
                >
                    {day}
                </button>
            )
        }
        return cells
    }

    const nights = checkIn && checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000) : 0
    const totalAdults = rooms.reduce((s, r) => s + r.adults, 0)
    const totalChildren = rooms.reduce((s, r) => s + r.children, 0)

    // ── Search Action ──
    const handleSearch = () => {
        if (!checkIn || !checkOut) {
            setShowDate(true)
            setPickingEnd(!checkIn ? false : true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        const p = new URLSearchParams()
        if (keyword.trim()) {
            if (DISTRICTS.includes(keyword.trim())) p.set('district', keyword.trim())
            else p.set('keyword', keyword.trim())
        }
        p.set('checkIn', toISO(checkIn))
        p.set('checkOut', toISO(checkOut))
        p.set('adults', String(totalAdults))
        p.set('children', String(totalChildren))
        p.set('rooms', String(rooms.length))
        router.push(`/hotels?${p.toString()}`)
    }

    const isHero = variant === 'hero';

    return (
        <div className={`bg-white transition-all duration-300 ${isHero
            ? 'rounded-2xl shadow-2xl flex flex-col'
            : 'rounded-full shadow-lg border border-gray-200 flex flex-row items-center py-1.5 px-2 max-w-5xl mx-auto'
            }`}>

            {/* PHẦN 1: HÀNG NHẬP LIỆU - Bọc trong relative để Lịch bám sát vào đây */}
            <div className="relative">
                <div className={`${isHero ? 'grid grid-cols-1 md:grid-cols-12 border-b border-gray-100' : 'flex flex-1 items-center divide-x divide-gray-200'}`}>

                    {/* 1.1 Địa điểm / Điểm đến */}
                    <div className={`${isHero ? 'md:col-span-4 border-r border-gray-100' : 'flex-[1.5]'} relative`} ref={suggestRef}>
                        <div className={`${isHero ? 'px-5 pt-4 pb-4' : 'px-4 py-1'} cursor-text`} onClick={() => setShowSuggest(true)}>
                            {isHero && <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Điểm đến</div>}
                            <div className="flex items-center gap-2.5">
                                <Search size={isHero ? 18 : 14} className="text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={e => { setKeyword(e.target.value); setShowSuggest(true) }}
                                    placeholder="Bạn muốn đi đâu?"
                                    className={`w-full outline-none bg-transparent text-gray-900 placeholder-gray-400 ${isHero ? 'text-sm font-semibold' : 'text-xs font-medium'}`}
                                />
                            </div>
                        </div>

                        {/* Dropdown gợi ý địa điểm */}
                        {showSuggest && (
                            <div className="absolute top-full left-0 mt-2 w-[400px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] overflow-hidden max-h-[400px] overflow-y-auto">
                                {hotelSuggestions.map(h => (
                                    <button key={h.id} onClick={() => { setKeyword(h.hotelName); setShowSuggest(false) }} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-green-50 text-left transition-colors">
                                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shrink-0">🏨</div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-gray-900 truncate">{h.hotelName}</div>
                                            <div className="text-xs text-gray-400 italic">{h.district}</div>
                                        </div>
                                    </button>
                                ))}
                                {districtSuggestions.map(d => (
                                    <button key={d} onClick={() => { setKeyword(d); setShowSuggest(false) }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-green-50 text-left transition-colors">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><MapPin size={14} className="text-gray-500" /></div>
                                        <div className="text-sm font-medium text-gray-800">{d}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 1.2 Nhận phòng & Trả phòng */}
                    <div className={`${isHero ? 'md:col-span-6 border-r border-gray-100 flex divide-x' : 'flex-1 flex divide-x'}`} ref={dateRef}>
                        <div className={`${isHero ? 'px-5 pt-4 pb-4' : 'px-4 py-1'} flex-1 cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => { setShowDate(true); setPickingEnd(false) }}>
                            {isHero && <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nhận phòng</div>}
                            <div className="flex items-center gap-2.5">
                                <Calendar size={isHero ? 18 : 14} className="text-gray-400 shrink-0" />
                                <span className={`${isHero ? 'text-sm font-bold' : 'text-xs font-medium'} truncate ${checkIn ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {checkIn ? fmtFull(checkIn) : 'Chọn ngày'}
                                </span>
                            </div>
                        </div>

                        <div className={`${isHero ? 'px-5 pt-4 pb-4' : 'px-4 py-1'} flex-1 cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => { setShowDate(true); setPickingEnd(true) }}>
                            {isHero && <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Trả phòng</div>}
                            <div className="flex items-center gap-2.5">
                                <Calendar size={isHero ? 18 : 14} className="text-gray-400 shrink-0" />
                                <span className={`${isHero ? 'text-sm font-bold' : 'text-xs font-medium'} truncate ${checkOut ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {checkOut ? fmtFull(checkOut) : 'Chọn ngày'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 1.3 Khách & Phòng */}
                    <div className={`${isHero ? 'md:col-span-2' : 'flex-1'} relative`} ref={guestRef}>
                        <button onClick={() => setShowGuests(!showGuests)} className={`${isHero ? 'px-5 py-4' : 'px-4 py-1'} w-full h-full text-left hover:bg-gray-50 transition-colors`}>
                            {isHero && <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Khách</div>}
                            <div className="flex items-center gap-2.5">
                                <Users size={isHero ? 18 : 14} className="text-gray-400 shrink-0" />
                                <span className={`text-gray-900 ${isHero ? 'text-sm font-bold' : 'text-xs font-medium'} truncate`}>
                                    {totalAdults + totalChildren} khách
                                </span>
                            </div>
                        </button>

                        {showGuests && (
                            <div className="absolute top-full right-0 mt-2 w-[340px] bg-white border border-gray-200 rounded-xl shadow-2xl z-[200] overflow-hidden flex flex-col">
                                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Thông tin khách</div>
                                    <div className="text-sm font-black text-gray-900">
                                        {totalAdults + totalChildren} khách, {rooms.length} phòng
                                    </div>
                                </div>

                                <div className="max-h-[350px] overflow-y-auto p-5 space-y-6">
                                    {rooms.map((room, index) => (
                                        <div key={index} className="space-y-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Phòng {index + 1}</h4>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-bold text-gray-700">Người lớn</div>
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => updateRoom(index, 'adults', -1)} disabled={room.adults <= 1} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50 disabled:opacity-20"><Minus size={14} /></button>
                                                    <span className="w-4 text-center font-bold text-gray-900">{room.adults}</span>
                                                    <button onClick={() => updateRoom(index, 'adults', 1)} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50"><Plus size={14} /></button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-bold text-gray-700">Trẻ em</div>
                                                    <div className="text-[10px] text-gray-400 italic">Từ 0 đến 17 tuổi</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => updateRoom(index, 'children', -1)} disabled={room.children <= 0} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50 disabled:opacity-20"><Minus size={14} /></button>
                                                    <span className="w-4 text-center font-bold text-gray-900">{room.children}</span>
                                                    <button onClick={() => updateRoom(index, 'children', 1)} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50"><Plus size={14} /></button>
                                                </div>
                                            </div>
                                            {rooms.length > 1 && (
                                                <button onClick={() => removeRoom(index)} className="text-[11px] font-bold text-red-500 hover:underline">Xóa phòng này</button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={addRoom} className="text-xs font-bold text-blue-600 flex items-center gap-1.5 hover:text-blue-700 transition-colors">
                                        <Plus size={16} /> Thêm phòng mới
                                    </button>
                                </div>

                                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                                    <span className="text-[10px] text-gray-400">Đặt trên 9 phòng?</span>
                                    <button onClick={() => setShowGuests(false)} className="bg-blue-600 text-white px-8 py-2 rounded-full font-black text-xs hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                        XONG
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. DROPDOWN LỊCH - Đặt ở đây để nó "sát" đáy hàng nhập liệu và đè lên nút tìm kiếm */}
                {showDate && (
                    <div
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 bg-white border border-gray-200 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.3)] z-[300] p-7 w-[720px]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Tabs Nhận/Trả phòng */}
                        <div className="flex items-center justify-center gap-16 mb-8 border-b border-gray-100">
                            <button
                                onClick={() => setPickingEnd(false)}
                                className={`group flex flex-col items-center pb-3 border-b-2 transition-all duration-300 ${!pickingEnd ? 'border-blue-600' : 'border-transparent'}`}
                            >
                                <span className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${!pickingEnd ? 'text-blue-600' : 'text-gray-400'}`}>Nhận phòng</span>
                                <span className={`text-sm font-black ${!pickingEnd ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {checkIn ? fmtFull(checkIn) : 'Chưa chọn'}
                                </span>
                            </button>
                            <button
                                onClick={() => setPickingEnd(true)}
                                className={`group flex flex-col items-center pb-3 border-b-2 transition-all duration-300 ${pickingEnd ? 'border-blue-600' : 'border-transparent'}`}
                            >
                                <span className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${pickingEnd ? 'text-blue-600' : 'text-gray-400'}`}>Trả phòng</span>
                                <span className={`text-sm font-black ${pickingEnd ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {checkOut ? fmtFull(checkOut) : 'Chưa chọn'}
                                </span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                            {[{ y: calYear, m: calMonth }, { y: year2, m: month2 }].map((cal, idx) => (
                                <div key={idx} className="select-none">
                                    <div className="flex items-center justify-between mb-5">
                                        {idx === 0 ? (
                                            <button onClick={prevMonth} disabled={!canPrevMonth} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-20"><ChevronLeft size={22} className="text-gray-600" /></button>
                                        ) : <div className="w-9" />}
                                        <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{MONTH_NAMES[cal.m]} {cal.y}</span>
                                        {idx === 1 ? (
                                            <button onClick={nextMonth} disabled={!canNextMonth} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-20"><ChevronRight size={22} className="text-gray-600" /></button>
                                        ) : <div className="w-9" />}
                                    </div>
                                    <div className="grid grid-cols-7 mb-3">
                                        {DAY_NAMES.map(d => <div key={d} className="h-8 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-1">{renderCal(cal.y, cal.m)}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowDate(false)} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all"><X size={20} /></button>
                    </div>
                )}
            </div>

            {/* PHẦN 3: NÚT TÌM KIẾM CHÍNH (Ở phía dưới hàng nhập liệu đối với Hero) */}
            {!isHero && (
                <div className="pl-2 pr-1">
                    <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full text-xs font-black transition-all transform active:scale-95 shadow-md uppercase tracking-wider">
                        Tìm
                    </button>
                </div>
            )}

            {isHero && (
                <div className="px-5 py-4 bg-gray-50/50 rounded-b-2xl border-t border-gray-100">
                    <button onClick={handleSearch} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl font-black py-4 hover:bg-green-700 transition-all shadow-lg text-sm uppercase tracking-widest">
                        <Search size={20} /> Tìm khách sạn ngay
                    </button>
                </div>
            )}
        </div>
    )
}