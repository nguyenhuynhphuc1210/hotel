'use client'

import { useState, useEffect } from 'react'
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


// ─── Districts ────────────────────────────────────────────
const DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Q. Bình Thạnh', 'Q. Gò Vấp', 'Q. Tân Bình',
    'Q. Tân Phú', 'Q. Phú Nhuận', 'Q. Thủ Đức', 'Q. Bình Tân',
    'H. Củ Chi', 'H. Hóc Môn', 'H. Nhà Bè', 'H. Bình Chánh', 'H. Cần Giờ',
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
    'Q. Bình Thạnh': 'https://www.vinhomescentralpark.co/wp-content/uploads/2021/04/landmark81.jpeg',
    'Q. Gò Vấp': 'http://reviewvilla.vn/wp-content/uploads/2022/06/mieu-noi-go-vap-1.jpeg',
    'Q. Tân Bình': 'https://statics.vinpearl.com/dien-tich-san-bay-tan-son-nhat-1_1685770904.png',
    'Q. Tân Phú': 'https://vnanet.vn/Data/Articles/2022/08/04/6260752/vna_potal_tpho_chi_minh_xay_dung_khu_di_tich_lich_su_tro_thanh_noi_giao_duc_truyen_thong_cach_mang_cho_the_he_tre_stand.jpg',
    'Q. Phú Nhuận': 'https://vntravel.org.vn/uploads/images/2023/10/27/img-3507-1698382722.JPG',
    'Q. Thủ Đức': 'https://quocbaobds.com/wp-content/uploads/2020/10/Lang-dai-hoc-thu-duc.jpg',
    'Q. Bình Tân': 'https://aeonmall-vietnam.com/wp-content/uploads/2017/04/DSC2455-1.jpg',
    'H. Củ Chi': 'https://botohongdao.com/wp-content/uploads/2023/10/dia-dao-cu-chi-1.jpg',
    'H. Hóc Môn': 'https://cdn.vntrip.vn/cam-nang/wp-content/uploads/2017/09/cong-tam-quan.jpg',
    'H. Nhà Bè': 'https://media-cdn-v2.laodong.vn/Storage/NewsPortal/2021/1/7/868650/Cau-Phuoc-Loc-2.jpg',
    'H. Bình Chánh': 'https://cdn3.ivivu.com/2020/04/nhung-canh-dong-hoa-ruc-ro-the-gioi-ivivu-1.png',
    'H. Cần Giờ': 'https://tiimtravel.vn/uploads/files/2023/04/02/bien-can-gio.jpg',
}
const FALLBACK = 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop'

