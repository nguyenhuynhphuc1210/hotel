'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
        keyword?: string; checkIn?: string; checkOut?: string
        adults?: number; children?: number; rooms?: number
    }
}

// ── Helpers ────────────────────────────────────────────────
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const lastDay = new Date(2026, 11, 31) // Dec 31 2026

const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

const fmtDisplay = (d: Date | null) => {
    if (!d) return 'Chọn ngày'
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    return `${d.getDate()} thg ${d.getMonth() + 1} · ${days[d.getDay()]}`
}

const fmtFull = (d: Date | null) => {
    if (!d) return 'Chưa chọn'
    return `${d.getDate()} tháng ${d.getMonth() + 1} ${d.getFullYear()}`
}

const toISO = (d: Date | null) => d ? d.toISOString().split('T')[0] : ''

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

// ── Main Component ─────────────────────────────────────────
export default function SearchBar({ variant = 'hero', defaultValues }: SearchBarProps) {
    const router = useRouter()

    // Fetch hotels for location suggestions
    const { data: allHotels = [] } = useQuery<HotelResponse[]>({
        queryKey: ['hotels-public'],
        queryFn: () => axiosInstance.get<HotelResponse[]>(API_CONFIG.ENDPOINTS.HOTELS).then(r => r.data),
    })

    // ── State ──
    const [keyword, setKeyword] = useState(defaultValues?.keyword ?? '')
    const [showSuggest, setShowSuggest] = useState(false)
    const [checkIn, setCheckIn] = useState<Date | null>(
        defaultValues?.checkIn ? new Date(defaultValues.checkIn) : null
    )
    const [checkOut, setCheckOut] = useState<Date | null>(
        defaultValues?.checkOut ? new Date(defaultValues.checkOut) : null
    )
    const [showDate, setShowDate] = useState(false)
    const [pickingEnd, setPickingEnd] = useState(false)
    const [hoverDay, setHoverDay] = useState<Date | null>(null)
    const [calMonth, setCalMonth] = useState(today().getMonth())
    const [calYear, setCalYear] = useState(today().getFullYear())
    const [showGuests, setShowGuests] = useState(false)
    const [rooms, setRooms] = useState<Room[]>([{ adults: 2, children: 0, childAges: [] }])

    // ── Refs ──
    const suggestRef = useRef<HTMLDivElement>(null)
    const dateRef = useRef<HTMLDivElement>(null)
    const guestRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggest(false)
            if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDate(false)
            if (guestRef.current && !guestRef.current.contains(e.target as Node)) setShowGuests(false)
        }
        document.addEventListener('mousedown', fn)
        return () => document.removeEventListener('mousedown', fn)
    }, [])

    // ── Location suggestions ──
    const q = keyword.trim().toLowerCase()
    const hotelSuggestions = q.length >= 1
        ? allHotels.filter(h =>
            h.isActive && (
                h.hotelName.toLowerCase().includes(q) ||
                h.district.toLowerCase().includes(q) ||
                h.addressLine.toLowerCase().includes(q)
            )
        ).slice(0, 5)
        : []
    const districtSuggestions = DISTRICTS.filter(d =>
        !q || d.toLowerCase().includes(q)
    ).slice(0, q ? 6 : 8)

    // ── Calendar navigation ──
    const canPrevMonth = !(calYear === today().getFullYear() && calMonth === today().getMonth())
    const canNextMonth = !(calYear === 2026 && calMonth === 10) // show up to Nov so Dec visible as second

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

    // ── Day click ──
    const handleDay = (d: Date) => {
        if (d < today() || d > lastDay) return
        if (!checkIn || (checkIn && checkOut)) {
            // Start fresh
            setCheckIn(d); setCheckOut(null); setPickingEnd(true)
        } else {
            if (d <= checkIn) { setCheckIn(d); setCheckOut(null); setPickingEnd(true) }
            else { setCheckOut(d); setPickingEnd(false); setTimeout(() => setShowDate(false), 150) }
        }
    }

    // ── Render calendar ──
    const renderCal = (y: number, m: number) => {
        const daysCount = getDaysInMonth(y, m)
        const firstDay = getFirstDay(y, m)
        const t = today()
        const cells: React.ReactElement[] = []

        for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)

        for (let day = 1; day <= daysCount; day++) {
            const d = new Date(y, m, day)
            const isPast = d < t
            const isFuture = d > lastDay
            const disabled = isPast || isFuture
            const isStart = checkIn && sameDay(d, checkIn)
            const isEnd = checkOut && sameDay(d, checkOut)
            const inRange = checkIn && (checkOut || hoverDay)
                && d > checkIn && d < (checkOut ?? hoverDay!)
            const isHovered = !checkOut && hoverDay && sameDay(d, hoverDay) && checkIn && d > checkIn

            let cls = 'relative h-9 w-full text-sm flex items-center justify-center transition-all select-none '

            if (disabled) {
                cls += 'text-gray-300 cursor-not-allowed '
            } else {
                cls += 'cursor-pointer text-gray-800 '
                if (isStart || isEnd) {
                    cls += 'bg-green-600 text-white font-bold rounded-full z-10 hover:bg-green-700 '
                } else if (inRange) {
                    cls += 'bg-green-100 text-green-900 rounded-none hover:bg-green-200 '
                } else if (isHovered) {
                    cls += 'bg-green-100 text-green-900 rounded-full '
                } else {
                    cls += 'hover:bg-gray-100 rounded-full '
                }
                // Range edges
                if (isStart && (checkOut || hoverDay)) cls += ' rounded-r-none '
                if (isEnd && checkIn) cls += ' rounded-l-none '
            }

            cells.push(
                <button key={day} disabled={disabled} className={cls}
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

    // ── Nights ──
    const nights = checkIn && checkOut
        ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)
        : 0

    // ── Rooms helpers ──
    const totalAdults = rooms.reduce((s, r) => s + r.adults, 0)
    const totalChildren = rooms.reduce((s, r) => s + r.children, 0)
    const guestLabel = `${totalAdults} người lớn · ${rooms.length} phòng${totalChildren > 0 ? ` · ${totalChildren} trẻ em` : ''}`

    const updateRoom = (idx: number, field: 'adults' | 'children', val: number) => {
        setRooms(prev => prev.map((r, i) => {
            if (i !== idx) return r
            const next = { ...r, [field]: val }
            if (field === 'children') {
                if (val > r.childAges.length) {
                    next.childAges = [...r.childAges, ...Array(val - r.childAges.length).fill(5)]
                } else {
                    next.childAges = r.childAges.slice(0, val)
                }
            }
            return next
        }))
    }

    const updateChildAge = (roomIdx: number, childIdx: number, age: number) => {
        setRooms(prev => prev.map((r, i) => {
            if (i !== roomIdx) return r
            const ages = [...r.childAges]; ages[childIdx] = age
            return { ...r, childAges: ages }
        }))
    }

    const addRoom = () => setRooms(prev => [...prev, { adults: 2, children: 0, childAges: [] }])
    const removeRoom = (idx: number) => setRooms(prev => prev.filter((_, i) => i !== idx))

    // ── Search ──
    const handleSearch = () => {
        const p = new URLSearchParams()
        if (keyword.trim()) p.set('keyword', keyword.trim())
        if (checkIn) p.set('checkIn', toISO(checkIn))
        if (checkOut) p.set('checkOut', toISO(checkOut))
        p.set('adults', String(totalAdults))
        p.set('children', String(totalChildren))
        p.set('rooms', String(rooms.length))
        router.push(`/hotels?${p.toString()}`)
    }

    // ── Render ──
    return (
        <div className="bg-white rounded-2xl shadow-2xl overflow-visible">

            {/* ── Row 1: 4 inputs ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-gray-100">

                {/* Location — 4 cols */}
                <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-gray-100 relative" ref={suggestRef}>
                    <div className="px-5 pt-4 pb-4 cursor-text" onClick={() => setShowSuggest(true)}>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Điểm đến / Tên khách sạn</div>
                        <div className="flex items-center gap-2.5">
                            <Search size={17} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={keyword}
                                onChange={e => { setKeyword(e.target.value); setShowSuggest(true) }}
                                onFocus={() => setShowSuggest(true)}
                                placeholder="Nhập điểm đến hoặc tên khách sạn..."
                                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                            />
                            {keyword && (
                                <button onClick={e => { e.stopPropagation(); setKeyword('') }}>
                                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Suggestions */}
                    {showSuggest && (
                        <div className="absolute top-full left-0 w-[440px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] overflow-hidden max-h-[420px] overflow-y-auto">
                            {hotelSuggestions.length > 0 && (
                                <>
                                    <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Khách sạn</div>
                                    {hotelSuggestions.map(h => (
                                        <button key={h.id}
                                            onClick={() => { setKeyword(h.hotelName); setShowSuggest(false) }}
                                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-green-50 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl shrink-0">🏨</div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-gray-900 truncate">{h.hotelName}</div>
                                                <div className="text-xs text-gray-400">{h.district}, {h.city}</div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {districtSuggestions.length > 0 && (
                                <>
                                    <div className="px-4 pt-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50">
                                        {q ? 'Khu vực' : 'Khám phá theo quận'}
                                    </div>
                                    {districtSuggestions.map(d => (
                                        <button key={d}
                                            onClick={() => { setKeyword(d); setShowSuggest(false) }}
                                            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-green-50 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                <MapPin size={14} className="text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-800">{d}</div>
                                                <div className="text-xs text-gray-400">TP. Hồ Chí Minh</div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}

                            {q && hotelSuggestions.length === 0 && districtSuggestions.length === 0 && (
                                <div className="px-4 py-6 text-sm text-gray-400 text-center">Không tìm thấy kết quả cho {q}</div>
                            )}
                            <div className="h-2" />
                        </div>
                    )}
                </div>

                {/* Check-in — 3 cols */}
                <div
                    className="md:col-span-3 border-b md:border-b-0 md:border-r border-gray-100 px-5 pt-4 pb-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => { setShowDate(true); setPickingEnd(false) }}
                >
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nhận phòng</div>
                    <div className="flex items-center gap-2.5">
                        <Calendar size={17} className="text-gray-400 shrink-0" />
                        <div>
                            <div className={`text-sm font-semibold ${checkIn ? 'text-gray-900' : 'text-gray-400'}`}>
                                {checkIn ? `${checkIn.getDate()} thg ${checkIn.getMonth() + 1} ${checkIn.getFullYear()}` : 'Chọn ngày'}
                            </div>
                            {checkIn && (
                                <div className="text-xs text-gray-400">
                                    {['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][checkIn.getDay()]}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Check-out — 3 cols (date popup anchors here) */}
                <div
                    className="md:col-span-3 border-b md:border-b-0 md:border-r border-gray-100 px-5 pt-4 pb-4 cursor-pointer hover:bg-gray-50 transition-colors relative"
                    onClick={() => { setShowDate(true); setPickingEnd(true) }}
                    ref={dateRef}
                >
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                        Trả phòng
                        {nights > 0 && <span className="text-green-600 text-xs font-semibold normal-case">({nights} đêm)</span>}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Calendar size={17} className="text-gray-400 shrink-0" />
                        <div>
                            <div className={`text-sm font-semibold ${checkOut ? 'text-gray-900' : 'text-gray-400'}`}>
                                {checkOut ? `${checkOut.getDate()} thg ${checkOut.getMonth() + 1} ${checkOut.getFullYear()}` : 'Chọn ngày'}
                            </div>
                            {checkOut && (
                                <div className="text-xs text-gray-400">
                                    {['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][checkOut.getDay()]}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Date picker popup ── */}
                    {showDate && (
                        <div
                            className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] p-5"
                            style={{ width: 660 }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Tabs */}
                            <div className="flex items-center gap-6 mb-4 pb-3 border-b border-gray-100">
                                <button
                                    onClick={() => { setPickingEnd(false); setCheckOut(null) }}
                                    className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${!pickingEnd ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Nhận phòng: {checkIn ? fmtFull(checkIn) : 'Chưa chọn'}
                                </button>
                                <button
                                    onClick={() => setPickingEnd(true)}
                                    className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${pickingEnd ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Trả phòng: {checkOut ? fmtFull(checkOut) : 'Chưa chọn'}
                                </button>
                                {nights > 0 && (
                                    <span className="ml-auto text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">
                                        {nights} đêm
                                    </span>
                                )}
                            </div>

                            {/* 2 month calendars */}
                            <div className="grid grid-cols-2 gap-8">
                                {[{ y: calYear, m: calMonth }, { y: year2, m: month2 }].map((cal, idx) => (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-3">
                                            {/* Prev button — only on left calendar */}
                                            {idx === 0 ? (
                                                <button
                                                    onClick={prevMonth}
                                                    disabled={!canPrevMonth}
                                                    className={`p-1.5 rounded-full transition-colors ${canPrevMonth ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-200 cursor-not-allowed'}`}
                                                >
                                                    <ChevronLeft size={17} />
                                                </button>
                                            ) : <div className="w-7" />}

                                            <span className="text-sm font-bold text-gray-800">{MONTH_NAMES[cal.m]} {cal.y}</span>

                                            {/* Next button — only on right calendar */}
                                            {idx === 1 ? (
                                                <button
                                                    onClick={nextMonth}
                                                    disabled={!canNextMonth}
                                                    className={`p-1.5 rounded-full transition-colors ${canNextMonth ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-200 cursor-not-allowed'}`}
                                                >
                                                    <ChevronRight size={17} />
                                                </button>
                                            ) : <div className="w-7" />}
                                        </div>

                                        {/* Day labels */}
                                        <div className="grid grid-cols-7 mb-1">
                                            {DAY_NAMES.map(d => (
                                                <div key={d} className="h-8 flex items-center justify-center text-xs font-semibold text-gray-400">{d}</div>
                                            ))}
                                        </div>

                                        {/* Days */}
                                        <div className="grid grid-cols-7">
                                            {renderCal(cal.y, cal.m)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => { setCheckIn(null); setCheckOut(null); setPickingEnd(false); setHoverDay(null) }}
                                    className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    Xoá ngày
                                </button>
                                <button
                                    onClick={() => setShowDate(false)}
                                    disabled={!checkIn || !checkOut}
                                    className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Chọn
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Guests — 2 cols */}
                <div className="md:col-span-2 relative" ref={guestRef}>
                    <button
                        onClick={() => setShowGuests(!showGuests)}
                        className="w-full h-full px-5 pt-4 pb-4 text-left hover:bg-gray-50 transition-colors"
                    >
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Khách & Phòng</div>
                        <div className="flex items-center gap-2.5">
                            <Users size={17} className="text-gray-400 shrink-0" />
                            <div>
                                <div className="text-sm font-semibold text-gray-900">
                                    {totalAdults} người lớn · {rooms.length} phòng
                                </div>
                                {totalChildren > 0 && (
                                    <div className="text-xs text-gray-400">{totalChildren} trẻ em</div>
                                )}
                            </div>
                        </div>
                    </button>

                    {/* ── Guest popup ── */}
                    {showGuests && (
                        <div
                            className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[200] p-5 w-80 max-h-[500px] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {rooms.map((room, roomIdx) => (
                                <div key={roomIdx} className={roomIdx > 0 ? 'border-t border-gray-100 pt-4 mt-4' : ''}>
                                    {/* Room header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-gray-800">Phòng {roomIdx + 1}</span>
                                        {rooms.length > 1 && (
                                            <button
                                                onClick={() => removeRoom(roomIdx)}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                                            >
                                                Xoá phòng
                                            </button>
                                        )}
                                    </div>

                                    {/* Adults */}
                                    <GuestRow
                                        label="Người lớn" sub="18 tuổi trở lên"
                                        value={room.adults} min={1} max={10}
                                        onChange={v => updateRoom(roomIdx, 'adults', v)}
                                    />

                                    <div className="my-3 border-t border-gray-100" />

                                    {/* Children */}
                                    <GuestRow
                                        label="Trẻ em" sub="0 – 17 tuổi"
                                        value={room.children} min={0} max={6}
                                        onChange={v => updateRoom(roomIdx, 'children', v)}
                                    />

                                    {/* Child ages */}
                                    {room.children > 0 && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs font-medium text-gray-500">Tuổi trẻ khi nhận phòng:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {room.childAges.map((age, ci) => (
                                                    <select key={ci} value={age}
                                                        onChange={e => updateChildAge(roomIdx, ci, Number(e.target.value))}
                                                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                                    >
                                                        <option value={0}>Dưới 1 tuổi</option>
                                                        {Array.from({ length: 17 }, (_, j) => j + 1).map(a => (
                                                            <option key={a} value={a}>{a} tuổi</option>
                                                        ))}
                                                    </select>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add room */}
                            {rooms.length < 8 && (
                                <button
                                    onClick={addRoom}
                                    className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-green-300 text-green-600 hover:border-green-500 hover:bg-green-50 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                                >
                                    <Plus size={15} />
                                    Thêm phòng
                                </button>
                            )}

                            <button
                                onClick={() => setShowGuests(false)}
                                className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                            >
                                Xong
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 2: Search button ── */}
            <div className="px-5 py-4">
                <button
                    onClick={handleSearch}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl font-bold text-base py-3.5 hover:bg-green-700 active:scale-[0.99] transition-all"
                >
                    <Search size={20} />
                    Tìm khách sạn
                </button>
            </div>
        </div>
    )
}

// ── GuestRow ───────────────────────────────────────────────
function GuestRow({ label, sub, value, min, max, onChange }: {
    label: string; sub: string; value: number; min: number; max: number
    onChange: (v: number) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-semibold text-gray-800">{label}</div>
                <div className="text-xs text-gray-400">{sub}</div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onChange(Math.max(min, value - 1))}
                    disabled={value <= min}
                    className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-green-500 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <Minus size={14} />
                </button>
                <span className="w-6 text-center text-base font-bold text-gray-900">{value}</span>
                <button
                    onClick={() => onChange(Math.min(max, value + 1))}
                    disabled={value >= max}
                    className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-green-500 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    )
}