export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center text-white text-sm">🏨</div>
            <span className="text-white font-bold text-lg">Vago Hotel</span>
          </div>
          <p className="text-sm leading-relaxed">
            Nền tảng đặt phòng khách sạn hàng đầu tại TP.HCM. Hàng trăm khách sạn chất lượng, giá tốt nhất.
          </p>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Về chúng tôi</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Giới thiệu</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Điều khoản</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Chính sách</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Hỗ trợ</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Trung tâm trợ giúp</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Liên hệ</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Báo cáo lỗi</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Liên hệ</h4>
          <ul className="space-y-2 text-sm">
            <li>📧 support@vago.com</li>
            <li>📞 1800 1234</li>
            <li>📍 TP. Hồ Chí Minh</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 text-center py-4 text-xs">
        © 2026 Vago Hotel. All rights reserved.
      </div>
    </footer>
  )
}