export default function HomePage() {
    const router = useRouter()
    const [currentPage, setCurrentPage] = useState(0)
    const pageSize = 8

    const { data: hotelsPage, isLoading: hotelsLoading } = useQuery({
        queryKey: ['hotels-active', currentPage],
        queryFn: () => hotelApi.getActive(currentPage, pageSize).then(r => r.data),
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

    const hotels = hotelsPage?.content || []

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

    return (
        <div className="pb-20">
            <div className={`fixed top-16 left-0 w-full z-40 bg-white border-b border-gray-100 py-3 px-4 shadow-xl transition-all duration-500 transform ${isSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
                }`}>
                <SearchBar variant="compact" />
            </div>

           <section className="relative bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 text-white">
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
                    onSelect={d => router.push(`/hotels?district=${encodeURIComponent(d)}`)}
                />
            </section>

            <section className="max-w-7xl mx-auto px-4 mt-14">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Khách sạn dành cho bạn</h2>
                    <button
                        onClick={() => router.push('/hotels')}
                        className="flex items-center gap-1 text-sm text-green-600 font-medium hover:underline"
                    >
                        Xem tất cả <ChevronRight size={16} />
                    </button>
                </div>

                {hotelsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : featuredHotels.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">Chưa có khách sạn nào</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {featuredHotels.map(h => <HotelCard key={h.id} hotel={h} />)}
                        </div>

                        {hotelsPage && hotelsPage.totalPages > 1 && (
                            <div className="mt-10 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                    className="p-2 border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(hotelsPage.totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i)}
                                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === i
                                                ? 'bg-green-600 text-white'
                                                : 'hover:bg-green-50 text-gray-600'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(hotelsPage.totalPages - 1, p + 1))}
                                    disabled={currentPage === hotelsPage.totalPages - 1}
                                    className="p-2 border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {promotions.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 mt-14">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Ưu đãi đang diễn ra</h2>
                        <span className="text-xs bg-red-50 text-red-600 font-medium px-2.5 py-1 rounded-full">
                            🔥 {promotions.length} ưu đãi
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {promotions.slice(0, 6).map((p: PromotionResponse) => <PromotionCard key={p.id} promotion={p} />)}
                    </div>
                </section>
            )}

            <section className="max-w-7xl mx-auto px-4 mt-14 mb-6">
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-white">
                        <h3 className="text-2xl font-bold mb-2">Bạn là chủ khách sạn?</h3>
                        <p className="text-green-100">Đăng ký ngay để tiếp cận hàng nghìn khách hàng tiềm năng tại TP.HCM</p>
                    </div>
                    <button
                        onClick={() => router.push('/register')}
                        className="flex items-center gap-2 bg-white text-green-700 font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors shrink-0"
                    >
                        Đăng ký ngay <ArrowRight size={18} />
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

    return (
        <div className="relative px-1">
            <button
                onClick={() => setStartIdx(i => Math.max(0, i - 1))}
                disabled={!canPrev}
                className={`absolute -left-5 top-1/2 -translate-y-6 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center transition-all
          ${canPrev ? 'hover:bg-gray-50 text-gray-700 opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <ChevronLeft size={18} />
            </button>

            <div className="overflow-hidden">
                <div
                    className="flex gap-3 transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(calc(-${startIdx} * (20% + 0.6rem)))` }}
                >
                    {DISTRICTS.map(d => {
                        const count = hotels.filter(h => h.district === d).length
                        const img = DISTRICT_IMAGES[d] ?? FALLBACK
                        return (
                            <button
                                key={d}
                                onClick={() => onSelect(d)}
                                className="shrink-0 text-left group"
                                style={{ width: 'calc(20% - 0.6rem)' }}
                            >
                                <div className="rounded-2xl overflow-hidden aspect-[4/3] mb-2.5 shadow-sm">
                                    <img
                                        src={img}
                                        alt={d}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="font-semibold text-sm text-gray-900 group-hover:text-green-700 transition-colors truncate">
                                    {d}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">{count > 0 ? `${count} khách sạn` : 'Khám phá ngay'}</div>
                            </button>
                        )
                    })}
                </div>
            </div>

            <button
                onClick={() => setStartIdx(i => Math.min(DISTRICTS.length - VISIBLE, i + 1))}
                disabled={!canNext}
                className={`absolute -right-5 top-1/2 -translate-y-6 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center transition-all
          ${canNext ? 'hover:bg-gray-50 text-gray-700 opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <ChevronRight size={18} />
            </button>
        </div>
    )
}

// ─── Hotel Card ───────────────────────────────────────────
function HotelCard({ hotel }: { hotel: HotelSummaryResponse }) {
    const router = useRouter()
    const handleCardClick = () => {
        router.push(`/hotels/${hotel.id}`)
    }
    const displayImage = hotel.thumbnailUrl || hotel.images?.find(i => i.isPrimary)?.imageUrl;

    return (
        <div
            onClick={handleCardClick}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
        >
            <div className="h-44 bg-gradient-to-br from-green-100 to-emerald-50 relative overflow-hidden">
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={hotel.hotelName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🏨</div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Star size={11} fill="#f59e0b" className="text-amber-500" />
                    <span className="text-xs font-semibold text-gray-800">{hotel.starRating ?? 0}</span>
                </div>
            </div>
            <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-green-700 transition-colors">
                    {hotel.hotelName}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-gray-400">
                    <MapPin size={11} />
                    <span className="text-xs truncate">{hotel.district}, {hotel.city}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-gray-400">Từ</span>
                        <div className="text-green-600 font-bold text-sm">
                            {hotel.minPrice ? `${hotel.minPrice.toLocaleString()}₫` : 'Liên hệ'}
                        </div>
                    </div>
                    <button className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                        Xem chi tiết
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Promotion Card ───────────────────────────────────────
// Đã fix kiểu dữ liệu từ any sang PromotionResponse
function PromotionCard({ promotion }: {
    promotion: PromotionResponse
}) {
    const daysLeft = Math.ceil(
        (new Date(promotion.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                    <Tag size={18} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-green-700 text-sm">{promotion.promoCode}</div>
                    <div className="text-xs text-gray-500 truncate">{promotion.hotelName || 'Tất cả khách sạn'}</div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-red-500">{promotion.discountPercent}%</div>
                    <div className="text-xs text-gray-400">giảm</div>
                </div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
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
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${daysLeft <= 3 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {daysLeft <= 0 ? 'Hết hạn' : `Còn ${daysLeft} ngày`}
                </span>
                <button className="text-xs text-green-600 font-medium hover:underline">Dùng ngay →</button>
            </div>
        </div>
    )
}