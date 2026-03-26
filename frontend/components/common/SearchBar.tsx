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
    if (!d) return 'Chưa chọn'
    return `${d.getDate()} tháng ${d.getMonth() + 1} ${d.getFullYear()}`
}

const toISO = (d: Date | null) => d ? d.toISOString().split('T')[0] : ''
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

export default function SearchBar({ variant = 'hero', defaultValues }: SearchBarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // ── State Initialization (Tránh lỗi Cascading Render bằng cách gán trực tiếp) ──
    const [keyword, setKeyword] = useState(defaultValues?.keyword || defaultValues?.district || '')
    const [checkIn, setCheckIn] = useState<Date | null>(defaultValues?.checkIn ? new Date(defaultValues.checkIn) : null)
    const [checkOut, setCheckOut] = useState<Date | null>(defaultValues?.checkOut ? new Date(defaultValues.checkOut) : null)

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

    const { data: allHotels = [] } = useQuery<HotelResponse[]>({
        queryKey: ['hotels-public'],
        queryFn: () => axiosInstance.get<HotelResponse[]>(API_CONFIG.ENDPOINTS.HOTELS).then(r => r.data),
    })

    // ── Suggestions ──
    const q = keyword.trim().toLowerCase()
    const hotelSuggestions = q.length >= 1
        ? allHotels.filter(h =>
            h.isActive && (
                h.hotelName.toLowerCase().includes(q) ||
                h.district.toLowerCase().includes(q)
            )
        ).slice(0, 5)
        : []
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

    return (
        <div className={`bg-white rounded-2xl shadow-2xl overflow-visible ${variant === 'compact' ? 'border border-gray-200 shadow-lg' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-gray-100">
                {/* Location */}
                <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-gray-100 relative" ref={suggestRef}>
                    <div className="px-5 pt-4 pb-4 cursor-text" onClick={() => setShowSuggest(true)}>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Điểm đến / Tên khách sạn</div>
                        <div className="flex items-center gap-2.5">
                            <Search size={17} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={keyword}
                                onChange={e => { setKeyword(e.target.value); setShowSuggest(true) }}
                                placeholder="Nhập điểm đến hoặc tên khách sạn..."
                                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                            />
                        </div>
                    </div>
                    {showSuggest && (
                        <div className="absolute top-full left-0 w-[440px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] overflow-hidden max-h-[420px] overflow-y-auto">
                            {hotelSuggestions.map(h => (
                                <button key={h.id} onClick={() => { setKeyword(h.hotelName); setShowSuggest(false) }} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-green-50 text-left">
                                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shrink-0">🏨</div>
                                    <div className="min-w-0"><div className="text-sm font-semibold text-gray-900 truncate">{h.hotelName}</div><div className="text-xs text-gray-400">{h.district}</div></div>
                                </button>
                            ))}
                            {districtSuggestions.map(d => (
                                <button key={d} onClick={() => { setKeyword(d); setShowSuggest(false) }} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-green-50 text-left">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><MapPin size={14} className="text-gray-500" /></div>
                                    <div className="text-sm font-medium text-gray-800">{d}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Check-in */}
                <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-gray-100 px-5 pt-4 pb-4 cursor-pointer hover:bg-gray-50" onClick={() => { setShowDate(true); setPickingEnd(false) }}>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nhận phòng</div>
                    <div className="flex items-center gap-2.5">
                        <Calendar size={17} className="text-gray-400 shrink-0" />
                        <div className={`text-sm font-semibold ${checkIn ? 'text-gray-900' : 'text-gray-400'}`}>
                            {checkIn ? fmtFull(checkIn) : 'Chọn ngày'}
                        </div>
                    </div>
                </div>

                {/* Check-out */}
                <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-gray-100 px-5 pt-4 pb-4 cursor-pointer hover:bg-gray-50 relative" ref={dateRef} onClick={() => { setShowDate(true); setPickingEnd(true) }}>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                        Trả phòng {nights > 0 && <span className="text-green-600 font-semibold">({nights} đêm)</span>}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Calendar size={17} className="text-gray-400 shrink-0" />
                        <div className={`text-sm font-semibold ${checkOut ? 'text-gray-900' : 'text-gray-400'}`}>
                            {checkOut ? fmtFull(checkOut) : 'Chọn ngày'}
                        </div>
                    </div>

                    {showDate && (
                        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] p-5 w-[660px]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-6 mb-4 pb-3 border-b border-gray-100">
                                <button onClick={() => setPickingEnd(false)} className={`text-sm font-semibold pb-1 border-b-2 ${!pickingEnd ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400'}`}>
                                    Nhận: {checkIn ? fmtFull(checkIn) : 'Chưa chọn'}
                                </button>
                                <button onClick={() => setPickingEnd(true)} className={`text-sm font-semibold pb-1 border-b-2 ${pickingEnd ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400'}`}>
                                    Trả: {checkOut ? fmtFull(checkOut) : 'Chưa chọn'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                {[{ y: calYear, m: calMonth }, { y: year2, m: month2 }].map((cal, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-3">
                                            {idx === 0 && <button onClick={prevMonth} disabled={!canPrevMonth}><ChevronLeft size={17} /></button>}
                                            <span className="text-sm font-bold">{MONTH_NAMES[cal.m]} {cal.y}</span>
                                            {idx === 1 && <button onClick={nextMonth} disabled={!canNextMonth}><ChevronRight size={17} /></button>}
                                        </div>
                                        <div className="grid grid-cols-7 mb-1">
                                            {DAY_NAMES.map(d => <div key={d} className="h-8 flex items-center justify-center text-xs text-gray-400">{d}</div>)}
                                        </div>
                                        <div className="grid grid-cols-7">{renderCal(cal.y, cal.m)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Guests */}
                <div className="md:col-span-2 relative" ref={guestRef}>
                    <button
                        onClick={() => setShowGuests(!showGuests)}
                        className="w-full h-full px-5 pt-4 pb-4 text-left hover:bg-gray-50 transition-colors"
                    >
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Khách & Phòng</div>
                        <div className="flex items-center gap-2.5">
                            <Users size={17} className="text-gray-400 shrink-0" />
                            <div className="text-sm font-semibold text-gray-900 leading-tight">
                                {totalAdults + totalChildren} khách, {rooms.length} phòng
                            </div>
                        </div>
                    </button>

                    {/* Dropdown Guests - Phải nằm TRONG div relative này */}
                    {showGuests && (
                        <div className="absolute top-full right-0 mt-2 w-[380px] bg-white border border-gray-200 rounded-xl shadow-2xl z-[200] overflow-hidden flex flex-col">
                            {/* Header của dropdown (Giống ảnh) */}
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                                <Users size={20} className="text-gray-600" />
                                <div>
                                    <div className="text-xs text-gray-500 font-medium">Travelers</div>
                                    <div className="text-[15px] font-bold text-gray-900">
                                        {totalAdults + totalChildren} travelers, {rooms.length} {rooms.length > 1 ? 'rooms' : 'room'}
                                    </div>
                                </div>
                            </div>

                            {/* Body: Danh sách phòng */}
                            <div className="max-h-[400px] overflow-y-auto p-5 space-y-8">
                                {rooms.map((room, index) => (
                                    <div key={index} className="space-y-5">
                                        <h4 className="text-base font-bold text-gray-900">Room {index + 1}</h4>

                                        {/* Hàng Người lớn */}
                                        <div className="flex items-center justify-between">
                                            <div className="text-[15px] font-medium text-gray-700">Adults</div>
                                            <div className="flex items-center gap-5">
                                                <button
                                                    onClick={() => updateRoom(index, 'adults', -1)}
                                                    disabled={room.adults <= 1}
                                                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-all"
                                                >
                                                    <Minus size={18} />
                                                </button>
                                                <span className="w-4 text-center font-semibold text-gray-800">{room.adults}</span>
                                                <button
                                                    onClick={() => updateRoom(index, 'adults', 1)}
                                                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Hàng Trẻ em */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-[15px] font-medium text-gray-700">Children</div>
                                                <div className="text-xs text-gray-500">Ages 0 to 17</div>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <button
                                                    onClick={() => updateRoom(index, 'children', -1)}
                                                    disabled={room.children <= 0}
                                                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-all"
                                                >
                                                    <Minus size={18} />
                                                </button>
                                                <span className="w-4 text-center font-semibold text-gray-800">{room.children}</span>
                                                <button
                                                    onClick={() => updateRoom(index, 'children', 1)}
                                                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Nút Remove Room (Chỉ hiện khi > 1 phòng) */}
                                        {rooms.length > 1 && (
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => removeRoom(index)}
                                                    className="text-[15px] font-bold text-blue-600 hover:text-blue-700"
                                                >
                                                    Remove room
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Nút Add another room */}
                                <div className="pt-2">
                                    <button
                                        onClick={addRoom}
                                        className="text-[15px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        Add another room
                                    </button>
                                </div>
                            </div>

                            {/* Footer của Dropdown */}
                            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                                <button className="text-[13px] font-medium text-blue-600 hover:underline">
                                    Need to book 9 or more rooms?
                                </button>
                                <button
                                    onClick={() => setShowGuests(false)}
                                    className="bg-[#0057d9] text-white px-8 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-5 py-4">
                <button onClick={handleSearch} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl font-bold py-3.5 hover:bg-green-700 transition-all">
                    <Search size={20} /> Tìm khách sạn
                </button>
            </div>
        </div>
    )
}