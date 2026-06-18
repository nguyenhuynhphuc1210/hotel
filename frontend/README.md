# 🏨 Vago Hotel — Frontend

> **Nền tảng đặt phòng khách sạn trực tuyến tại TP.HCM** được xây dựng bằng **Next.js 16+ (App Router)** + **TypeScript** + **Tailwind CSS** + **React Query**

🌐 **Production:** https://hotel-zeta-azure.vercel.app/

🔗 **Backend API:** https://hotel-backend-y3hd.onrender.com

📁 **Repository:** https://github.com/nguyenhuynhphuc1210/hotel

---

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Tính năng chính](#tính-năng-chính)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
- [Biến môi trường](#biến-môi-trường)
- [Scripts & Lệnh](#scripts--lệnh)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Phân quyền & RBAC](#phân-quyền--rbac)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Best Practices](#best-practices)

---

## 🌟 Tổng quan

**Vago Hotel** là một hệ thống quản lý và đặt phòng khách sạn toàn diện với ba phân hệ chính:

| Phân hệ | Route | Mô tả |
|---|---|---|
| **👤 Khách hàng** | `/home`, `/hotels`, `/booking`, `/profile` | Tìm kiếm, đặt phòng, thanh toán, quản lý hồ sơ |
| **🏨 Chủ khách sạn** | `/owner/*` | Quản lý cơ sở, phòng, lịch giá, booking, doanh thu |
| **🔧 Quản trị viên** | `/admin/*` | Giám sát toàn hệ thống, duyệt khách sạn, thống kê |

---

## 🛠 Công nghệ sử dụng

| Hạng mục | Công nghệ |
|---|---|
| **Framework** | [Next.js 16.1](https://nextjs.org/) (App Router) |
| **Ngôn ngữ** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **State Management** | [Zustand 5](https://zustand-demo.pmnd.rs/) |
| **Data Fetching** | [@tanstack/react-query 5](https://tanstack.com/query) |
| **HTTP Client** | [Axios 1.13](https://axios-http.com/) |
| **Forms & Validation** | [react-hook-form 7](https://react-hook-form.com/) + [Zod 4](https://zod.dev/) |
| **Authentication** | [next-auth 4.24](https://next-auth.js.org/) + [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2) |
| **Realtime** | [SockJS](https://sockjs.org/) + [@stomp/stompjs 7](http://stomp-js.github.io/) (WebSocket) |
| **UI Components** | [Lucide React](https://lucide.dev/) + [React Icons](https://react-icons.github.io/react-icons/) |
| **Notifications** | [react-hot-toast](https://react-hot-toast.com/) |
| **Charts** | [Recharts 3](https://recharts.org/) |
| **Date Handling** | [date-fns 4](https://date-fns.org/) + [react-day-picker 9](https://react-day-picker.js.org/) |
| **Deploy** | [Vercel](https://vercel.com/) |

---

## ✨ Tính năng chính

### 👤 Khách hàng (Customer)

#### 🔐 Xác thực
- Đăng ký / Đăng nhập bằng **email-password**
- **Google OAuth 2.0** integration
- Quên mật khẩu + xác thực OTP
- Token-based authentication (JWT)

#### 🔍 Tìm kiếm & Lọc
- Tìm kiếm khách sạn theo **quận, hạng sao, khoảng giá**
- Lọc theo **ngày nhận/trả phòng, số khách**
- Sắp xếp theo **giá, đánh giá, người ở gần đây**
- Real-time search results

#### 🏨 Chi tiết khách sạn
- Xem **gallery ảnh** tối ưu hóa (modal responsive)
- **Danh sách tiện ích** toàn cơ sở
- **Loại phòng** với giá, ảnh, mô tả chi tiết
- **Chính sách khách sạn** (hủy phòng, check-in, etc.)
- **Bản đồ Google Maps** vị trí khách sạn
- **Đánh giá & xếp hạng** từ khách khác

#### 🛏️ Đặt phòng (Booking)
- Quy trình multi-step: **Chọn phòng → Thông tin → Mã giảm giá → Thanh toán**
- Tính toán tự động: **giá cơ bản, giảm giá, tổng tiền**
- Tích hợp **mã khuyến mãi** (có validation thời gian)
- Hiển thị **trạng thái booking** (Pending, Confirmed, Cancelled, etc.)

#### 💳 Thanh toán
- Hỗ trợ **VNPAY, MoMo** (integration backend)
- **Thanh toán tại khách sạn** (COD)
- Lịch sử giao dịch chi tiết
- Hoá đơn điện tử

#### ⭐ Đánh giá & Đánh giá
- Gửi đánh giá sau khi **checkout** hoặc **quá thời gian booking**
- **Rating sao + bình luận** văn bản
- Upload **ảnh đánh giá**
- Xem đánh giá khác

#### ❤️ Danh sách yêu thích
- Lưu khách sạn yêu thích
- Quản lý danh sách
- Quick access từ trang chủ

#### 💬 Nhắn tin (Chat)
- **Realtime chat** với chủ khách sạn qua WebSocket/STOMP
- Lịch sử cuộc trò chuyện
- Notification khi có tin nhắn mới
- Avatar & tên người nhắn

#### 👥 Hồ sơ cá nhân
- Cập nhật **thông tin cá nhân** (tên, SĐT, DOB, giới tính)
- Thay đổi **avatar**
- Xem **lịch sử đặt phòng**
- **Đổi mật khẩu**
- Quản lý **địa chỉ lưu trữ**

---

### 🏨 Chủ khách sạn (Hotel Owner)

#### 📊 Dashboard
- **KPI dashboard**: Doanh thu, số booking, rating, occupancy rate
- **Biểu đồ xu hướng** doanh thu theo tháng/năm
- **Top phòng bán chạy**
- **Thống kê khách hàng**

#### 🏢 Quản lý khách sạn
- **Thêm/Sửa thông tin** khách sạn
  - Tên, địa chỉ, quận, mô tả chi tiết
  - Hạng sao, số phòng
  - Số điện thoại, email
- **Upload gallery ảnh** (multiple + drag-drop)
- **Quản lý tiện ích** (Wifi, Bơi, Gym, etc.)
- **Quản lý chính sách**
  - Chính sách hủy phòng
  - Thời gian check-in/check-out
  - Số lượng khách tối đa
- **Quản lý số điện thoại liên hệ**

#### 🛏️ Quản lý loại phòng (Room Types)
- **CRUD room types**
  - Tên phòng, mô tả, số khách
  - Giá cơ bản, kích thước
  - Tiện nghi phòng
  - Upload ảnh phòng
- **Bulk price update** cho ngày/khoảng ngày
- **Quản lý số phòng hiện có**

#### 📅 Lịch & Giá (Calendar Pricing)
- **Calendar view** toàn tháng
- **Update giá theo ngày** (day-by-day)
- **Bulk update**: thay đổi giá nhiều ngày cùng lúc
- **Quản lý khả dụng phòng**
- **Khóa phòng** (locked dates)

#### 📋 Quản lý đặt phòng
- **Danh sách booking** (filter, sort, search)
- Lọc theo **trạng thái**: Pending, Confirmed, Cancelled, Completed
- Lọc theo **ngày booking, khách hàng**
- **Cập nhật trạng thái** booking
- **Xem chi tiết** khách hàng, phòng, thanh toán
- **Export Excel** danh sách booking

#### 💰 Giao dịch thanh toán
- **Danh sách giao dịch** theo cơ sở
- Xem **chi tiết thanh toán** từng booking
- Lọc theo **trạng thái, phương thức**
- **Export báo cáo tài chính**
- Tính **doanh thu ròng** (sau hoa hồng, chiết khấu)

#### ⭐ Quản lý đánh giá
- Xem **danh sách đánh giá** khách sạn
- **Phản hồi đánh giá** (reply)
- **Ẩn đánh giá** vi phạm
- **Analytics đánh giá** (average rating, trending)

#### 🎁 Khuyến mãi (Promotions)
- **Tạo mã giảm giá** cho khách sạn
  - Mã code, % giảm / giảm cố định
  - Thời gian hiệu lực
  - Số lượng giới hạn
  - Giá tối thiểu áp dụng
- **Quản lý mã**: Edit, Pause, Delete
- **Track usage**: Xem mã nào được sử dụng nhiều

#### 💬 Nhắn tin
- **Realtime conversation** với khách hàng
- Lịch sử cuộc trò chuyện
- Gửi **hình ảnh, file** (nếu backend support)
- Notification WebSocket

---

### 🔧 Quản trị viên (Admin)

#### 📊 Dashboard
- **KPI toàn hệ thống**:
  - Tổng số khách sạn, booking, người dùng
  - Tổng doanh thu (gross revenue)
  - Occupancy rate trung bình
  - Average rating
- **Biểu đồ xu hướng**: Booking/doanh thu theo tháng
- **Top khách sạn** theo doanh thu
- **Thống kê người dùng**: New users, active users

#### 🏢 Quản lý khách sạn
- **Danh sách tất cả khách sạn**
  - Lọc theo trạng thái: Pending, Active, Suspended, Deleted
  - Tìm kiếm theo tên, chủ sở hữu
- **Duyệt khách sạn mới** (Approve/Reject)
- **Tạm ngưng khách sạn** (Suspend) - tạm thời không hiển thị
- **Soft delete** khách sạn (có thể khôi phục)
- **Xem chi tiết & chỉnh sửa** thông tin khách sạn

#### 👥 Quản lý người dùng
- **Danh sách người dùng** (tất cả role)
- **Phân quyền người dùng**:
  - Upgrade từ User → Owner
  - Promote/Demote Admin
- **Khóa/Mở khóa tài khoản** (disable account)
- **Reset mật khẩu** cho người dùng
- **Xem hoạt động người dùng** (login history)

#### 📋 Quản lý đặt phòng & Thanh toán
- **Danh sách booking toàn hệ thống**
  - Lọc theo trạng thái, khách sạn, ngày
  - Tìm kiếm theo khách hàng
- **Cập nhật trạng thái booking** (nếu cần can thiệp)
- **Danh sách giao dịch toàn hệ thống**
  - Lọc theo phương thức thanh toán, trạng thái
  - Xem chi tiết transaction
- **Giải quyết tranh chấp** (payment disputes)
- **Export báo cáo tài chính toàn hệ thống**

#### 🏷️ Quản lý tiện ích (Amenities)
- **CRUD amenities** (Global amenities)
  - Tên, mô tả, icon
  - Category (Room, Hotel)
- **Gán amenities** cho phòng/khách sạn
- **Quản lý icon amenity**

#### ⭐ Đánh giá & Kiểm duyệt
- **Danh sách đánh giá toàn hệ thống**
  - Lọc theo rating, trạng thái duyệt
- **Ẩn đánh giá** vi phạm chính sách
  - Nội dung khiêm nhã
  - Spam, quảng cáo
  - Thông tin cá nhân
- **Xác nhận đánh giá** hợp pháp
- **Ban người dùng** nếu spam nhiều

#### 🎁 Khuyến mãi toàn cục
- **Tạo mã khuyến mãi** cho toàn hệ thống
  - Áp dụng cho tất cả khách sạn hoặc riêng
  - % giảm / cố định amount
  - Validation: thời gian, giá tối thiểu
- **Quản lý mã**: Deactivate, Delete
- **Analytics**: Mã nào được dùng nhiều nhất

#### 🗑️ Thùng rác (Trash/Recycle Bin)
- **Xem danh sách dữ liệu đã xóa mềm**:
  - Khách sạn, booking, người dùng, etc.
- **Khôi phục** dữ liệu (undo soft delete)
- **Xóa vĩnh viễn** (hard delete)

---

## 📁 Cấu trúc thư mục

```
hotel/frontend/
├── app/                              # 📄 Next.js 14+ App Router
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Homepage
│   ├── (admin)/                      # Admin routes (private)
│   │   ├── admin/
│   │   │   ├── (protected)/          # Protected admin pages
│   │   │   └── ...
│   │   └── login/                    # Admin login page
│   │
│   ├── (auth)/                       # Public auth routes
│   │   ├── layout.tsx
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── ...
│   │
│   ├── (booking)/                    # Booking flow
│   │   ├── booking/
│   │   │   ├── page.tsx              # Booking checkout
│   │   │   ├── detail/               # Booking detail
│   │   │   ├── success/              # Success page
│   │   │   └── failed/               # Failed payment
│   │   └── ...
│   │
│   ├── (main)/                       # Main public routes
│   │   ├── layout.tsx
│   │   ├── home/                     # Homepage
│   │   ├── hotels/                   # Hotels list
│   │   │   ├── page.tsx
│   │   │   └── [id]/                 # Hotel detail
│   │   └── ...
│   │
│   ├── (owner)/                      # Owner management routes
│   │   ├── layout.tsx
│   │   ├── owner-hotel-context.tsx   # Hotel selector context
│   │   ├── owner/
│   │   │   ├── page.tsx              # Owner dashboard
│   │   │   ├── bookings/             # Manage bookings
│   │   │   ├── calendar/             # Pricing calendar
│   │   │   ├── hotel/                # Manage hotels
│   │   │   ├── hotels/               # Hotels list
│   │   │   ├── payments/             # Payment history
│   │   │   ├── promotions/           # Promotions/Coupons
│   │   │   ├── reviews/              # Customer reviews
│   │   │   ├── rooms/                # Room types
│   │   │   ├── messages/             # Chat with customers
│   │   │   └── support/              # Support tickets
│   │   └── ...
│   │
│   └── (user)/                       # User profile routes
│       ├── layout.tsx
│       ├── profile/
│       │   ├── page.tsx              # Profile overview
│       │   ├── booking/              # Booking history
│       │   ├── favorite/             # Favorite hotels
│       │   ├── message/              # Messages
│       │   ├── security/             # Security settings
│       │   └── support/              # Support
│       └── ...
│
├── components/                       # 🧩 Reusable components
│   ├── providers.tsx                 # Auth, Query, Toast providers
│   ├── admin/                        # Admin-specific components
│   │   ├── hotel/                    # Hotel management forms
│   │   ├── user/                     # User management
│   │   └── ...
│   ├── auth/                         # Auth components
│   │   ├── GoogleLoginButton.tsx
│   │   ├── UpgradeToPartnerModal.tsx
│   │   └── ...
│   ├── booking/                      # Booking components
│   │   ├── BookingStatusBadge.tsx
│   │   └── ...
│   ├── chat/                         # Chat/Messaging
│   │   ├── AIChatWidget.tsx
│   │   ├── HotelChatWidget.tsx
│   │   └── ...
│   ├── common/                       # Common layout components
│   │   ├── Header.tsx                # Navigation header
│   │   ├── Footer.tsx                # Footer
│   │   ├── SearchBar.tsx             # Hotel search
│   │   └── ...
│   ├── layout/                       # Layout components
│   │   ├── HotelGallery.tsx
│   │   ├── RoomGalleryModal.tsx
│   │   ├── NotificationBell.tsx
│   │   └── ...
│   ├── providers/                    # Provider wrappers
│   │   ├── AuthProvider.tsx          # Auth context
│   │   └── ...
│   └── ui/                           # shadcn/ui + custom UI
│       ├── button.tsx
│       ├── Pagination.tsx
│       └── ...
│
├── config/                           # ⚙️ Configuration
│   ├── api.config.ts                 # API endpoints
│   └── booking-status.config.ts      # Booking status constants
│
├── hooks/                            # 🎣 Custom React hooks
│   ├── useAmenity.ts                 # Amenities queries
│   ├── useBooking.ts                 # Booking queries & mutations
│   ├── useHotel.ts                   # Hotel queries
│   ├── useLogout.ts                  # Logout handler
│   ├── useNotificationSocket.ts      # WebSocket notifications
│   ├── usePayment.ts                 # Payment queries
│   ├── usePromotion.ts               # Promotion queries
│   ├── useReviews.ts                 # Review queries
│   ├── useStatistic.ts               # Statistics queries
│   └── useUser.ts                    # User queries
│
├── lib/                              # 📚 Utilities & helpers
│   ├── utils.ts                      # Common utilities
│   └── api/                          # API functions
│       ├── axios.ts                  # Axios instance + interceptors
│       ├── amenity.api.ts            # Amenity endpoints
│       ├── auth.api.ts               # Auth endpoints
│       ├── booking.api.ts            # Booking endpoints
│       ├── hotel.api.ts              # Hotel endpoints
│       ├── payment.api.ts            # Payment endpoints
│       ├── promotion.api.ts          # Promo endpoints
│       ├── review.api.ts             # Review endpoints
│       ├── room.api.ts               # Room endpoints
│       ├── user.api.ts               # User endpoints
│       └── ... (more API files)
│
├── public/                           # 🖼️ Static assets
│   ├── fonts/                        # Custom fonts
│   ├── icons/                        # SVG icons
│   └── images/                       # Images & logos
│
├── store/                            # 📦 Zustand state management
│   └── authStore.ts                  # Auth state (token, user, login/logout)
│
├── types/                            # 🏷️ TypeScript types
│   ├── amenity.types.ts
│   ├── auth.types.ts
│   ├── booking.types.ts
│   ├── calendar.types.ts
│   ├── favorite.types.ts
│   ├── notification.types.ts
│   ├── payment.types.ts
│   ├── policy.types.ts
│   ├── promotion.types.ts
│   ├── review.types.ts
│   ├── room.types.ts
│   ├── statistic.types.ts
│   ├── user.types.ts
│   └── ... (more type definitions)
│
├── middleware.ts                     # 🔐 Route protection middleware
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind CSS config
├── package.json                      # Dependencies
└── README.md                         # Project documentation

```

---

## 🚀 Hướng dẫn cài đặt

### 1️⃣ Prerequisites

- **Node.js** 18.x hoặc cao hơn
- **npm** 9.x hoặc **yarn** 4.x
- Git

### 2️⃣ Clone Repository

```bash
git clone https://github.com/nguyenhuynhphuc1210/hotel.git
cd hotel/frontend
```

### 3️⃣ Cài đặt Dependencies

```bash
npm install
# hoặc
yarn install
```

### 4️⃣ Setup Environment Variables

Tạo file `.env.local` tại thư mục gốc:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080

# Google OAuth (lấy từ Google Cloud Console)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# WebSocket (nếu khác với API_URL)
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# NextAuth Secret (tạo bằng: openssl rand -base64 32)
NEXTAUTH_SECRET=your_secret_key_here

# NextAuth URL
NEXTAUTH_URL=http://localhost:3000
```

### 5️⃣ Chạy Development Server

```bash
npm run dev
# hoặc
yarn dev
```

Truy cập **http://localhost:3000**

---

## 🌍 Biến môi trường

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL backend API | ✅ |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | ✅ |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (chat, notifications) | ❌ |
| `NEXTAUTH_SECRET` | Secret key for NextAuth encryption | ✅ |
| `NEXTAUTH_URL` | URL cho NextAuth callbacks | ✅ |

---

## 📜 Scripts & Lệnh

```bash
# Development
npm run dev              # Chạy dev server trên :3000

# Production
npm run build            # Build production-ready app
npm run start            # Chạy production server

# Linting & Quality
npm run lint             # Chạy ESLint check

# Deployment
# Auto-deploy via Vercel on git push
# Hoặc: vercel deploy --prod
```

---

## 🏗️ Kiến trúc hệ thống

### Architecture Overview

```
┌─────────────────────────────────────────┐
│         Browser / Client                │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       Next.js Frontend (App Router)     │
│  ┌────────────────────────────────────┐ │
│  │ Pages & Components (React 19)      │ │
│  │ - (admin), (owner), (user) routes  │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ State Management (Zustand)         │ │
│  │ - Auth state, UI state             │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ Data Fetching (React Query)        │ │
│  │ - Caching, Sync, Background fetch  │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ API Layer (Axios)                  │ │
│  │ - Interceptors, Error handling     │ │
│  └────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │ HTTP/HTTPS
┌──────────────────▼──────────────────────┐
│       Backend API (Spring Boot)         │
│  - REST endpoints                       │
│  - JWT authentication                   │
│  - Business logic                       │
└──────────────────┬──────────────────────┘
                   │ 
┌──────────────────▼──────────────────────┐
│    Database (PostgreSQL/MySQL)          │
└─────────────────────────────────────────┘

    WebSocket / STOMP Connection
┌──────────────────────────────────────┐
│  Real-time Messaging & Notifications  │
│  - Chat (SockJS + STOMP)              │
│  - Live notifications                  │
└──────────────────────────────────────┘
```

### Data Flow

```
User Interaction
      │
      ▼
Component State (React)
      │
      ▼
Zustand Store (if global state)
      │
      ▼
React Query Hook (useQuery/useMutation)
      │
      ▼
API Function (lib/api/*.ts)
      │
      ▼
Axios Instance (lib/api/axios.ts)
   [Interceptors: Add token, error handling]
      │
      ▼
Backend API
      │
      ▼
Database
```

---

## 🔐 Phân quyền & RBAC

### Roles

```typescript
enum Role {
  ROLE_USER = 'ROLE_USER',           // Khách hàng
  ROLE_HOTEL_OWNER = 'ROLE_HOTEL_OWNER',  // Chủ khách sạn
  ROLE_ADMIN = 'ROLE_ADMIN'          // Quản trị viên
}
```

### Route Protection (Middleware)

File: [middleware.ts](middleware.ts)

```typescript
// Admin routes: /admin/* → Requires ROLE_ADMIN
// Owner routes: /owner/* → Requires ROLE_HOTEL_OWNER
// User routes: /profile, /booking → Requires ROLE_USER
// Auth routes: /login, /register, /forgot-password → Public
```

### Middleware Flow

1. ✅ Kiểm tra access_token trong cookies
2. ✅ Decode token → lấy `roleName`
3. ✅ Kiểm tra route protection
4. ✅ Redirect nếu không có quyền:
   - Unauthorized → Redirect `/login`
   - Sai role → Redirect `/admin/login` hoặc `/login`
   - Hợp lệ → Tiếp tục

---

## 🔌 API Integration

### HTTP Client Setup

**File:** [lib/api/axios.ts](lib/api/axios.ts)

```typescript
// Axios instance initialization
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 15000,
})

// Request Interceptor
- Tự động thêm Authorization header (Bearer token)
- Lấy token từ localStorage

// Response Interceptor
- Handle 401 → Clear auth, redirect to login
- Handle errors, format response
```

### API Endpoints Configuration

**File:** [config/api.config.ts](config/api.config.ts)

```typescript
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  ENDPOINTS: {
    // Auth
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    GOOGLE_LOGIN: '/api/auth/google',
    
    // Hotels
    HOTELS: '/api/hotels',
    HOTEL_BY_ID: (id) => `/api/hotels/${id}`,
    HOTELS_SEARCH: '/api/hotels/search',
    
    // Bookings
    BOOKINGS: '/api/bookings',
    BOOKING_BY_ID: (id) => `/api/bookings/${id}`,
    
    // Users
    USERS: '/api/users',
    USER_BY_ID: (id) => `/api/users/${id}`,
    
    // ... more endpoints
  }
}
```

### API Functions Pattern

**Example:** [lib/api/hotel.api.ts](lib/api/hotel.api.ts)

```typescript
export async function getHotels(params?: any) {
  const response = await axiosInstance.get(API_CONFIG.ENDPOINTS.HOTELS, {
    params
  })
  return response.data
}

export async function getHotelById(id: number | string) {
  const response = await axiosInstance.get(
    API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id)
  )
  return response.data
}

export async function updateHotel(id: number, data: any) {
  const response = await axiosInstance.put(
    API_CONFIG.ENDPOINTS.HOTEL_BY_ID(id),
    data
  )
  return response.data
}
```

### Custom Hooks Pattern

**Example:** [hooks/useHotel.ts](hooks/useHotel.ts)

```typescript
// Query hooks (read)
export function useHotels(params?: any) {
  return useQuery({
    queryKey: ['hotels', params],
    queryFn: () => getHotels(params),
  })
}

// Mutation hooks (write)
export function useUpdateHotel() {
  return useMutation({
    mutationFn: ({id, data}: any) => updateHotel(id, data),
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['hotels']})
    }
  })
}
```

---

## 📦 State Management

### Zustand Store

**File:** [store/authStore.ts](store/authStore.ts)

```typescript
export interface AuthState {
  token: string | null
  user: UserResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setAuth: (token: string, user: UserResponse) => void
  setUser: (user: UserResponse | null) => void
  clearAuth: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),
  isLoading: false,
  
  setAuth: (token, user) => set({
    token,
    user,
    isAuthenticated: true,
  }),
  
  clearAuth: () => set({
    token: null,
    user: null,
    isAuthenticated: false,
  }),
  // ...
}))
```

**Usage:**
```typescript
const { user, logout } = useAuthStore()
```

### React Query

**Data Fetching + Caching:**

```typescript
// Automatic caching & invalidation
const { data, isLoading, error } = useHotels()

const mutation = useUpdateHotel()
mutation.mutate({id: 1, data: {...}})
```

---

## 🔒 Authentication Flow

### Login Flow

```
1. User enter email + password
   ▼
2. POST /api/auth/login
   ▼
3. Backend return: { token, user }
   ▼
4. Frontend:
   - Save token to localStorage
   - Save token to cookie (httpOnly nếu server set)
   - Save user to localStorage
   ▼
5. Middleware allow access
   ▼
6. Redirect to dashboard
```

### Google OAuth Flow

```
1. User click "Sign in with Google"
   ▼
2. Google Consent Screen
   ▼
3. User approve permissions
   ▼
4. Get Google ID token
   ▼
5. POST /api/auth/google {idToken}
   ▼
6. Backend verify + return { token, user }
   ▼
7. Frontend store token + user
```

### Token Refresh

```
1. API returns 401 (token expired)
   ▼
2. Response interceptor:
   - Clear token + user
   - Clear cookies
   ▼
3. Redirect to /login
```

---

## ✨ Best Practices

### 📝 Component Structure

```typescript
'use client'  // Mark as client component

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useHotel } from '@/hooks'

export default function HotelCard({ hotelId }) {
  const { data: hotel, isLoading } = useHotel(hotelId)
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <h2>{hotel.name}</h2>
      {/* Component JSX */}
    </div>
  )
}
```

### 🎣 Custom Hooks

```typescript
// hooks/useHotel.ts
export function useHotel(id: number) {
  return useQuery({
    queryKey: ['hotel', id],
    queryFn: () => getHotelById(id),
    staleTime: 1000 * 60 * 5,  // 5 minutes
  })
}
```

### 🔄 Mutations + Invalidation

```typescript
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: updateHotel,
  onSuccess: () => {
    queryClient.invalidateQueries({queryKey: ['hotels']})
    toast.success('Hotel updated!')
  },
  onError: (error) => {
    toast.error(error.message)
  }
})
```

### ⚠️ Error Handling

```typescript
try {
  await axiosInstance.post('/api/bookings', bookingData)
} catch (error: any) {
  if (error.response?.status === 400) {
    // Validation error
    toast.error(error.response.data.message)
  } else if (error.response?.status === 401) {
    // Unauthorized
    logout()
  } else {
    toast.error('Something went wrong')
  }
}
```

### 📱 Responsive Design

```typescript
// Tailwind responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

### ♿ Accessibility

- Use semantic HTML: `<button>`, `<a>`, `<form>`
- Add `aria-label` cho icons
- Color contrast ≥ 4.5:1
- Keyboard navigation support

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables trong Project Settings
4. Auto-deploy on push

**Environment Variables in Vercel:**
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://yourfrontend.vercel.app
```

---

## 📞 Support & Resources

- **Next.js Docs:** https://nextjs.org/docs
- **React Query Docs:** https://tanstack.com/query/latest
- **Zustand Docs:** https://github.com/pmndrs/zustand
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Backend API Docs:** https://hotel-backend-y3hd.onrender.com/swagger-ui.html

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributors

- **Lead Developer:** [Nguyễn Huỳnh Phúc](https://github.com/nguyenhuynhphuc1210)
- **Project:** https://github.com/nguyenhuynhphuc1210/hotel

---

**Last Updated:** June 2026
