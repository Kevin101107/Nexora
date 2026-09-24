-- =========================================================================
-- Nexora Phase 2 — Data & Collaboration Core Migration
-- Supabase / PostgreSQL Schema Definition
-- =========================================================================

-- 1. Base users table if not exists (for clean standalone Postgres / Supabase compatibility)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Extend public.users with builder-profile fields
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS headline TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
    ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}'::text[] NOT NULL,
    ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'::text[] NOT NULL,
    ADD COLUMN IF NOT EXISTS github_url TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
    ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'open' NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Backfill usernames for existing records where username is null
UPDATE public.users
SET username = lower(regexp_replace(coalesce(nullif(display_name, ''), split_part(email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g'))
WHERE username IS NULL;

-- If any username is empty string after regex, fallback to user id prefix
UPDATE public.users
SET username = 'builder_' || substr(id::text, 1, 8)
WHERE username IS NULL OR username = '';

-- Ensure updated_at trigger for public.users
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'side_project', -- 'hackathon', 'side_project', 'research', 'startup'
    status TEXT NOT NULL DEFAULT 'recruiting',    -- 'recruiting', 'active', 'completed', 'archived'
    visibility TEXT NOT NULL DEFAULT 'public',    -- 'public', 'private'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3. Project Roles Table
CREATE TABLE IF NOT EXISTS public.project_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[] DEFAULT '{}'::text[] NOT NULL,
    slots INTEGER NOT NULL DEFAULT 1 CHECK (slots > 0),
    filled_slots INTEGER NOT NULL DEFAULT 0 CHECK (filled_slots >= 0 AND filled_slots <= slots),
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'filled', 'closed'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 4. Project Members Table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
    member_role TEXT NOT NULL DEFAULT 'Member', -- 'Owner', 'Lead', 'Member'
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);


-- 5. Project Applications Table
CREATE TABLE IF NOT EXISTS public.project_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
    applicant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'withdrawn'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_project_apps_updated_at ON public.project_applications;
CREATE TRIGGER trg_project_apps_updated_at
    BEFORE UPDATE ON public.project_applications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent duplicate active applications from the same user to the same role/project
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_project_application
    ON public.project_applications (project_id, applicant_id, coalesce(role_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE status = 'pending';


-- 6. Teammate Requests Table
CREATE TABLE IF NOT EXISTS public.teammate_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_no_self_request CHECK (sender_id <> receiver_id)
);

DROP TRIGGER IF EXISTS trg_teammate_reqs_updated_at ON public.teammate_requests;
CREATE TRIGGER trg_teammate_reqs_updated_at
    BEFORE UPDATE ON public.teammate_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent duplicate pending connection requests between same pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_teammate_request
    ON public.teammate_requests (sender_id, receiver_id)
    WHERE status = 'pending';


-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_project_roles_project_id ON public.project_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_apps_project_id ON public.project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_apps_applicant_id ON public.project_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_project_apps_status ON public.project_applications(status);
CREATE INDEX IF NOT EXISTS idx_teammate_requests_sender_id ON public.teammate_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_teammate_requests_receiver_id ON public.teammate_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_teammate_requests_status ON public.teammate_requests(status);


-- 8. Row Level Security (RLS)

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teammate_requests ENABLE ROW LEVEL SECURITY;

-- 8.1 Projects Policies
DROP POLICY IF EXISTS "Projects are viewable by everyone if public, or by owner/members" ON public.projects;
CREATE POLICY "Projects are viewable by everyone if public, or by owner/members" ON public.projects
    FOR SELECT USING (
        visibility = 'public'
        OR owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = projects.id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Project owners can update their projects" ON public.projects;
CREATE POLICY "Project owners can update their projects" ON public.projects
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Project owners can delete their projects" ON public.projects;
CREATE POLICY "Project owners can delete their projects" ON public.projects
    FOR DELETE USING (auth.uid() = owner_id);


-- 8.2 Project Roles Policies
DROP POLICY IF EXISTS "Roles viewable if parent project viewable" ON public.project_roles;
CREATE POLICY "Roles viewable if parent project viewable" ON public.project_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_roles.project_id
            AND (
                projects.visibility = 'public'
                OR projects.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.project_members
                    WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Project owners can insert roles" ON public.project_roles;
CREATE POLICY "Project owners can insert roles" ON public.project_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_roles.project_id AND projects.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project owners can update roles" ON public.project_roles;
CREATE POLICY "Project owners can update roles" ON public.project_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_roles.project_id AND projects.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Project owners can delete roles" ON public.project_roles;
CREATE POLICY "Project owners can delete roles" ON public.project_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_roles.project_id AND projects.owner_id = auth.uid()
        )
    );


-- 8.3 Project Members Policies
DROP POLICY IF EXISTS "Members viewable if project viewable" ON public.project_members;
CREATE POLICY "Members viewable if project viewable" ON public.project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id
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

DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
CREATE POLICY "Project owners can manage members" ON public.project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_members.project_id AND projects.owner_id = auth.uid()
        )
    );


-- 8.4 Project Applications Policies
DROP POLICY IF EXISTS "Applicants and project owners can view applications" ON public.project_applications;
CREATE POLICY "Applicants and project owners can view applications" ON public.project_applications
    FOR SELECT USING (
        applicant_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_applications.project_id AND projects.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create applications" ON public.project_applications;
CREATE POLICY "Authenticated users can create applications" ON public.project_applications
    FOR INSERT WITH CHECK (
        auth.uid() = applicant_id
        -- Prevent applying to own project
        AND NOT EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_applications.project_id AND projects.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Applicants can withdraw or owners can decide applications" ON public.project_applications;
CREATE POLICY "Applicants can withdraw or owners can decide applications" ON public.project_applications
    FOR UPDATE USING (
        applicant_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_applications.project_id AND projects.owner_id = auth.uid()
        )
    );


-- 8.5 Teammate Requests Policies
DROP POLICY IF EXISTS "Users can view requests they sent or received" ON public.teammate_requests;
CREATE POLICY "Users can view requests they sent or received" ON public.teammate_requests
    FOR SELECT USING (
        sender_id = auth.uid() OR receiver_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can send requests" ON public.teammate_requests;
CREATE POLICY "Users can send requests" ON public.teammate_requests
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND sender_id <> receiver_id
    );

DROP POLICY IF EXISTS "Participants can update request status" ON public.teammate_requests;
CREATE POLICY "Participants can update request status" ON public.teammate_requests
    FOR UPDATE USING (
        receiver_id = auth.uid() OR sender_id = auth.uid()
    );
