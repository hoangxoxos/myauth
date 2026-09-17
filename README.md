# MyAuth

MyAuth is a backend authentication and authorization service built with TypeScript, Express 5, and Prisma 7. It supports:

- User registration, login, and refresh tokens
- Email verification
- Password change and password recovery
- Google OAuth
- TOTP / two-factor authentication
- Login session management
- Role-based and permission-based authorization
- Assigning permissions to roles through the `role_permissions` table

## Requirements

Install the following before starting:

- Node.js 20 or later
- npm
- PostgreSQL or Neon PostgreSQL
- The REST Client extension for VS Code if you want to run `test.http`

Check your installed versions:

```bash
node --version
npm --version
```

## Installation

Clone the repository and enter the project directory:

```bash
git clone <repository-url>
cd myauth
```

Install dependencies:

```bash
npm install
```

## Environment Configuration

Create a `.env` file in the project root:

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

`DATABASE_URL`, JWT secrets, refresh-token configuration, SMTP settings, and Google OAuth settings are required by the current environment validation. Even if you are not testing email or Google OAuth, these variables must be defined for the application to start.

Do not commit `.env` or real secrets to Git.

## Database and Prisma

Validate the Prisma schema:

```bash
npx prisma validate
```

### New database or development environment

Create and apply a migration:

```bash
npx prisma migrate dev --name init
```

If the project already contains migrations and the database needs to be updated:

```bash
npx prisma migrate dev
```

Generate the Prisma Client:

```bash
npx prisma generate
```

Seed the database with roles, permissions, and demo users:

```bash
npx prisma db seed
```

The seed creates the following demo data:

| Type           | Value               |
| -------------- | ------------------- |
| Admin email    | `admin@example.com` |
| Admin password | `Admin@123`         |
| User email     | `user@example.com`  |
| User password  | `User@123`          |
| Admin role     | `ADMIN`             |
| User role      | `USER`              |

These credentials are for local development only. Change or remove them before deploying to production.

### Existing database with committed migrations

Apply only committed migrations:

```bash
npx prisma migrate deploy
```

Do not run `prisma migrate reset` against a database containing important data. It deletes the data and recreates the schema.

## Running the Project

Start the development server:

```bash
npm run dev
```

The server runs at:

```text
http://localhost:3000
```

Check that the server is running:

```http
GET http://localhost:3000/
```

## Testing the API with VS Code

Open [test.http](test.http) in VS Code and install the REST Client extension if necessary.

At the top of the file, replace the following placeholders with real values:

```text
@accessToken = paste-access-token-here
@adminAccessToken = paste-admin-access-token-here
@refreshToken = paste-refresh-token-here
@userId = paste-user-id-here
@roleId = paste-role-id-here
@permissionId = paste-permission-id-here
```

Recommended testing flow:

1. Run `npm run dev`.
2. Run the user or admin login request.
3. Copy the `accessToken` from the response.
4. Copy the refresh token from the cookie or response, depending on your client.
5. Use the admin token to call the `/roles` and `/permissions` endpoints.
6. Attach a permission to a role:

```http
POST http://localhost:3000/permissions/roles/{roleId}/{permissionId}
Authorization: Bearer {admin-access-token}
```

7. Call `GET /permissions` to verify that the permission is attached to the role.

Administrative endpoints require the user to have the `ADMIN` role and the required permission.

## API Modules

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

Role create, update, and delete endpoints have not been implemented yet.

### Permission

Base path: `/permissions`

- `GET /permissions`
- `POST /permissions`
- `POST /permissions/roles/:roleId/:permissionId`
- `DELETE /permissions/roles/:roleId/:permissionId`

## Main Project Structure

```text
prisma/
  schema.prisma       # Prisma schema
  migrations/         # Database migrations
  seed.ts             # Demo data
src/
  app.ts              # Express app and middleware
  server.ts           # HTTP server
  index.routes.ts     # Module route registration
  config/             # Environment and Prisma client
  middlewares/        # Authentication, role, permission, and validation middleware
  modules/
    auth/             # Authentication
    user/             # Users and sessions
    role/             # Roles
    permission/       # Permissions and role-permission relations
```

## Checks Before Committing

Run these commands before committing changes:

```bash
npx tsc --noEmit
npx prisma validate
```

If you modify the Prisma schema, also run:

```bash
npx prisma generate
```

## Security Notes

- Use long, randomly generated values for `JWT_ACCESS_SECRET` and `REFRESH_SECRET`.
- Do not use the seeded accounts in production.
- Configure a real SMTP provider for email verification and password recovery.
- Set `FRONTEND_URL` to the actual frontend origin.
- When running multiple production instances, replace the in-memory rate limiter with Redis or another shared store.
- Never commit `.env`, passwords, tokens, or private keys.
