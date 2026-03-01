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

### 1. Backend

```bash
cd backend
npm install
npm run seed    # creates admin@unihostel.com / admin123 and student@unihostel.com / student123
npm run dev     # or npm start
```

Server runs at `http://localhost:5001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev     # or npm start
```

App runs at `http://localhost:5173`.

## Test logins (after seed)

| Role    | Email                 | Password   |
|---------|-----------------------|------------|
| Admin   | admin@unihostel.com   | admin123   |
| Student | student@unihostel.com | student123 |

Students can also **sign up** at `/signup`; no seed needed for new accounts.

## API overview

| Path | Auth | Description |
|------|------|-------------|
| POST /api/auth/student-signup | No | Student registration |
| POST /api/auth/student-login | No | Student login |
| POST /api/auth/admin-login | No | Admin login |
| /api/users | Admin | CRUD users |
| /api/hostels | Yes | List/create hostels |
| /api/bookings | Yes | Bookings |
| /api/payments | Yes | Payments |
| /api/inquiries | Yes | Inquiries |
| /api/latepass | Yes | Late passes |
| /api/complains | Yes | Complaints |
| /api/inventory | Admin | Inventory |
| /api/maintenance | Yes | Maintenance |

Send JWT in header: `Authorization: Bearer <token>`.
