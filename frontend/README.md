# 🏨 Vago Hotel — Frontend

> Nền tảng đặt phòng khách sạn trực tuyến tại TP.HCM, được xây dựng bằng **Next.js 14+ (App Router)** + **TypeScript**.

🌐 **Production:** https://hotel-zeta-azure.vercel.app/

🔗 **Backend API:** https://hotel-backend-y3hd.onrender.com

📁 **Repository:** https://github.com/nguyenhuynhphuc1210/hotel

---

## 📋 Mục lục

- Tổng quan
- Công nghệ sử dụng
- Tính năng chính
- Cấu trúc thư mục
- Hướng dẫn cài đặt
- Biến môi trường
- Scripts
- Kiến trúc hệ thống
- Phân quyền & RBAC

---

## 🌟 Tổng quan

Vago Hotel là hệ thống quản lý và đặt phòng khách sạn trực tuyến với ba phân hệ chính:

| Phân hệ | Route | Mô tả |
|---|---|---|
| Khách hàng | `/home`, `/hotels`, `/booking`, `/profile` | Tìm kiếm, đặt phòng, thanh toán |
| Chủ khách sạn | `/owner/*` | Quản lý cơ sở, phòng, lịch giá, booking |
| Quản trị viên | `/admin/*` | Giám sát toàn hệ thống, duyệt khách sạn, thống kê |

---

## 🛠 Công nghệ sử dụng

