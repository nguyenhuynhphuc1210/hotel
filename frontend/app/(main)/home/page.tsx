'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
    MapPin, Star, Tag, ChevronRight, ChevronLeft,
    ArrowRight,
} from 'lucide-react'
import hotelApi, { HotelSummaryResponse } from '@/lib/api/hotel.api'
import promotionApi from '@/lib/api/promotion.api'
import SearchBar from '@/components/common/SearchBar'
import { PromotionResponse } from '@/types/promotion.types'
import UpgradeToPartnerModal from '@/components/auth/UpgradeToPartnerModal'



// ─── Districts ────────────────────────────────────────────
const DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Tân Bình',
    'Quận Tân Phú', 'Quận Phú Nhuận', 'Quận Thủ Đức', 'Quận Bình Tân',
    'Huyện Củ Chi', 'Huyện Hóc Môn', 'Huyện Nhà Bè', 'Huyện Bình Chánh', 'Huyện Cần Giờ',
]

const DISTRICT_IMAGES: Record<string, string> = {
    'Quận 1': 'https://ticotravel.com.vn/wp-content/uploads/2022/05/Cho-Ben-Thanh-1.jpg',
    'Quận 2': 'https://kientrucvadoisong.net/ckeditor/plugins/fileman/Uploads/Bandoc/XUAN%202023-1/cau%20ba%20son-7.jpg',
    'Quận 3': 'https://cdn3.ivivu.com/2020/06/nha-tho-mau-hong-viet-nam-len-bao-my-ivivu-1.jpg',
    'Quận 4': 'https://owa.bestprice.vn/images/media/3a13e27f-9197-4a73-9457-100ea67fdc8b-61ef603f31244.png',
    'Quận 5': 'https://tripday.vn/wp-content/uploads/2022/10/cho-dong-xuan.jpg',
    'Quận 6': 'https://ticotravel.com.vn/wp-content/uploads/2023/05/cho-binh-tay-1.jpeg',
    'Quận 7': 'https://halotravel.vn/wp-content/uploads/2019/11/sai-gon-ho-ban-nguyet-5.jpg',
    'Quận 8': 'https://ticotravel.com.vn/wp-content/uploads/2023/01/ben-binh-dong-9.jpg',
    'Quận 9': 'https://ik.imagekit.io/tvlk/blog/2023/06/vtduCEFY-image.png?tr=dpr-2,w-675',
    'Quận 10': 'https://ticotravel.com.vn/wp-content/uploads/2022/10/cho-hoa-Ho-Thi-Ky-3.jpg',
    'Quận 11': 'https://statics.vinpearl.com/cong-vien-van-hoa-dam-sen-1_1630425408.jpg',
    'Quận 12': 'http://chuaviettoancau.com/userfiles/166_01.jpg',
    'Quận Bình Thạnh': 'https://www.vinhomescentralpark.co/wp-content/uploads/2021/04/landmark81.jpeg',
    'Quận Gò Vấp': 'https://statics.vinpearl.com/mieu-noi-go-vap-0_1630427238.png',
    'Quận Tân Bình': 'https://statics.vinpearl.com/dien-tich-san-bay-tan-son-nhat-1_1685770904.png',
    'Quận Tân Phú': 'https://vnanet.vn/Data/Articles/2022/08/04/6260752/vna_potal_tpho_chi_minh_xay_dung_khu_di_tich_lich_su_tro_thanh_noi_giao_duc_truyen_thong_cach_mang_cho_the_he_tre_stand.jpg',
    'Quận Phú Nhuận': 'https://vntravel.org.vn/uploads/images/2023/10/27/img-3507-1698382722.JPG',
    'Quận Thủ Đức': 'https://quocbaobds.com/wp-content/uploads/2020/10/Lang-dai-hoc-thu-duc.jpg',
    'Quận Bình Tân': 'https://aeonmall-vietnam.com/wp-content/uploads/2017/04/DSC2455-1.jpg',
    'Huyện Củ Chi': 'https://botohongdao.com/wp-content/uploads/2023/10/dia-dao-cu-chi-1.jpg',
    'Huyện Hóc Môn': 'https://cdn.vntrip.vn/cam-nang/wp-content/uploads/2017/09/cong-tam-quan.jpg',
    'Huyện Nhà Bè': 'https://media-cdn-v2.laodong.vn/Storage/NewsPortal/2021/1/7/868650/Cau-Phuoc-Loc-2.jpg',
    'Huyện Bình Chánh': 'https://cdn3.ivivu.com/2020/04/nhung-canh-dong-hoa-ruc-ro-the-gioi-ivivu-1.png',
    'Huyện Cần Giờ': 'https://tiimtravel.vn/uploads/files/2023/04/02/bien-can-gio.jpg',
}
const FALLBACK = 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop'

const getToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const getTomorrow = () => { const d = getToday(); d.setDate(d.getDate() + 1); return d }
const toISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function HomeContent() {
    const router = useRouter()
    const [currentPage, setCurrentPage] = useState(0)
    const pageSize = 24

    const defaultCheckIn = useMemo(() => toISO(getToday()), [])
    const defaultCheckOut = useMemo(() => toISO(getTomorrow()), [])

    const { data: pageData, isLoading: hotelsLoading } = useQuery({
        queryKey: ['hotels-home-dynamic', defaultCheckIn, defaultCheckOut, currentPage],
        queryFn: () => hotelApi.search({
            checkIn: defaultCheckIn,
            checkOut: defaultCheckOut,
            adults: 1,
            children: 0,
            page: currentPage,
            size: pageSize,
            sortBy: 'recommended'
        }).then(r => r.data),
    })

    const { data: promotions = [] } = useQuery<PromotionResponse[]>({
        queryKey: ['promotions-active'],
        queryFn: async () => {
            const response = await promotionApi.getAll()
            const data: PromotionResponse[] = response.data
            const now = new Date()
            return data.filter((p: PromotionResponse) =>
                p.isActive &&
                new Date(p.startDate) <= now &&
                new Date(p.endDate) >= now
            )
        },
    })

    const hotels = pageData?.content || []

    const featuredHotels = [...hotels]
        .sort((a, b) => (b.starRating ?? 0) - (a.starRating ?? 0))

    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsSticky(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false)

    const [hotelIdx, setHotelIdx] = useState(0)
    const VISIBLE_HOTELS = 4

    // Tính toán logic cho nút
    const canPrevHotel = hotelIdx > 0
    const canNextHotel = hotelIdx + VISIBLE_HOTELS < featuredHotels.length

    const handleNextHotel = () => {
        setHotelIdx(prev => {
            const nextVal = prev + VISIBLE_HOTELS;
            return nextVal > featuredHotels.length - VISIBLE_HOTELS ? featuredHotels.length - VISIBLE_HOTELS : nextVal;
        });
    }

    const handlePrevHotel = () => {
        setHotelIdx(prev => {
            const nextVal = prev - VISIBLE_HOTELS;
            return nextVal < 0 ? 0 : nextVal;
        });
    }

    const [promoIdx, setPromoIdx] = useState(0)
    const VISIBLE_PROMOS = 3
    const canPrevPromo = promoIdx > 0
    const canNextPromo = promoIdx + VISIBLE_PROMOS < promotions.length

    const handleNextPromo = () => {
        setPromoIdx(prev => {
            const nextVal = prev + 1; // Trượt từng cái một cho mượt hoặc đổi thành + VISIBLE_PROMOS nếu muốn trượt cả trang
            return nextVal > promotions.length - VISIBLE_PROMOS ? promotions.length - VISIBLE_PROMOS : nextVal;
        });
    }

    const handlePrevPromo = () => {
        setPromoIdx(prev => {
            const nextVal = prev - 1;
            return nextVal < 0 ? 0 : nextVal;
        });
    }

    return (

        <div className="pb-20">

            <div className={`fixed top-16 left-0 w-full z-40 bg-white border-b border-gray-100 py-3 px-4 shadow-xl transition-all duration-500 transform ${isSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
                }`}>
                <SearchBar variant="compact" />
            </div>

            <UpgradeToPartnerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-4 pt-16 pb-32">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Khám phá khách sạn tốt nhất
                        </h1>
                    </div>
                    <div className="max-w-5xl mx-auto">
                        <SearchBar variant="hero" />
                    </div>
                </div>
            </section>
            <section className="max-w-7xl mx-auto px-4 mt-14">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Các điểm thu hút nhất TP. Hồ Chí Minh
                </h2>
                <DistrictCarousel
                    hotels={hotels}
                    onSelect={d => router.push(`/hotels?districts=${encodeURIComponent(d)}`)}
                />
            </section>

            <section className="max-w-7xl mx-auto px-4 mt-14">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Khách sạn dành cho bạn</h2>
                    <button
                        onClick={() => router.push('/hotels')}
                        className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
                    >
                        Xem tất cả <ChevronRight size={16} />
                    </button>
                </div>

                {hotelsLoading ? (
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : featuredHotels.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">Chưa có khách sạn nào</div>
                ) : (
                    <div className="relative group/hotel-carousel px-6">
                        {/* Nút PREV */}
                        <button
                            onClick={handlePrevHotel}
                            disabled={!canPrevHotel}
                            className={`absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all duration-300
                    ${canPrevHotel ? 'opacity-100 hover:bg-gray-50 text-gray-800 scale-100' : 'opacity-0 pointer-events-none scale-75'}`}
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </button>

                        {/* Container trượt */}
                        <div className="overflow-hidden rounded-xl mx-1">
                            <div
                                className="flex gap-4 transition-transform duration-500 ease-out"
                                style={{
                                    transform: `translateX(calc(-${hotelIdx} * (100% / ${VISIBLE_HOTELS} + ${1 / VISIBLE_HOTELS}rem)))`
                                }}
                            >
                                {featuredHotels.map(h => (
                                    <div
                                        key={h.id}
                                        className="shrink-0 px-0.5"
                                        style={{ width: `calc(100% / ${VISIBLE_HOTELS} - ${(VISIBLE_HOTELS - 1) / VISIBLE_HOTELS}rem)` }}
                                    >
                                        <HotelCard
                                            hotel={h}
                                            checkIn={defaultCheckIn}
                                            checkOut={defaultCheckOut}
                                            promotions={promotions}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Nút NEXT */}
                        <button
                            onClick={handleNextHotel}
                            disabled={!canNextHotel}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all duration-300
                    ${canNextHotel ? 'opacity-100 hover:bg-gray-50 text-gray-800 scale-100' : 'opacity-0 pointer-events-none scale-75'}`}
                        >
                            <ChevronRight size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </section>

            {promotions.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 mt-14">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Ưu đãi đang diễn ra</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs bg-red-50 text-red-600 font-medium px-2.5 py-1 rounded-full">
                                🔥 {promotions.length} ưu đãi
                            </span>
                        </div>
                    </div>

                    <div className="relative group/promo-carousel px-6">
                        {/* Nút PREV */}
                        <button
                            onClick={handlePrevPromo}
                            disabled={!canPrevPromo}
                            className={`absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all duration-300
                ${canPrevPromo ? 'opacity-100 hover:bg-gray-50 text-gray-800 scale-100' : 'opacity-0 pointer-events-none scale-75'}`}
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </button>

                        {/* Container trượt */}
                        <div className="overflow-hidden rounded-xl">
                            <div
                                className="flex gap-4 transition-transform duration-500 ease-out"
                                style={{
                                    transform: `translateX(calc(-${promoIdx} * (100% / ${VISIBLE_PROMOS} + ${1 / VISIBLE_PROMOS}rem)))`
                                }}
                            >
                                {promotions.map((p: PromotionResponse) => (
                                    <div
                                        key={p.id}
                                        className="shrink-0"
                                        style={{ width: `calc(100% / ${VISIBLE_PROMOS} - ${(VISIBLE_PROMOS - 1) / VISIBLE_PROMOS}rem)` }}
                                    >
                                        <PromotionCard promotion={p} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Nút NEXT */}
                        <button
                            onClick={handleNextPromo}
                            disabled={!canNextPromo}
                            className={`absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all duration-300
                ${canNextPromo ? 'opacity-100 hover:bg-gray-50 text-gray-800 scale-100' : 'opacity-0 pointer-events-none scale-75'}`}
                        >
                            <ChevronRight size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </section>
            )}

            <section className="max-w-7xl mx-auto px-4 mt-14 mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-emerald-500 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-white">
                        <h3 className="text-2xl font-bold mb-2">Bạn là chủ khách sạn?</h3>
                        <p className="text-blue-100">Đăng ký ngay để tiếp cận hàng nghìn khách hàng tiềm năng tại TP.HCM</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
                    >
                        Đăng ký ngay →
                    </button>
                </div>
            </section>
        </div>
    )
}

// ─── District Carousel ────────────────────────────────────
function DistrictCarousel({
    hotels,
    onSelect,
}: {
    hotels: HotelSummaryResponse[]
    onSelect: (d: string) => void
}) {
    const VISIBLE = 5
    const [startIdx, setStartIdx] = useState(0)
    const canPrev = startIdx > 0
    const canNext = startIdx + VISIBLE < DISTRICTS.length

    const handleNext = () => {
        setStartIdx(prev => {
            const nextVal = prev + VISIBLE;
            return nextVal > DISTRICTS.length - VISIBLE ? DISTRICTS.length - VISIBLE : nextVal;
        });
    }

    const handlePrev = () => {
        setStartIdx(prev => {
            const nextVal = prev - VISIBLE;
            return nextVal < 0 ? 0 : nextVal;
        });
    }

    return (
        <div className="relative group">
            <button
                onClick={handlePrev}
                disabled={!canPrev}
                className={`absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center transition-all
                    ${canPrev ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
            >
                <ChevronLeft size={24} />
            </button>

            <div className="overflow-hidden">
                {/* 
                   SỬA TẠI ĐÂY: 
                   1. Bỏ gap-4, thay bằng -mx-2 để bù đắp padding của item con
                   2. Translate tính thuần theo %
                */}
                <div
                    className="flex transition-transform duration-500 ease-out -mx-2"
                    style={{
                        transform: `translateX(-${(startIdx * 100) / VISIBLE}%)`
                    }}
                >
                    {DISTRICTS.map(d => {
                        const count = hotels.filter(h => h.district === d).length
                        const img = DISTRICT_IMAGES[d] ?? FALLBACK
                        return (
                            <div
                                key={d}
                                className="shrink-0 px-2" // Sử dụng px-2 thay cho gap để tạo khoảng cách 16px (2 bên là 16)
                                style={{ width: `${100 / VISIBLE}%` }} // Chia đều chính xác 20% mỗi item
                            >
                                <button
                                    onClick={() => onSelect(d)}
                                    className="w-full text-left group/item"
                                >
                                    <div className="rounded-2xl overflow-hidden aspect-[4/3] mb-3 shadow-sm bg-gray-100">
                                        <img
                                            src={img}
                                            alt={d}
                                            className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="font-bold text-base text-gray-900 group-hover/item:text-blue-600 transition-colors truncate">
                                        {d}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-0.5">
                                        {count > 0 ? `${count} khách sạn` : 'Khám phá ngay'}
                                    </div>
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            <button
                onClick={handleNext}
                disabled={!canNext}
                className={`absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center transition-all
                    ${canNext ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
            >
                <ChevronRight size={24} />
            </button>
        </div>
    )
}

// ─── Hotel Card ───────────────────────────────────────────
function HotelCard({
    hotel,
    checkIn,
    checkOut,
    promotions
}: {
    hotel: HotelSummaryResponse,
    checkIn: string,
    checkOut: string
    promotions: PromotionResponse[]
}) {
    const router = useRouter()

    const handleCardClick = () => {
        // Truyền đúng các tham số đã dùng để search ở Home sang trang chi tiết
        router.push(`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=1&children=0&rooms=1`)
    }

    const displayImage = hotel.thumbnailUrl || hotel.images?.find(i => i.isPrimary)?.imageUrl;
    const stars = Math.round(Number(hotel.starRating ?? 0));

    const hotelPromo = promotions.find(p => p.hotelId === hotel.id);

    return (
        <div
            onClick={handleCardClick}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full"
        >
            {/* Image Section */}
            <div className="h-44 bg-gray-100 relative overflow-hidden shrink-0">
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={hotel.hotelName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🏨</div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                    <Star size={11} fill="#f59e0b" className="text-amber-500" />
                    <span className="text-xs font-bold text-gray-800">{hotel.starRating ?? 0}</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-700 transition-colors">
                    {hotel.hotelName}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-gray-400">
                    <MapPin size={11} />
                    <span className="text-[11px] truncate">{hotel.district}, {hotel.city}</span>
                </div>

                <div className="mt-auto pt-4 flex items-end justify-between border-t border-gray-50">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-medium">Giá 1 đêm từ</span>
                        <div className="text-red-600 font-bold text-lg">
                            {hotel.minPrice ? (
                                `${hotel.minPrice.toLocaleString('vi-VN')}₫`
                            ) : (
                                <span className="text-gray-400 text-sm font-normal italic">Liên hệ</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        {hotelPromo && (
                            <div className="flex items-center gap-1 text-red-600 font-bold text-[10px] animate-pulse">
                                <Tag size={10} /> Có ưu đãi
                            </div>
                        )}

                        <div className="text-[11px] bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
                            Xem chi tiết
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Promotion Card ───────────────────────────────────────
function PromotionCard({ promotion }: {
    promotion: PromotionResponse
}) {
    const router = useRouter()

    // Tính số ngày còn lại
    const daysLeft = Math.ceil(
        (new Date(promotion.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    const handleUseNow = () => {
        if (promotion.hotelId) {
            router.push(`/hotels/${promotion.hotelId}`)
        } else {
            router.push('/hotels')
        }
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all h-full flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                    <Tag size={18} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-blue-700 text-sm uppercase">{promotion.promoCode}</div>
                    <div className="text-xs text-gray-500 truncate">
                        {promotion.hotelName ? `Dành cho ${promotion.hotelName}` : 'Áp dụng toàn sàn'}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-red-500">{promotion.discountPercent}%</div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Giảm</div>
                </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-500 flex-1">
                <div className="flex justify-between">
                    <span>Giảm tối đa</span>
                    <span className="font-medium text-gray-700">{promotion.maxDiscountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
                {promotion.minOrderValue && (
                    <div className="flex justify-between">
                        <span>Đơn tối thiểu</span>
                        <span className="font-medium text-gray-700">{promotion.minOrderValue.toLocaleString('vi-VN')}₫</span>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${daysLeft <= 3 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                    {daysLeft <= 0 ? 'Hết hạn' : `Còn ${daysLeft} ngày`}
                </span>
                <button
                    onClick={handleUseNow}
                    className="text-xs text-blue-600 font-bold hover:text-blue-800 transition-colors flex items-center gap-1"
                >
                    Dùng ngay <ArrowRight size={12} />
                </button>
            </div>
        </div>
    )
}

export default function HomePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
            <HomeContent />
        </Suspense>
    )
}