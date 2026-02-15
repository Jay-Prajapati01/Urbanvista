# 🏘️ UrbanVista — Society Management System

A full-stack web application for managing residential housing societies. UrbanVista provides a comprehensive admin dashboard to manage houses, members, vehicles, maintenance billing, expenditures, and reports — all in one place.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup Guide](#-setup-guide)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Supabase Setup](#2-supabase-setup)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Frontend Setup](#4-frontend-setup)
- [Default Admin Credentials](#-default-admin-credentials)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## ✨ Features

### 🏠 Houses Management
- Add, edit, and delete houses with block, floor, and status tracking
- Occupancy status: **Occupied**, **Vacant**, **Maintenance**
- Auto-computed member and vehicle counts per house
- Block-wise collapsible grouping for easy navigation

### 👥 Members Management
- Register members linked to specific houses
- Roles: **Owner**, **Tenant**, **Family**
- Contact info (phone, email), active/inactive status
- Block-wise collapsible view

### 🚗 Vehicles Management
- Vehicle registry with number, type, and color
- Types: **Two Wheeler**, **Four Wheeler**
- Auto-populated owner name from linked house
- Block-wise collapsible grouping

### 💰 Maintenance Billing
- Create maintenance records with base amount, late fee, extra charges
- Automatic total calculation and status assignment (**Paid**, **Pending**, **Overdue**)
- Owner name auto-populated from houses table
- Block-wise collapsible view with status badges
- **Download Receipt** — generates a beautifully styled, print-ready receipt with full color gradients preserved in PDF

### 📊 Expenditures
- Track society expenses by category (Utilities, Security, Maintenance, Cleaning, Admin, Other)
- Payment modes: Cash, UPI, Bank Transfer, Cheque
- Full CRUD operations

### 📈 Reports & Data Export
- **Data Export**: One-click CSV export for Houses, Members, Maintenance, and Vehicles
- **Pre-built Reports**:
  - *Housewise Maintenance Status* — aggregated billing totals per house
  - *Late Payment List* — overdue and pending payments
  - *Vacant Properties* — all vacant houses
- All data synced with main section pages via shared query cache

### 📋 Dashboard
- At-a-glance metrics: collection rate, pending amount, vacant houses, net balance
- Total houses, members, vehicles, and expenses summary

### 🔐 Authentication
- JWT-based authentication with secure login
- Protected API routes with middleware
- Persistent sessions (survives page refresh)
- Demo mode support

### 🌙 UI/UX
- Dark/Light theme toggle
- Responsive design (mobile-friendly)
- Glassmorphism card styles
- Smooth animations and transitions
- Toast notifications (Sonner)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Pre-built accessible components (Radix UI primitives) |
| **TanStack React Query** | Server state management & caching |
| **React Router v6** | Client-side routing |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |
| **Recharts** | Chart/analytics components |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime |
| **Express.js** | REST API framework |
| **Supabase** | PostgreSQL database (hosted) |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **dotenv** | Environment variable management |

---

## 📁 Project Structure

```
UrbanVista/
├── Backend/
│   ├── server.js                  # Express app entry point
│   ├── package.json
│   ├── database/
│   │   └── schema.sql             # Full database schema + seed data
│   └── src/
│       ├── config/
│       │   └── supabase.js        # Supabase client initialization
│       ├── middleware/
│       │   └── auth.js            # JWT authentication middleware
│       ├── routes/
│       │   ├── auth.js            # Login & token verification
│       │   ├── dashboard.js       # Aggregated dashboard metrics
│       │   ├── houses.js          # Houses CRUD
│       │   ├── members.js         # Members CRUD
│       │   ├── vehicles.js        # Vehicles CRUD
│       │   ├── maintenance.js     # Maintenance records CRUD
│       │   ├── expenditures.js    # Expenditures CRUD
│       │   └── reports.js         # Report data endpoints
│       └── utils/
│           └── transform.js       # snake_case ↔ camelCase converters
│
├── Frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   └── robots.txt
│   └── src/
│       ├── App.tsx                # Root component with routing
│       ├── main.tsx               # React entry point
│       ├── index.css              # Global styles & Tailwind config
│       ├── components/
│       │   ├── NavLink.tsx
│       │   ├── admin/
│       │   │   └── AdminLayout.tsx    # Sidebar + layout wrapper
│       │   ├── landing/
│       │   │   ├── Header.tsx
│       │   │   ├── Hero.tsx
│       │   │   ├── Features.tsx
│       │   │   ├── CTA.tsx
│       │   │   └── Footer.tsx
│       │   └── ui/                    # shadcn/ui components (40+)
│       ├── hooks/
│       │   ├── use-mobile.tsx
│       │   └── use-toast.ts
│       ├── lib/
│       │   ├── api.ts             # API client (fetch wrapper + all endpoints)
│       │   ├── auth.tsx           # AuthProvider context (JWT + isLoading)
│       │   ├── csv.ts             # CSV export utility
│       │   ├── receipt.ts         # Styled receipt PDF generator
│       │   ├── data.ts            # TypeScript interfaces
│       │   ├── theme.tsx          # Dark/Light theme provider
│       │   └── utils.ts           # cn() classname merge helper
│       └── pages/
│           ├── Index.tsx          # Landing page
│           ├── AdminLogin.tsx     # Login page
│           ├── NotFound.tsx       # 404 page
│           └── admin/
│               ├── Dashboard.tsx
│               ├── Houses.tsx
│               ├── Members.tsx
│               ├── Vehicles.tsx
│               ├── Maintenance.tsx
│               ├── Expenditures.tsx
│               ├── Reports.tsx
│               └── Settings.tsx
│
└── README.md
```

---

## ⚙️ Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **Bun** — [Download Bun](https://bun.sh/)
- A **Supabase** account — [Sign up free](https://supabase.com/)

---

## 🚀 Setup Guide

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/UrbanVista.git
cd UrbanVista
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com/) and create a new project
2. Once the project is created, go to **SQL Editor**
3. Copy the contents of `Backend/database/schema.sql` and run it in the SQL Editor
4. This creates all required tables (`admin_users`, `houses`, `members`, `vehicles`, `maintenance_records`, `expenditures`) with Row Level Security policies
5. Go to **Settings → API** and note down:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")

### 3. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend/` directory:

```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
JWT_SECRET=your-secret-key-here
```

> **Tip:** Generate a strong JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Start the backend server:

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The backend runs at `http://localhost:5000`.

### 4. Frontend Setup

```bash
cd Frontend
npm install
```

*(Optional)* Create a `.env` file in the `Frontend/` directory if your backend runs on a different port:

```env
VITE_API_URL=http://localhost:5000/api
```

> By default, the frontend connects to `http://localhost:5000/api`.

Start the frontend dev server:

```bash
npm run dev
```

The frontend runs at `http://localhost:8080`.

### Build for Production

```bash
cd Frontend
npm run build
```

The production build is output to `Frontend/dist/`.

---

## 🔑 Default Admin Credentials

| Field | Value |
|---|---|
| **Email** | `admin@urbanvista.com` |
| **Password** | `admin123` |

> ⚠️ Change the default password after first login in a production environment.

---

## 📡 API Endpoints

All protected endpoints require a `Bearer` token in the `Authorization` header.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Admin login |
| `POST` | `/api/auth/verify` | Verify JWT token |

### Houses
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/houses` | List all houses (with member/vehicle counts) |
| `GET` | `/api/houses/:id` | Get single house |
| `POST` | `/api/houses` | Create a house |
| `PUT` | `/api/houses/:id` | Update a house |
| `DELETE` | `/api/houses/:id` | Delete a house |

### Members
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/members` | List all members |
| `POST` | `/api/members` | Create a member |
| `PUT` | `/api/members/:id` | Update a member |
| `DELETE` | `/api/members/:id` | Delete a member |

### Vehicles
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/vehicles` | List all vehicles (with owner names) |
| `POST` | `/api/vehicles` | Create a vehicle |
| `PUT` | `/api/vehicles/:id` | Update a vehicle |
| `DELETE` | `/api/vehicles/:id` | Delete a vehicle |

### Maintenance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/maintenance` | List all records (with owner names) |
| `POST` | `/api/maintenance` | Create a record (auto-populates owner) |
| `PUT` | `/api/maintenance/:id` | Update a record |
| `DELETE` | `/api/maintenance/:id` | Delete a record |

### Expenditures
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/expenditures` | List all expenditures |
| `POST` | `/api/expenditures` | Create an expenditure |
| `PUT` | `/api/expenditures/:id` | Update an expenditure |
| `DELETE` | `/api/expenditures/:id` | Delete an expenditure |

### Dashboard & Reports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated metrics |
| `GET` | `/api/reports/summary` | Full data summary (all tables) |
| `GET` | `/api/reports/housewise-maintenance` | Maintenance grouped by house |
| `GET` | `/api/reports/late-payments` | Overdue & pending records |
| `GET` | `/api/reports/vacant-properties` | Vacant houses |

### Health Check
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server status (no auth required) |

---

## 🗃️ Database Schema

| Table | Description |
|---|---|
| `admin_users` | Admin login credentials (bcrypt hashed passwords) |
| `houses` | House/flat registry with block, floor, status, owner info |
| `members` | Residents linked to houses (Owner/Tenant/Family) |
| `vehicles` | Vehicles linked to houses (Two Wheeler/Four Wheeler) |
| `maintenance_records` | Monthly billing with amounts, payment status, method |
| `expenditures` | Society expenses categorized and tracked |

All tables have:
- UUID primary keys (auto-generated)
- `created_at` / `updated_at` timestamps
- Row Level Security enabled

---

## 📸 Screenshots

> Add your screenshots here after deployment.



---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is developed as part of a **6th Semester SGP (Subject Group Project)**.

---

<p align="center">
  Built with ❤️ by the UrbanVista Team
</p>
