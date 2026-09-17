# MyAuth

MyAuth là backend authentication và authorization viết bằng TypeScript, Express 5 và Prisma 7. Project hỗ trợ:

- Đăng ký, đăng nhập và refresh token
- Xác thực email
- Đổi mật khẩu và khôi phục mật khẩu
- OAuth với Google
- Xác thực hai lớp TOTP/2FA
- Quản lý phiên đăng nhập
- Phân quyền theo role và permission
- Gán permission cho role thông qua bảng `role_permissions`

## Yêu cầu

Cần cài đặt:

- Node.js 20 trở lên
- npm
- PostgreSQL hoặc Neon PostgreSQL
- REST Client extension trong VS Code nếu muốn chạy file `test.http`

Kiểm tra phiên bản:

```bash
node --version
npm --version
```

## Cài đặt

Clone repository và đi vào thư mục project:

```bash
git clone <repository-url>
cd myauth
```

Cài dependencies:

```bash
npm install
```

## Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc của project:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/myauth?schema=public"

PORT=3000
NODE_ENV=development

JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_ACCESS_EXPIRES_IN="15m"
REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
REFRESH_EXPIRES_IN="7d"

SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
EMAIL_FROM="MyAuth <no-reply@example.com>"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"

FRONTEND_URL="http://localhost:3000"
```

`DATABASE_URL`, JWT, refresh token, SMTP và Google OAuth là các biến bắt buộc theo cấu hình hiện tại. Nếu chỉ thử các API không gửi email hoặc không dùng Google OAuth, vẫn cần khai báo chúng để ứng dụng khởi động thành công.

Không commit file `.env` hoặc đưa secret thật lên Git.

## Database và Prisma

Kiểm tra schema Prisma:

```bash
npx prisma validate
```

### Database mới hoặc môi trường development

Tạo và chạy migration:

```bash
npx prisma migrate dev --name init
```

Nếu project đã có migration và database cần được cập nhật:

```bash
npx prisma migrate dev
```

Generate Prisma Client:

```bash
npx prisma generate
```

Chạy seed để tạo role, permission và user demo:

```bash
npx prisma db seed
```

Seed hiện tạo:

| Loại           | Giá trị             |
| -------------- | ------------------- |
| Admin email    | `admin@example.com` |
| Admin password | `Admin@123`         |
| User email     | `user@example.com`  |
| User password  | `User@123`          |
| Admin role     | `ADMIN`             |
| User role      | `USER`              |

Đây là thông tin demo cho môi trường local. Hãy đổi hoặc xóa các tài khoản này trước khi deploy production.

### Môi trường đã có migration

Dùng lệnh sau để chỉ áp dụng migration đã commit:

```bash
npx prisma migrate deploy
```

Không chạy `migrate reset` trên database có dữ liệu quan trọng vì lệnh này sẽ xóa dữ liệu và tạo lại schema.

## Chạy project

Chạy server ở development mode:

```bash
npm run dev
```

Server mặc định chạy tại:

```text
http://localhost:3000
```

Kiểm tra server:

```http
GET http://localhost:3000/
```

## Test API bằng VS Code

Mở file [test.http](test.http) bằng VS Code và cài extension REST Client nếu chưa có.

Ở phần đầu file, thay các placeholder sau bằng giá trị thật:

```text
@accessToken = paste-access-token-here
@adminAccessToken = paste-admin-access-token-here
@refreshToken = paste-refresh-token-here
@userId = paste-user-id-here
@roleId = paste-role-id-here
@permissionId = paste-permission-id-here
```

Quy trình test đề xuất:

1. Chạy `npm run dev`.
2. Chạy request login user hoặc admin.
3. Lấy `accessToken` từ response.
4. Lấy refresh token từ cookie hoặc response tùy client.
5. Dùng admin token để gọi các API `/roles` và `/permissions`.
6. Gọi attach permission:

```http
POST http://localhost:3000/permissions/roles/{roleId}/{permissionId}
Authorization: Bearer {admin-access-token}
```

7. Gọi `GET /permissions` để kiểm tra permission đã được gắn vào role.

Các endpoint quản trị yêu cầu user có role `ADMIN` và permission tương ứng.

## Các module API

### Auth

Base path: `/auth`

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/email/send-verification`
- `GET /auth/email/verify`
- `POST /auth/password/forgot`
- `GET /auth/password/reset`
- `POST /auth/password/reset`
- `PUT /auth/password/change`
- `POST /auth/2fa/setup`
- `POST /auth/2fa/enable`
- `POST /auth/2fa/disable`
- `GET /auth/google`
- `GET /auth/google/callback`

### User

Base path: `/users`

- `GET /users/me`
- `PUT /users/me`
- `PUT /users/me/email`
- `DELETE /users/me`
- `GET /users/me/sessions`
- `DELETE /users/me/sessions/:sessionId`
- `DELETE /users/sessions`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`

### Role

Base path: `/roles`

- `GET /roles`

Các API tạo, sửa, xóa role hiện chưa được triển khai.

### Permission

Base path: `/permissions`

- `GET /permissions`
- `POST /permissions`
- `POST /permissions/roles/:roleId/:permissionId`
- `DELETE /permissions/roles/:roleId/:permissionId`

## Cấu trúc thư mục chính

```text
prisma/
  schema.prisma       # Prisma schema
  migrations/         # Database migrations
  seed.ts             # Dữ liệu mẫu
src/
  app.ts              # Express app và middleware
  server.ts           # HTTP server
  index.routes.ts     # Đăng ký các module route
  config/             # Environment và Prisma client
  middlewares/        # Auth, role, permission, validation
  modules/
    auth/             # Authentication
    user/             # User và session
    role/             # Role
    permission/       # Permission và role-permission
```

## Kiểm tra trước khi commit

Chạy các lệnh sau:

```bash
npx tsc --noEmit
npx prisma validate
```

Nếu sửa schema Prisma, chạy thêm:

```bash
npx prisma generate
```

## Một số lưu ý bảo mật

- Dùng secret ngẫu nhiên, dài cho `JWT_ACCESS_SECRET` và `REFRESH_SECRET`.
- Không dùng tài khoản seed trong production.
- Cấu hình SMTP thật nếu cần email verification hoặc password reset.
- Cấu hình `FRONTEND_URL` đúng với frontend thực tế.
- Với production nhiều instance, thay rate limiter trong memory bằng Redis hoặc một store dùng chung.
- Không commit `.env`, password, token hoặc private key.