| Hạng mục | Thư viện / Công nghệ |
|---|---|
| Framework | [Next.js 14+](https://nextjs.org/) (App Router) |
| Ngôn ngữ | TypeScript |
| Styling | Tailwind CSS v4 + `tailwind-merge` + shadcn/ui |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Data fetching | [@tanstack/react-query](https://tanstack.com/query) |
| HTTP client | [Axios](https://axios-http.com/) (cấu hình tại `lib/api/axios.ts`) |
| Forms | `react-hook-form` + `zod` |
| Auth | `next-auth` + Google OAuth (`@react-oauth/google`) |
| Realtime | `sockjs-client` + `@stomp/stompjs` (WebSocket) |
| UI | `react-hot-toast`, gallery modal, Pagination |
| Deploy | [Vercel](https://vercel.com/) |

---

## ✨ Tính năng chính

### 👤 Khách hàng

- **Xác thực:** Đăng ký / đăng nhập bằng email-password hoặc Google OAuth 2.0.
- **Tìm kiếm & lọc:** Tìm khách sạn theo quận, hạng sao, khoảng giá, ngày nhận/trả, số khách.
- **Chi tiết khách sạn:** Xem gallery ảnh, tiện nghi, loại phòng, chính sách, bản đồ vị trí.
- **Đặt phòng:** Quy trình đầy đủ — chọn phòng → nhập thông tin → áp mã giảm giá → thanh toán.
- **Thanh toán:** Hỗ trợ VNPAY, MoMo và thanh toán tại khách sạn (nếu backend cung cấp).
- **Đánh giá:** Gửi đánh giá sau khi hoàn thành lưu trú.
- **Yêu thích:** Lưu và quản lý danh sách khách sạn yêu thích.
- **Nhắn tin:** Chat thời gian thực với chủ khách sạn qua WebSocket/STOMP.
- **Hồ sơ cá nhân:** Cập nhật thông tin, xem lịch sử đặt phòng, đổi mật khẩu.

### 🏨 Chủ khách sạn (Owner)

- **Dashboard:** Thống kê doanh thu và báo cáo theo cơ sở.
- **Quản lý khách sạn:** Tạo / chỉnh sửa thông tin, chính sách, tiện ích; upload ảnh.
- **Quản lý loại phòng:** CRUD loại phòng, cấu hình giá và tiện nghi.
- **Lịch & Giá:** Calendar pricing theo từng ngày, hỗ trợ cập nhật hàng loạt.
- **Quản lý đặt phòng:** Theo dõi, lọc, cập nhật trạng thái booking; xuất Excel.
- **Giao dịch thanh toán:** Theo dõi giao dịch theo cơ sở; export.
- **Đánh giá:** Xem và phản hồi đánh giá khách hàng.
- **Khuyến mãi:** Tạo và quản lý mã giảm giá cho khách sạn của owner.
- **Tin nhắn:** Nhắn tin thời gian thực với khách hàng.

### 🔧 Quản trị viên (Admin)

- **Dashboard:** KPI toàn hệ thống — khách sạn, đặt phòng, người dùng, doanh thu.
- **Quản lý khách sạn:** Duyệt cơ sở mới, tạm ngưng, xóa mềm (soft delete).
- **Quản lý đặt phòng & thanh toán:** Giám sát toàn hệ thống, cập nhật trạng thái, xuất Excel.
- **Quản lý người dùng:** Phân quyền (`ROLE_USER`, `ROLE_OWNER`, `ROLE_ADMIN`), khóa tài khoản.
- **Tiện ích hệ thống:** CRUD tiện ích chung cho khách sạn và loại phòng.
- **Đánh giá & kiểm duyệt:** Ẩn đánh giá vi phạm, xử lý báo cáo.
- **Khuyến mãi toàn cục:** Tạo mã áp dụng cho toàn hệ thống hoặc từng khách sạn.
- **Thùng rác:** Khôi phục hoặc xóa vĩnh viễn dữ liệu đã xóa mềm.

---

## 📁 Cấu trúc thư mục

```
hotel/frontend/
├── app/                        # Next.js App Router
│   ├── (admin)/                # Phân hệ quản trị viên
│   │   └── admin/
│   │       ├── page.tsx/
│   │       ├── hotels/
│   │       ├── bookings/
│   │       ├── payments/
│   │       ├── users/
│   │       ├── amenities/
│   │       ├── reviews/
│   │       ├── promotions/
│   │       └── trash/
│   ├── (owner)/                # Phân hệ chủ khách sạn
│   │   └── owner/
│   │       ├── page.tsx/
│   │       ├── hotel/
│   │       ├── hotels/
│   │       ├── rooms/
│   │       ├── calendar/
│   │       ├── bookings/
│   │       ├── payments/
│   │       ├── reviews/
│   │       ├── promotions/
│   │       └── messages/
│   ├── (main)/                 # Phân hệ khách hàng - public
│   │   ├── home/
│   │   └── hotels/
│   │       └── [id]/
│   ├── (booking)/              # Luồng đặt phòng
│   │   └── booking/
│   │       ├── page.tsx
│   │       ├── detail/
│   │       ├── success/
│   │       └── failed/
│   ├── (user)/                 # Phân hệ tài khoản khách hàng
│   │   └── profile/
│   │       ├── page.tsx
│   │       ├── booking/
│   │       ├── message/
│   │       ├── favorites/
│   │       └── security/
│   └── (auth)/                 # Xác thực
│       ├── login/
│       └── register/
├── components/                 # UI components dùng chung
│   ├── chat/                   # Chat widget (WebSocket)
│   ├── ui/                     # shadcn/ui components
│   └── ...
├── config/
│   └── api.config.ts           # Định nghĩa base URL & endpoints
├── hooks/                      # Custom React hooks
│   ├── useNotificationSocket.ts
│   ├── useStatistic.ts
│   └── ...
├── lib/
│   └── api/                    # API call functions
│       ├── axios.ts            # Axios instance (auto-attach JWT, handle 401)
│       ├── booking.api.ts
│       ├── hotel.api.ts
│       ├── favorite.api.ts
│       ├── review.api.ts
│       ├── export.api.ts
│       └── ...
├── store/
│   └── authStore.ts            # Zustand auth state
├── types/                      # TypeScript interfaces
├── public/                     # Static assets
├── middleware.ts               # RBAC route protection
└── .env.local                  # Biến môi trường (không commit)
```

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu

- **Node.js** 18+
- **npm** / **pnpm** / **yarn**

### Các bước

```bash
# 1. Clone repository
git clone https://github.com/nguyenhuynhphuc1210/hotel.git
cd hotel/frontend

# 2. Cài đặt dependencies
npm install

# 3. Tạo file biến môi trường
cp .env.example .env.local
# Chỉnh sửa .env.local theo hướng dẫn bên dưới

# 4. Chạy development server
npm run dev
```

Truy cập: http://localhost:3000

---

## ⚙️ Biến môi trường

Tạo file `.env.local` tại thư mục gốc với nội dung sau (ví dụ):

```ini
# URL Backend API
NEXT_PUBLIC_API_URL=http://localhost:8080

# Google OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# NextAuth (dùng cho xác thực server-side)
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

> **Lưu ý cho môi trường Production (Vercel):**
>
> `NEXT_PUBLIC_API_URL` → `https://hotel-backend-y3hd.onrender.com`
> `NEXTAUTH_URL` → `https://hotel-zeta-azure.vercel.app/`

---

## 📜 Scripts

```
npm run dev    # Chạy development server (hot reload)
npm run build  # Build production
npm run start  # Chạy production server sau khi build
npm run lint   # Kiểm tra lỗi ESLint
```

---

## 🏗 Kiến trúc hệ thống

```
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│         (Vercel - vagohotel.vercel.app) │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  Client  │ │  Owner   │ │  Admin  │ │
│  │  Pages   │ │  Pages   │ │  Pages  │ │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       │             │            │      │
│  ┌────▼─────────────▼────────────▼────┐ │
│  │         Axios Instance             │ │
│  │  (JWT auto-attach, 401 handler)   │ │
│  └────────────────┬───────────────────┘ │
└───────────────────┼─────────────────────┘
                    │ HTTPS REST API
                    │ WebSocket (STOMP)
┌───────────────────▼─────────────────────┐
│         Spring Boot Backend             │
│      (Render - hotel-backend-y3hd)      │
│                                         │
│  Spring Security + JWT + CORS           │
│  JPA / Hibernate → PostgreSQL           │
│  Cloudinary │ Gmail SMTP │ Gemini API   │
│  VNPAY │ MoMo │ Google OAuth            │
└─────────────────────────────────────────┘
```

### Luồng xác thực

```
User nhập credentials
        │
        ▼
POST /api/auth/login
        │
        ▼
Backend trả JWT Token
        │
        ▼
Lưu vào localStorage (access_token)
        │
        ▼
Axios tự động gắn Authorization header
        │
        ▼
middleware.ts kiểm tra Role → điều hướng
```

---

## 🔐 Phân quyền & RBAC

Hệ thống sử dụng `middleware.ts` để bảo vệ route dựa trên Role trong JWT:

| Role | Phạm vi truy cập |
|---|---|
| `ROLE_USER` | `/home`, `/hotels`, `/booking/*`, `/profile/*` |
| `ROLE_OWNER` | Tất cả trên + `/owner/*` |
| `ROLE_ADMIN` | Tất cả trên + `/admin/*` |

> Truy cập sai phân vùng sẽ bị chuyển hướng tự động về trang phù hợp.

---

## 🔧 Lưu ý kỹ thuật

- **Token:** JWT được lưu trong `localStorage` với key `access_token`. Axios tự động đính kèm `Authorization: Bearer <token>`. Khi backend trả về `401`, client xóa token và redirect về trang đăng nhập.

- **Realtime:** WebSocket kết nối đến Backend qua endpoint SockJS `/ws`, sử dụng giao thức STOMP để subscribe topic theo `userId` hoặc `hotelId`.

- **Ảnh:** Ảnh được lưu trên Cloudinary; Frontend gọi CDN URL trực tiếp.

- **AI:** Tích hợp Gemini (thông qua Backend) để xử lý câu hỏi ngôn ngữ tự nhiên.

---

## 📄 Giấy phép

Dự án được phát triển cho mục đích học thuật — Đồ án môn học.


