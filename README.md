# Nexora — Student Productivity Platform 🚀

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)

**Nexora** is an all-in-one AI-powered student productivity web application designed to help students organize notes, track focus sessions, generate flashcards, chat with an AI study tutor, and build daily learning habits through gamification.

---

## 🌟 Key Features

### 📝 Smart Notes
- **Rich Text Editor**: Powered by TipTap for intuitive formatting, headings, bullet points, and code blocks.
- **Organization & Search**: Tag notes by subjects (`Math`, `Physics`, `Computer Science`, etc.) and search across all content seamlessly.
- **AI Note Summarization**: One-click AI summarization to extract key concepts instantly.

### ⏱️ Focus Sessions & Pomodoro
- **Custom Timer**: Configurable focus sessions (25-min Pomodoro, custom countdowns) with live audio/visual cues.
- **Session Tracking**: Logs study duration per subject and calculates progress toward daily focus goals.

### 🤖 AI Study Tutor
- **Interactive Chat**: Ask questions, request explanations, get step-by-step solutions, or generate study quizzes using Claude API.
- **Streaming Responses**: Real-time Server-Sent Events (SSE) streaming for fast, interactive AI responses.

### 🃏 Flashcards & Spaced Repetition
- **Deck Management**: Create custom decks or generate flashcard decks automatically using AI from study material.
- **Spaced Repetition Engine**: Built-in SuperMemo-2 (SM-2) algorithm to optimize review intervals based on answer confidence.

### 🎮 Gamification & Streaks
- **XP & Levels**: Earn XP for taking notes, reviewing flashcards, and completing focus sessions.
- **Daily Streaks**: Automatic daily activity tracking with streak calculation.
- **Achievement Badges**: Unlock badges such as *First Note*, *7-Day Streak*, *Level 5*, *60-Min Focus*, and *Flashcard Master*.

### 🌓 Modern UI & Personalization
- **Theme Support**: Complete Light Mode & Dark Mode with modern glassmorphism aesthetics.
- **Profile & Settings**: Set target daily focus minutes, display name, and favorite subjects.

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router, React 18)
- **Styling**: Tailwind CSS, Lucide Icons, Custom Design Tokens
- **Editor**: TipTap (`@tiptap/react`, `@tiptap/starter-kit`)
- **Authentication & Database Client**: `@supabase/ssr`, `@supabase/supabase-js`

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Server**: Uvicorn
- **AI Integration**: Anthropic Claude SDK (`anthropic`)
- **Database Client**: Supabase Python SDK (`supabase`)
- **Validation**: Pydantic v2 & `pydantic-settings`

### Database & Auth
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth (Email/Password, OAuth, JWT verification)

---

## 📁 Repository Structure

```text
Nexora/
├── frontend/                   # Next.js App Router Frontend
│   ├── src/
│   │   ├── app/                # Page routes (dashboard, notes, focus, ai, flashcards, profile)
│   │   ├── components/         # Reusable UI components (Sidebar, AppShell, Toast, Editor)
│   │   ├── lib/                # Supabase client & API client utilities
│   │   └── styles/             # Global CSS and custom styles
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                    # FastAPI Backend API Server
│   ├── app/
│   │   ├── api/routes/         # API endpoints (auth, notes, focus, ai, flashcards, users)
│   │   ├── core/               # Auth verification, Supabase client, configuration
│   │   ├── models/             # Pydantic request/response schemas
│   │   └── services/           # Business logic & AI prompt handlers
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile.txt
│
├── supabase_schema.sql         # Database schema, triggers & RLS policies
├── render.yaml                 # Deployment config for Render
└── Dockerfile                  # Container build config
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher
- **Supabase Account**: A free Supabase project
- **Anthropic API Key**: For AI Tutor features (Claude API)

---

### 1. Database Setup (Supabase)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and open the **SQL Editor**.
2. Copy the contents of [`supabase_schema.sql`](file:///d:/Projects/Nexora/supabase_schema.sql) and execute the SQL script.
3. This creates all necessary tables (`users`, `notes`, `focus_sessions`, `flashcard_decks`, `flashcards`), indices, RLS policies, and user creation triggers.

---

### 2. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory:
   ```env
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   FRONTEND_URL=http://localhost:3000
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend will be running at `http://localhost:8000`. API docs are available at `http://localhost:8000/docs`.

---

### 3. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node.js dependencies:
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

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/users/me` | Fetch user profile, XP, streak & badges |
| **PUT** | `/api/users/me` | Update display name, goal minutes, and favorite subjects |
| **GET** | `/api/notes` | Get all notes for authenticated user |
| **POST** | `/api/notes` | Create a new note |
| **PUT** | `/api/notes/{id}` | Update an existing note |
| **DELETE** | `/api/notes/{id}` | Delete a note |
| **POST** | `/api/focus/sessions` | Log completed focus session |
| **GET** | `/api/focus/sessions` | Fetch user focus history |
| **POST** | `/api/ai/chat` | Send message to AI Tutor (supports streaming) |
| **POST** | `/api/ai/summarize` | Generate note summary |
| **GET** | `/api/flashcards/decks` | List flashcard decks |
| **POST** | `/api/flashcards/decks` | Create a new deck |

---

## ☁️ Deployment

- **Frontend**: Easily deployed on **Vercel** by setting environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`).
- **Backend**: Pre-configured for **Render** via `render.yaml` or any Docker container hosting platform using `Dockerfile`.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
