'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, MapPin, Calendar, Users, ChevronLeft, ChevronRight, X, Plus, Minus, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/lib/api/axios'
import API_CONFIG from '@/config/api.config'
import { HotelResponse, HotelStatus } from '@/lib/api/hotel.api'

// ── Constants ──────────────────────────────────────────────
const DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7',
    'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh',
    'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Phú Nhuận', 'Thủ Đức', 'Bình Tân',
]
const MONTH_NAMES = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const WEEKDAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

// ── Types ──────────────────────────────────────────────────
interface SearchBarProps {
    variant?: 'hero' | 'compact'
    defaultValues?: {
        keyword?: string
        district?: string
        checkIn?: string
        checkOut?: string
        adults?: number
        children?: number
        rooms?: number
    }
}

// ── Helpers ────────────────────────────────────────────────
const getToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const LAST_DAY = new Date(2026, 11, 31)

const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()

const fmtMain = (d: Date) =>
    `${d.getDate()} tháng ${d.getMonth() + 1} ${d.getFullYear()}`

const fmtSub = (d: Date) => WEEKDAY_NAMES[d.getDay()]

const fmtShort = (d: Date | null) => d ? fmtMain(d) : 'Chọn ngày'

const toISO = (d: Date | null) => {
    if (!d) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const parseDate = (s?: string) => s ? new Date(s + 'T00:00:00') : null

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayMon(y: number, m: number) {
    const d = new Date(y, m, 1).getDay()
    return d === 0 ? 6 : d - 1 // Mon=0..Sun=6
}

// ═══════════════════════════════════════════════════════════
// DatePicker component
// Key fix: all event handlers use e.stopPropagation() + onMouseDown
// so clicks inside the picker never bubble to the document listener.
// ═══════════════════════════════════════════════════════════
interface DatePickerProps {
    checkIn: Date | null
    checkOut: Date | null
    onSelect: (d: Date) => void
    onClose: () => void
    pickingEnd: boolean
    setPickingEnd: (v: boolean) => void
    calMonth: number
    calYear: number
    setCalMonth: (m: number) => void
    setCalYear: (y: number) => void
}

function DatePicker({
    checkIn, checkOut, onSelect, onClose,
    pickingEnd, setPickingEnd,
    calMonth, calYear, setCalMonth, setCalYear,
}: DatePickerProps) {
    const [hoverDay, setHoverDay] = useState<Date | null>(null)
    const today = getToday()

    const nights = checkIn && checkOut
        ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)
        : 0

    const month2 = calMonth === 11 ? 0 : calMonth + 1
    const year2 = calMonth === 11 ? calYear + 1 : calYear

    const canPrev = !(calYear === today.getFullYear() && calMonth === today.getMonth())
    const canNext = !(calYear === 2026 && calMonth === 10)

    const stop = (e: React.MouseEvent) => e.stopPropagation()

    const prevMonth = (e: React.MouseEvent) => {
        stop(e)
        if (!canPrev) return
        if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) }
        else setCalMonth(calMonth - 1)
    }

    const nextMonth = (e: React.MouseEvent) => {
        stop(e)
        if (!canNext) return
        if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) }
        else setCalMonth(calMonth + 1)
    }

    const renderMonth = (y: number, m: number) => {
        const daysCount = getDaysInMonth(y, m)
        const firstDay = getFirstDayMon(y, m)
        const cells: React.ReactNode[] = []

        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`e${i}`} className="h-10" />)
        }

        for (let day = 1; day <= daysCount; day++) {
            const d = new Date(y, m, day)
            const isPast = d < today
            const isStart = !!(checkIn && sameDay(d, checkIn))
            const isEnd = !!(checkOut && sameDay(d, checkOut))
            const effectiveEnd = checkOut || hoverDay
            const inRange = !!(checkIn && effectiveEnd && d > checkIn && d < effectiveEnd)
            const isHov = !!(!checkOut && hoverDay && sameDay(d, hoverDay) && checkIn && d > checkIn)
            const isToday = sameDay(d, today)

            // Range strip background — flat rectangles connect start↔end
            const showStrip = inRange
            const stripLeft = isStart && !isEnd && !!effectiveEnd
            const stripRight = isEnd && !isStart

            cells.push(
                <div
                    key={day}
                    className={[
                        'relative h-10 flex items-center justify-center',
                        showStrip && !stripLeft && !stripRight ? 'bg-blue-50' : '',
                        stripLeft ? 'bg-gradient-to-r from-transparent via-blue-50 to-blue-50' : '',
                        stripRight ? 'bg-gradient-to-l from-transparent via-blue-50 to-blue-50' : '',
                    ].join(' ')}
                >
                    <button
                        disabled={isPast}
                        onClick={e => { stop(e); onSelect(d) }}
                        onMouseEnter={() => { if (checkIn && !checkOut) setHoverDay(d) }}
                        onMouseLeave={() => setHoverDay(null)}
                        className={[
                            'relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                            isPast
                                ? 'text-gray-300 cursor-not-allowed'
                                : isStart || isEnd
                                    ? 'bg-blue-600 text-white font-bold cursor-pointer'
                                    : isHov
                                        ? 'bg-blue-100 text-blue-700 cursor-pointer'
                                        : inRange
                                            ? 'text-blue-900 hover:bg-blue-100 cursor-pointer'
                                            : isToday
                                                ? 'text-blue-600 font-bold ring-2 ring-blue-300 hover:bg-blue-50 cursor-pointer'
                                                : 'text-gray-700 hover:bg-gray-100 cursor-pointer',
                        ].join(' ')}
                    >
                        {day}
                    </button>
                </div>
            )
        }
        return cells
    }

    return (
        <div
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[400] overflow-hidden"
            onClick={stop}
            onMouseDown={stop}
        >
            {/* ─ Tab header ─ */}
            <div className="grid grid-cols-2 border-b border-gray-200">
                {[
                    { label: 'Nhận phòng', date: checkIn, active: !pickingEnd, onClick: (e: React.MouseEvent) => { stop(e); setPickingEnd(false) } },
                    { label: 'Trả phòng', date: checkOut, active: pickingEnd, onClick: (e: React.MouseEvent) => { stop(e); setPickingEnd(true) } },
                ].map((tab, i) => (
                    <button
                        key={tab.label}
                        onMouseDown={stop}
                        onClick={tab.onClick}
                        className={[
                            'flex items-start gap-4 px-6 py-5 text-left transition-colors',
                            i === 0 ? 'border-r border-gray-200' : '',
                            tab.active ? 'bg-blue-50' : 'hover:bg-gray-50',
                        ].join(' ')}
                    >
                        <Calendar size={20} className={`mt-0.5 shrink-0 ${tab.active ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">{tab.label}</div>
                            <div className={`text-lg font-bold leading-tight truncate ${tab.active ? 'text-blue-700' : tab.date ? 'text-gray-800' : 'text-gray-400'}`}>
                                {tab.date ? fmtMain(tab.date) : 'Chọn ngày'}
                            </div>
                            {tab.date && (
                                <div className="text-xs text-gray-400 mt-0.5">{fmtSub(tab.date)}</div>
                            )}
                        </div>
                        {tab.active && <div className="ml-auto mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </button>
                ))}
            </div>

            {/* ─ Night badge ─ */}
            {nights > 0 && (
                <div className="flex justify-center py-2.5 bg-blue-50 border-b border-blue-100">
                    <span className="text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full px-5 py-1.5">
                        {nights} đêm
                    </span>
                </div>
            )}

            {/* ─ Two-month calendar ─ */}
            <div className="grid grid-cols-2 p-6 pb-4 gap-8">
                {[{ y: calYear, m: calMonth }, { y: year2, m: month2 }].map((cal, idx) => (
                    <div key={idx}>
                        <div className="flex items-center justify-between mb-4">
                            {idx === 0 ? (
                                <button
                                    onMouseDown={stop}
                                    onClick={prevMonth}
                                    disabled={!canPrev}
                                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-25 transition-colors text-gray-600"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            ) : <div className="w-9" />}

                            <span className="text-sm font-bold text-gray-800">
                                {MONTH_NAMES[cal.m]} {cal.y}
                            </span>

                            {idx === 1 ? (
                                <button
                                    onMouseDown={stop}
                                    onClick={nextMonth}
                                    disabled={!canNext}
                                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-25 transition-colors text-gray-600"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            ) : <div className="w-9" />}
                        </div>

                        <div className="grid grid-cols-7 mb-1">
                            {DAY_NAMES.map(d => (
                                <div key={d} className="h-8 flex items-center justify-center text-[11px] font-bold text-gray-400 uppercase">
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7">
                            {renderMonth(cal.y, cal.m)}
                        </div>
                    </div>
                ))}
            </div>

            {/* ─ Footer ─ */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                    {nights > 0 ? `Đã chọn ${nights} đêm` : pickingEnd ? 'Chọn ngày trả phòng' : 'Chọn ngày nhận phòng'}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        onMouseDown={stop}
                        onClick={e => { stop(e); onClose() }}
                        className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Đóng
                    </button>
                    {checkIn && checkOut && (
                        <button
                            onMouseDown={stop}
                            onClick={e => { stop(e); onClose() }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors"
                        >
                            Xong
                        </button>
                    )}
                </div>
            </div>

            {/* ─ Close X ─ */}
            <button
                onMouseDown={stop}
                onClick={e => { stop(e); onClose() }}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
            >
                <X size={16} />
            </button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// GuestPicker component
// ═══════════════════════════════════════════════════════════
interface GuestPickerProps {
    adults: number
    children: number
    rooms: number
    setAdults: React.Dispatch<React.SetStateAction<number>>
    setChildren: React.Dispatch<React.SetStateAction<number>>
    setRooms: React.Dispatch<React.SetStateAction<number>>
    onClose: () => void
}

function GuestPicker({ adults, children, rooms, setAdults, setChildren, setRooms, onClose }: GuestPickerProps) {
    const rows = [
        { label: 'Người lớn', sub: null, val: adults, min: 1, set: setAdults },
        { label: 'Trẻ em', sub: '0 – 17 tuổi', val: children, min: 0, set: setChildren },
        { label: 'Phòng', sub: null, val: rooms, min: 1, set: setRooms },
    ]

    const stop = (e: React.MouseEvent) => e.stopPropagation()

    return (
        <div
            className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[400] overflow-hidden"
            onClick={stop}
            onMouseDown={stop}
        >
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Khách & phòng</div>
            </div>

            <div className="px-5 divide-y divide-gray-100">
                {rows.map(({ label, sub, val, min, set }) => (
                    <div key={label} className="flex items-center justify-between py-4">
                        <div>
                            <div className="text-sm font-semibold text-gray-800">{label}</div>
                            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={val <= min}
                                onClick={() => set(v => Math.max(min, v - 1))}
                                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-25 transition-all"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-gray-900">{val}</span>
                            <button
                                onClick={() => set(v => v + 1)}
                                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
                <button
                    onClick={onClose}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold py-3 rounded-xl transition-all"
                >
                    Xong
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// SuggestDropdown component
// ═══════════════════════════════════════════════════════════
function SuggestDropdown({
    hotelSuggestions, districtSuggestions, onSelectHotel, onSelectDistrict
}: {
    hotelSuggestions: HotelResponse[]
    districtSuggestions: string[]
    onSelectHotel: (name: string) => void
    onSelectDistrict: (d: string) => void
}) {
    if (hotelSuggestions.length === 0 && districtSuggestions.length === 0) return null
    const stop = (e: React.MouseEvent) => e.stopPropagation()

    return (
        <div
            className="absolute top-full left-0 mt-1 w-[400px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[500] overflow-hidden max-h-80 overflow-y-auto"
            onClick={stop}
            onMouseDown={stop}
        >
            {hotelSuggestions.length > 0 && (
                <>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Khách sạn
                    </div>
                    {hotelSuggestions.map(h => (
                        <button key={h.id} onMouseDown={stop} onClick={() => onSelectHotel(h.hotelName)}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 text-left transition-colors">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg shrink-0">🏨</div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">{h.hotelName}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{h.district}</div>
                            </div>
                        </button>
                    ))}
                </>
            )}
            {districtSuggestions.length > 0 && (
                <>
                    <div className={`px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${hotelSuggestions.length > 0 ? 'border-t border-gray-100' : ''}`}>
                        Khu vực
                    </div>
                    {districtSuggestions.map(d => (
                        <button key={d} onMouseDown={stop} onClick={() => onSelectDistrict(d)}
                            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-blue-50 text-left transition-colors">
                            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                <MapPin size={14} className="text-gray-500" />
                            </div>
                            <div className="text-sm font-medium text-gray-800">{d}</div>
                        </button>
                    ))}
                </>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// Main SearchBar
// ═══════════════════════════════════════════════════════════
export default function SearchBar({ variant = 'hero', defaultValues }: SearchBarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const today = getToday()

    const [keyword, setKeyword] = useState(defaultValues?.keyword || defaultValues?.district || '')
    const [checkIn, setCheckIn] = useState<Date | null>(parseDate(defaultValues?.checkIn))
    const [checkOut, setCheckOut] = useState<Date | null>(parseDate(defaultValues?.checkOut))
    const [adults, setAdults] = useState(defaultValues?.adults ?? 2)
    const [children, setChildren] = useState(defaultValues?.children ?? 0)
    const [rooms, setRooms] = useState(defaultValues?.rooms ?? 1)

    const [showDate, setShowDate] = useState(searchParams.get('openPicker') === 'true')
    const [pickingEnd, setPickingEnd] = useState(false)
    const [showSuggest, setShowSuggest] = useState(false)
    const [showGuests, setShowGuests] = useState(false)

    // Calendar month state lives here — persists when user switches tabs inside DatePicker
    const [calMonth, setCalMonth] = useState((checkIn || today).getMonth())
    const [calYear, setCalYear] = useState((checkIn || today).getFullYear())

    const wrapRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Single outside-click handler on the wrapper div
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setShowSuggest(false)
                setShowDate(false)
                setShowGuests(false)
            }
        }
        document.addEventListener('mousedown', fn)
        return () => document.removeEventListener('mousedown', fn)
    }, [])

    // ── Hotel/district suggestions ──
    const { data: hotelPage } = useQuery({
        queryKey: ['hotels-public'],
        queryFn: () => axiosInstance.get(`${API_CONFIG.ENDPOINTS.HOTELS}/active`).then(r => r.data),
    })

    const allHotels: HotelResponse[] = hotelPage?.content || []
    const q = keyword.trim().toLowerCase()

    const hotelSuggestions = q.length >= 1
        ? allHotels.filter((h: HotelResponse) =>
            h.status === HotelStatus.APPROVED && (
                h.hotelName.toLowerCase().includes(q) ||
                h.district.toLowerCase().includes(q)
            )
        ).slice(0, 5)
        : []

    const districtSuggestions = DISTRICTS.filter(d => !q || d.toLowerCase().includes(q)).slice(0, q ? 6 : 8)

    // ── Date selection ──
    const handleDaySelect = useCallback((d: Date) => {
        const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (d < now || d > LAST_DAY) return;

    if (!checkIn || (checkIn && checkOut)) {
        setCheckIn(d);
        setCheckOut(null);
        setPickingEnd(true);
    } else {
        if (d <= checkIn) {
            setCheckIn(d);
            setCheckOut(null);
            setPickingEnd(true);
        } else {
            setCheckOut(d);
            setPickingEnd(false);
        }
    }    
}, [checkIn, checkOut, setCheckIn, setCheckOut, setPickingEnd]);

    const nights = checkIn && checkOut
        ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)
        : 0

    // ── Search ──
    const handleSearch = () => {
        if (!checkIn || !checkOut) {
            setShowDate(true)
            setPickingEnd(!checkIn ? false : true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        const p = new URLSearchParams()
        if (keyword.trim()) {
            DISTRICTS.includes(keyword.trim())
                ? p.set('district', keyword.trim())
                : p.set('keyword', keyword.trim())
        }
        p.set('checkIn', toISO(checkIn))
        p.set('checkOut', toISO(checkOut))
        p.set('adults', String(adults))
        p.set('children', String(children))
        p.set('rooms', String(rooms))
        router.push(`/hotels?${p.toString()}`)
    }

    const isHero = variant === 'hero'

    // ── Shared props ──
    const datePickerProps = {
        checkIn, checkOut,
        onSelect: handleDaySelect,
        onClose: () => setShowDate(false),
        pickingEnd, setPickingEnd,
        calMonth, calYear, setCalMonth, setCalYear,
    }

    const guestPickerProps = {
        adults, children, rooms,
        setAdults, setChildren, setRooms,
        onClose: () => setShowGuests(false),
    }

    const suggestProps = {
        hotelSuggestions,
        districtSuggestions,
        onSelectHotel: (name: string) => { setKeyword(name); setShowSuggest(false) },
        onSelectDistrict: (d: string) => { setKeyword(d); setShowSuggest(false) },
    }

    // ═══════════════════════════════════════════════
    // HERO VARIANT
    // ═══════════════════════════════════════════════
    if (isHero) {
        return (
            <div ref={wrapRef} className="relative w-full">
                <div className="bg-white rounded-2xl shadow-xl">

                    {/* ─ Row 1: Destination ─ */}
                    <div className="relative px-5 pt-5 pb-4 border-b border-gray-100">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Điểm đến
                        </label>
                        <div
                            className="flex items-center gap-3 border-2 border-gray-200 focus-within:border-blue-500 rounded-xl px-4 py-3.5 transition-colors cursor-text bg-white"
                            onClick={() => { inputRef.current?.focus(); setShowSuggest(true); setShowDate(false); setShowGuests(false) }}
                        >
                            <Search size={18} className="text-gray-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={keyword}
                                onChange={e => { setKeyword(e.target.value); setShowSuggest(true) }}
                                onFocus={() => { setShowSuggest(true); setShowDate(false); setShowGuests(false) }}
                                placeholder="Nhập điểm du lịch hoặc tên khách sạn"
                                className="flex-1 text-sm font-semibold text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                            />
                            {keyword && (
                                <button
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={e => { e.stopPropagation(); setKeyword(''); inputRef.current?.focus() }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {showSuggest && <SuggestDropdown {...suggestProps} />}
                    </div>

                    {/* ─ Row 2: Dates + Guests ─ */}
                    <div className="relative grid grid-cols-3 divide-x divide-gray-100">

                        {/* Check-in */}
                        <button
                            onClick={() => { setShowDate(true); setPickingEnd(false); setShowGuests(false); setShowSuggest(false) }}
                            className="flex flex-col px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                        >
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Nhận phòng</span>
                            <span className={`text-base font-bold leading-tight ${checkIn ? 'text-gray-900' : 'text-gray-400'}`}>
                                {checkIn ? fmtMain(checkIn) : '-- Chọn ngày --'}
                            </span>
                            {checkIn && <span className="text-xs text-gray-400 mt-1">{fmtSub(checkIn)}</span>}
                        </button>

                        {/* Check-out */}
                        <button
                            onClick={() => { setShowDate(true); setPickingEnd(true); setShowGuests(false); setShowSuggest(false) }}
                            className="flex flex-col px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                        >
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Trả phòng</span>
                            <span className={`text-base font-bold leading-tight ${checkOut ? 'text-gray-900' : 'text-gray-400'}`}>
                                {checkOut ? fmtMain(checkOut) : '-- Chọn ngày --'}
                            </span>
                            {checkOut && <span className="text-xs text-gray-400 mt-1">{fmtSub(checkOut)}</span>}
                        </button>

                        {/* Guests */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowGuests(v => !v); setShowDate(false); setShowSuggest(false) }}
                                className="w-full flex flex-col px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                            >
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Khách & phòng</span>
                                <div className="flex items-center gap-2">
                                    <Users size={15} className="text-gray-500 shrink-0" />
                                    <span className="text-base font-bold text-gray-900">
                                        {adults + children} người lớn · {rooms} phòng
                                    </span>
                                    <ChevronDown size={14} className={`text-gray-400 ml-auto transition-transform duration-200 ${showGuests ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {showGuests && <GuestPicker {...guestPickerProps} />}
                        </div>
                    </div>

                    {/* DatePicker anchored below row 2 */}
                    {showDate && <DatePicker {...datePickerProps} />}

                    {/* ─ Footer: search button ─ */}
                    <div className="px-5 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                            {nights > 0
                                ? <span className="font-bold text-blue-700">{nights} đêm</span>
                                : 'Chọn ngày nhận và trả phòng'}
                        </span>
                        <button
                            onClick={handleSearch}
                            className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-10 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md tracking-wide"
                        >
                            <Search size={16} />
                            TÌM
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ═══════════════════════════════════════════════
    // COMPACT VARIANT — scroll-down sticky bar
    // Agoda-style: label + value stacked, larger text
    // ═══════════════════════════════════════════════
    return (
        <div ref={wrapRef} className="relative w-full">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg">

                <div className="flex items-stretch">

                    {/* Destination */}
                    <div className="flex-[2.5] relative">
                        <div
                            className="flex items-center gap-3 px-5 h-full cursor-text py-3"
                            onClick={() => { inputRef.current?.focus(); setShowSuggest(true); setShowDate(false); setShowGuests(false) }}
                        >
                            <Search size={17} className="text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Điểm đến</div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={keyword}
                                    onChange={e => { setKeyword(e.target.value); setShowSuggest(true) }}
                                    onFocus={() => { setShowSuggest(true); setShowDate(false); setShowGuests(false) }}
                                    placeholder="Nhập điểm du lịch hoặc tên khách sạn"
                                    className="w-full text-sm font-bold text-gray-900 placeholder-gray-400 bg-transparent outline-none truncate"
                                />
                            </div>
                        </div>
                        {showSuggest && <SuggestDropdown {...suggestProps} />}
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-gray-200 self-stretch" />

                    {/* Check-in */}
                    <button
                        onClick={() => { setShowDate(true); setPickingEnd(false); setShowGuests(false); setShowSuggest(false) }}
                        className="flex-1 flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                        <Calendar size={16} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nhận phòng</div>
                            <div className={`text-sm font-bold truncate ${checkIn ? 'text-gray-900' : 'text-gray-400'}`}>
                                {fmtShort(checkIn)}
                            </div>
                            {checkIn && <div className="text-xs text-gray-400">{fmtSub(checkIn)}</div>}
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="w-px bg-gray-200 self-stretch" />

                    {/* Check-out */}
                    <button
                        onClick={() => { setShowDate(true); setPickingEnd(true); setShowGuests(false); setShowSuggest(false) }}
                        className="flex-1 flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                        <Calendar size={16} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Trả phòng</div>
                            <div className={`text-sm font-bold truncate ${checkOut ? 'text-gray-900' : 'text-gray-400'}`}>
                                {fmtShort(checkOut)}
                            </div>
                            {checkOut && <div className="text-xs text-gray-400">{fmtSub(checkOut)}</div>}
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="w-px bg-gray-200 self-stretch" />

                    {/* Guests */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowGuests(v => !v); setShowDate(false); setShowSuggest(false) }}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors h-full"
                        >
                            <Users size={16} className="text-gray-400 shrink-0" />
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Khách</div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                                        {adults + children} người lớn · {rooms} phòng
                                    </span>
                                    <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${showGuests ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </button>
                        {showGuests && <GuestPicker {...guestPickerProps} />}
                    </div>

                    {/* Search button */}
                    <div className="flex items-center px-4 border-l border-gray-200">
                        <button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-sm tracking-wide whitespace-nowrap"
                        >
                            TÌM
                        </button>
                    </div>
                </div>

                {/* DatePicker dropdown */}
                {showDate && <DatePicker {...datePickerProps} />}
            </div>
        </div>
    )
}