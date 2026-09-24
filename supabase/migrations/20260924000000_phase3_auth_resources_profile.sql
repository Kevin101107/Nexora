-- =========================================================================
-- Nexora Phase 3 — Auth Credentials, Project Resources & Student Profiles
-- Supabase / PostgreSQL Schema Definition
-- =========================================================================

-- 1. Extend public.users with academic and portfolio profile fields
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS college TEXT,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS year TEXT,
    ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
    ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'intermediate';

-- 2. Auth Credentials Table
CREATE TABLE IF NOT EXISTS public.auth_credentials (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Project Resources Table
CREATE TABLE IF NOT EXISTS public.project_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other', -- 'github', 'documentation', 'figma', 'deployment', 'other'
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_resources_project_id ON public.project_resources(project_id);
CREATE INDEX IF NOT EXISTS idx_project_resources_created_by ON public.project_resources(created_by);

-- 4. RLS for Resources & Auth Credentials
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;

-- Auth credentials should never be directly selected by clients
DROP POLICY IF EXISTS "Auth credentials private to system" ON public.auth_credentials;
CREATE POLICY "Auth credentials private to system" ON public.auth_credentials
    FOR ALL USING (false);

-- Project Resources viewable if project viewable
DROP POLICY IF EXISTS "Resources viewable if project viewable" ON public.project_resources;
CREATE POLICY "Resources viewable if project viewable" ON public.project_resources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_resources.project_id
            AND (
                projects.visibility = 'public'
                OR projects.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.project_members pm
                    WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
                )
            )
        )
    );

-- Project members & owner can insert resources
DROP POLICY IF EXISTS "Squad members can insert resources" ON public.project_resources;
CREATE POLICY "Squad members can insert resources" ON public.project_resources
    FOR INSERT WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_resources.project_id
            AND (
                projects.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.project_members pm
                    WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
                )
            )
        )
    );

-- Creator or owner can delete resources
DROP POLICY IF EXISTS "Creator or owner can delete resources" ON public.project_resources;
CREATE POLICY "Creator or owner can delete resources" ON public.project_resources
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_resources.project_id
            AND projects.owner_id = auth.uid()
        )
    );
