-- =========================================================================
-- Nexora Supabase Schema Initialization
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Create public.users table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    streak INTEGER DEFAULT 0 NOT NULL,
    badges TEXT[] DEFAULT '{}'::text[] NOT NULL,
    favourite_subjects TEXT[] DEFAULT '{}'::text[] NOT NULL,
    daily_goal_minutes INTEGER DEFAULT 60 NOT NULL,
    last_active DATE,
    flashcards_reviewed INTEGER DEFAULT 0 NOT NULL
);

-- Ensure column exists if table was already created
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS flashcards_reviewed INTEGER DEFAULT 0 NOT NULL;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.users;
CREATE POLICY "Allow public read access to profiles" ON public.users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;
CREATE POLICY "Allow users to update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);


-- 2. Create handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url, xp, level, streak, badges, favourite_subjects, daily_goal_minutes, flashcards_reviewed)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name'),
        new.raw_user_meta_data->>'avatar_url',
        0, 1, 0, '{}'::text[], '{}'::text[], 60, 0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Backfill existing auth users into public.users
INSERT INTO public.users (id, email, display_name, avatar_url, xp, level, streak, badges, favourite_subjects, daily_goal_minutes, flashcards_reviewed)
SELECT 
    id, 
    email, 
    coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'name'),
    raw_user_meta_data->>'avatar_url',
    0, 1, 0, '{}'::text[], '{}'::text[], 60, 0
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- 4. Create public.notes table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT,
    tags TEXT[] DEFAULT '{}'::text[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
CREATE POLICY "Users can manage their own notes" ON public.notes
    FOR ALL USING (auth.uid() = user_id);


-- 5. Create public.focus_sessions table
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    mode TEXT NOT NULL,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column exists if table was already created
ALTER TABLE public.focus_sessions ADD COLUMN IF NOT EXISTS subject TEXT;

-- Enable RLS on focus_sessions
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage their own focus sessions" ON public.focus_sessions
    FOR ALL USING (auth.uid() = user_id);


-- 6. Create public.flashcard_decks table
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on flashcard_decks
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own decks" ON public.flashcard_decks;
CREATE POLICY "Users can manage their own decks" ON public.flashcard_decks
    FOR ALL USING (auth.uid() = user_id);


-- 7. Create public.flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    ease_factor DOUBLE PRECISION DEFAULT 2.5 NOT NULL,
    interval_days INTEGER DEFAULT 1 NOT NULL,
    next_review TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage flashcards inside their own decks" ON public.flashcards;
CREATE POLICY "Users can manage flashcards inside their own decks" ON public.flashcards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = flashcards.deck_id AND user_id = auth.uid()
        )
    );
