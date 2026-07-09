\# Nexora — Student Productivity Web App



\## Project Summary

Nexora is a web-based student productivity platform with smart notes, focus sessions, AI study bot, and flashcards. Built for students in India.



\## Tech Stack

\- \*\*Frontend:\*\* Next.js 14 (App Router) + Tailwind CSS

\- \*\*Backend:\*\* FastAPI (Python 3.11+)

\- \*\*Database \& Auth:\*\* Supabase (PostgreSQL + Supabase Auth)

\- \*\*AI:\*\* Claude API (claude-sonnet-4-20250514)

\- \*\*Hosting:\*\* Vercel (frontend) + Render (backend)



\## Folder Structure

Nexora/

├── frontend/         # Next.js app

│   ├── app/          # App router pages

│   ├── components/   # Reusable UI components

│   ├── lib/          # Supabase client, utils

│   └── styles/       # Global styles

├── backend/          # FastAPI server

│   ├── routes/       # API route files

│   ├── models/       # Pydantic models

│   ├── db/           # Supabase queries

│   └── ai/           # Claude API integration

└── CLAUDE.md



\## Brand

\- Primary color: #6C63FF (purple)

\- Font: Inter

\- Style: Clean, minimal, student-friendly



\## Database Tables

\- users (id, email, name, avatar\_url, xp, level, streak)

\- notes (id, user\_id, title, content, subject, tags)

\- focus\_sessions (id, user\_id, duration\_mins, subject, started\_at)

\- flashcard\_decks (id, user\_id, title, subject)

\- flashcards (id, deck\_id, front, back, next\_review)

\- ai\_queries (id, user\_id, mode, prompt, response, created\_at)



\## Features (Build in this order)

1\. Auth (login, signup, Google OAuth) ← START HERE

2\. Dashboard (overview, stats, quick actions)

3\. Notes (create, edit, delete, search, subject filter)

4\. Focus Timer (pomodoro, session log, ambient sounds)

5\. AI Study Bot (chat, explain, quiz, summarize)

6\. Flashcards (create, AI generate, spaced repetition)

7\. Gamification (XP, streaks, badges)



\## Environment Variables



\### frontend/.env.local

NEXT\_PUBLIC\_SUPABASE\_URL=

NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=

NEXT\_PUBLIC\_API\_URL=http://localhost:8000



\### backend/.env

SUPABASE\_URL=

SUPABASE\_SERVICE\_KEY=

ANTHROPIC\_API\_KEY=



\## Coding Rules (ALWAYS follow these)

\- No explanations unless asked

\- No comments in code unless asked

\- Keep components small and focused

\- One feature per prompt

\- Use Tailwind only for styling (no separate CSS files)

\- All API calls go through backend (never call Claude API from frontend)

\- Always use async/await

\- Use TypeScript in frontend

\- Use Pydantic models in all FastAPI routes



\## Current Status

\- \[X] Project scaffolded

\- \[X] Auth working

\- \[X] Dashboard UI

\- \[X] Notes module

\- \[X] Focus timer

\- \[X] AI bot

\- \[X] Flashcards

\- \[X] Gamification



\## API Routes Convention

\- GET    /api/notes        → fetch all notes for user

\- POST   /api/notes        → create note

\- PUT    /api/notes/:id    → update note

\- DELETE /api/notes/:id    → delete note

\- POST   /api/ai/chat      → send message to AI bot

\- POST   /api/ai/summarize → summarize a note

\- GET    /api/sessions      → get focus sessions

\- POST   /api/sessions      → log a session



\## Important Notes

\- Free tier only — no paid services until launch

\- Mobile responsive from day one

\- Gemini API as fallback if Claude API credits run out

\- /compact before starting each new feature

\- /clear when switching between major modules

