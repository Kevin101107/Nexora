# Nexora — Find the right people to build with 🚀

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)

**Nexora** is a web-first, mobile-ready student teammate-discovery and project-collaboration platform. It helps student developers, designers, and creators connect with compatible partners, recruit contributors for side projects, and form multidisciplinary squads for hackathons.

---

## 🌟 Key Value Pillars

### 🔍 Teammate Discovery
- **Builder Search**: Search students by technical stack (React, FastAPI, Go, PyTorch, Figma, etc.), preferred role, and university.
- **Explainable Compatibility**: Match Score V1 provides deterministic, transparent compatibility scoring based on skill complementarity and shared hackathon goals—no black-box promises.

### 📁 Project Recruitment
- **Post Opportunities**: Create project listings with project tags, descriptions, team size limits, and needed roles.
- **Join Applications**: Apply to open roles with custom introductory messages and track application status.

### ⚡ Hackathon Squad Formation
- **Balanced Teams**: Assemble well-rounded teams (Frontend, Backend, Systems, UI/UX, AI/ML) before hackathon deadlines.
- **Roster Management**: Manage confirmed teammates, active spots, and pending invitations.

### 👤 Builder Profiles
- **Structured Showcase**: Display verified tech stacks, portfolio links, GitHub profiles, and availability status ("Open to teams", "Looking for hackathon squad", "Busy").

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router, React 18)
- **Styling**: Tailwind CSS, Lucide Icons, Custom Glassmorphism Tokens
- **Auth & Sessions**: `@supabase/ssr`, `@supabase/supabase-js`, Next.js Middleware
- **Theme**: Dark Mode & Light Mode with persistent preference

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Server**: Uvicorn
- **Validation**: Pydantic v2 & `pydantic-settings`
- **Database Client**: Supabase Python SDK

### Database & Auth
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth (Email/Password, Google OAuth, PKCE session exchange)

---

## 📁 Repository Structure

```text
Nexora/
├── frontend/                   # Next.js App Router Frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Public marketing landing page
│   │   │   ├── (auth)/         # Auth pages (login, signup)
│   │   │   ├── auth/callback/  # PKCE OAuth / OTP callback handler
│   │   │   ├── dashboard/      # Collaboration dashboard shell
│   │   │   ├── discover/       # Teammate discovery and skill search
│   │   │   ├── projects/       # Project exploration and recruitment
│   │   │   ├── teams/          # Team formation and roster management
│   │   │   ├── requests/       # Applications and connection requests
│   │   │   └── profile/        # Authenticated builder profile
│   │   ├── components/         # Reusable UI components (Sidebar, AppShell, Toast, DarkModeToggle)
│   │   ├── lib/                # Supabase browser/server clients & API utilities
│   │   ├── middleware.ts       # Next.js session refresh and route guard
│   │   └── styles/             # Global CSS and custom styles
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                    # FastAPI Backend API Server
│   ├── app/
│   │   ├── api/routes/         # API endpoints (auth, users)
│   │   ├── core/               # Auth verification, Supabase client, configuration
│   │   └── models/             # Pydantic request/response schemas (user)
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Container deployment config
│
├── .gitignore                  # Comprehensive root gitignore
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Python**: v3.11 or higher
- **Supabase Account**: A Supabase project with PostgreSQL and Auth enabled

---

### 1. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory based on `.env.example`:
   ```env
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   FRONTEND_URL=http://localhost:3000
   ```
5. Start the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend will be running at `http://localhost:8000`. API docs are available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

---

## 📡 API Endpoints Overview (Phase 1)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/health` | API health check |
| **POST** | `/api/auth/verify-token` | Verify Supabase JWT token |
| **GET** | `/api/users/me` | Fetch authenticated user builder profile |
| **PUT** | `/api/users/me` | Update builder profile details (display name, headline) |

---

## 🗓️ Product Roadmap

- **Phase 1 (Complete)**: Product pivot to teammate-discovery & project-collaboration platform. Obsolete productivity modules removed; clean navigation, public marketing page, auth screens, collaboration dashboard, and responsive placeholder pages introduced.
- **Phase 2 (Upcoming)**: Database schema migration (projects, project_members, project_applications, teammate_requests), structured builder profile editor with verified skills, and project creation flow.
- **Phase 3**: Explainable Match Score V1 engine, notifications, and real-time request accept/decline workflows.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
