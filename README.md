# UniHostel

Full-stack hostel management: React (Vite) frontend + Node (Express) + MongoDB backend.

## Prerequisites

- Node.js 18+
- MongoDB Atlas (connection string is configured by default)

## Environment

**Backend** – optional `backend/.env` (app defaults to MongoDB Atlas):

```
PORT=5001
MONGODB_URI=mongodb+srv://hosteladmin:1234@cluster0.ykd60i8.mongodb.net/unihostel
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**Frontend** – optional. Create `frontend/.env` to override API URL:

```
VITE_API_URL=http://localhost:5001/api
```

## Setup & run

The frontend proxies `/api` to **`http://localhost:5001`**. If only the frontend is running, you may see **`http proxy error`** / **`ECONNREFUSED`** until the backend is up.

### Option A – Backend + frontend together (recommended)

From the **project root** (`ITPM-Project-HostelManagement`):

```bash
npm install
npm run dev
```

Starts the API on **5001** and Vite on **3000**.

### Option B – Two terminals

**1. Backend**

```bash
cd backend
npm install
npm run seed    # creates admin@unihostel.com / admin123 and student@unihostel.com / student123
npm run dev     # or npm start
```

Server: `http://localhost:5001`.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev     # or npm start
```

App: `http://localhost:3000` (see `frontend/vite.config.js`).

## Test logins (after seed)

| Role    | Email                 | Password   |
|---------|-----------------------|------------|
| Admin   | admin@unihostel.com   | admin123   |
| Student | student@unihostel.com | student123 |

Students can also **sign up** at `/signup`; no seed needed for new accounts.

**Wardens** use **`/warden/login`** (Sign in / Register tabs) and land on **`/warden`** after success.

## API overview

| Path | Auth | Description |
|------|------|-------------|
| POST /api/auth/student-signup | No | Student registration |
| POST /api/auth/student-login | No | Student login |
| POST /api/auth/admin-login | No | Admin login |
| POST /api/auth/warden-signup | No | Warden registration |
| POST /api/auth/warden-login | No | Warden login |
| /api/users | Admin | CRUD users |
| /api/hostels | Yes | List/create hostels |
| /api/bookings | Yes | Bookings |
| POST /api/payments | Student | Create payment (multipart `proof`) |
| GET /api/payments/my | Student | Own payments |
| GET /api/payments/admin | Admin | All payments |
| GET /api/payments/:id | Student/Admin | One payment (own or admin) |
| PATCH /api/payments/:id/status | Admin | Update status |
| POST /api/latepass | Student | Create late pass (multipart `document`) |
| GET /api/latepass/my | Student | Own / included late passes |
| GET /api/latepass/admin | Admin | All late passes |
| GET /api/latepass/:id | Student/Admin | One late pass |
| PATCH /api/latepass/:id/status | Admin | Update status |
| /api/inquiries | Yes | Inquiries |
| /api/complains | Yes | Complaints |
| /api/inventory | Admin | Inventory |
| /api/maintenance | Yes | Maintenance |

Send JWT in header: `Authorization: Bearer <token>`.
