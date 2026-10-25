-- ============================================================================
-- OMEGA QUESTION PAPER GENERATOR: FRESH DATABASE SCHEMA (001_initial_schema.sql)
-- Compatibility: Supabase Free Tier (PostgreSQL 15+)
-- ============================================================================

BEGIN;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'admin', 'teacher');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paper_status') THEN
        CREATE TYPE paper_status AS ENUM ('draft', 'configured', 'in_progress', 'ready', 'exported');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
        CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
    END IF;
END $$;

-- 3. UTILITY TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;

-- 4. BASE TABLES

-- 4.1 Institutes
CREATE TABLE IF NOT EXISTS public.institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tagline TEXT,
    affiliation TEXT,
    address TEXT,
    contact TEXT,
    logo_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4.2 Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'teacher',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4.3 Invitations
CREATE TABLE IF NOT EXISTS public.institute_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'teacher',
    invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    status invitation_status NOT NULL DEFAULT 'pending',
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4.4 Bank Folders
CREATE TABLE IF NOT EXISTS public.bank_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID,
    color TEXT DEFAULT '#3b82f6',
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bank_folders_id_inst') THEN
        ALTER TABLE public.bank_folders ADD CONSTRAINT uq_bank_folders_id_inst UNIQUE (id, institute_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bank_folders_parent_inst') THEN
        ALTER TABLE public.bank_folders ADD CONSTRAINT fk_bank_folders_parent_inst 
            FOREIGN KEY (parent_id, institute_id) REFERENCES public.bank_folders(id, institute_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4.5 Question Bank Items
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    folder_id UUID,
    prompt TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    difficulty TEXT NOT NULL,
    marks NUMERIC(4,1) NOT NULL DEFAULT 1.0,
    options JSONB,
    match_pairs JSONB,
    solution_text TEXT,
    hint TEXT,
    diagram_path TEXT,
    tags TEXT[] DEFAULT '{}',
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_question_folder_inst') THEN
        ALTER TABLE public.question_bank ADD CONSTRAINT fk_question_folder_inst 
            FOREIGN KEY (folder_id, institute_id) REFERENCES public.bank_folders(id, institute_id) ON DELETE NO ACTION;
    END IF;
END $$;

-- 4.6 Papers Metadata
CREATE TABLE IF NOT EXISTS public.papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL,
    exam_name TEXT NOT NULL,
    total_marks NUMERIC(5,1) NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    status paper_status NOT NULL DEFAULT 'draft',
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_papers_id_inst') THEN
        ALTER TABLE public.papers ADD CONSTRAINT uq_papers_id_inst UNIQUE (id, institute_id);
    END IF;
END $$;

-- 4.7 Exam Settings
CREATE TABLE IF NOT EXISTS public.exam_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL UNIQUE,
    institute_id UUID NOT NULL,
    institute_profile JSONB NOT NULL,
    exam_name TEXT NOT NULL,
    academic_session TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    subject_code TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 180,
    total_marks NUMERIC(5,1) NOT NULL DEFAULT 80,
    exam_date DATE,
    general_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    student_fields JSONB NOT NULL,
    cover_page_mode TEXT NOT NULL DEFAULT 'first_page_top',
    custom_cover_text TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_settings_paper_inst') THEN
        ALTER TABLE public.exam_settings ADD CONSTRAINT fk_settings_paper_inst 
            FOREIGN KEY (paper_id, institute_id) REFERENCES public.papers(id, institute_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4.8 Paper Contents
CREATE TABLE IF NOT EXISTS public.paper_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL UNIQUE,
    institute_id UUID NOT NULL,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_calculated_marks NUMERIC(5,1) NOT NULL DEFAULT 0,
    total_calculated_questions INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contents_paper_inst') THEN
        ALTER TABLE public.paper_contents ADD CONSTRAINT fk_contents_paper_inst 
            FOREIGN KEY (paper_id, institute_id) REFERENCES public.papers(id, institute_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4.9 Visual Layouts
CREATE TABLE IF NOT EXISTS public.visual_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL UNIQUE,
    institute_id UUID NOT NULL,
    page_size TEXT NOT NULL DEFAULT 'A4',
    orientation TEXT NOT NULL DEFAULT 'portrait',
    column_layout TEXT NOT NULL DEFAULT 'single',
    font_family TEXT NOT NULL DEFAULT 'sans',
    font_size_pt NUMERIC(3,1) NOT NULL DEFAULT 11.0,
    line_spacing NUMERIC(3,2) NOT NULL DEFAULT 1.25,
    page_margins_mm JSONB NOT NULL DEFAULT '{"top": 15, "bottom": 15, "left": 15, "right": 15}'::jsonb,
    header_style TEXT NOT NULL DEFAULT 'modern',
    show_institute_logo BOOLEAN NOT NULL DEFAULT TRUE,
    logo_placement TEXT NOT NULL DEFAULT 'center',
    logo_width_mm NUMERIC(4,1) NOT NULL DEFAULT 24.0,
    show_watermark BOOLEAN NOT NULL DEFAULT TRUE,
    watermark_text TEXT,
    watermark_opacity NUMERIC(3,2) NOT NULL DEFAULT 0.08,
    divider_between_questions BOOLEAN NOT NULL DEFAULT TRUE,
    question_spacing_pt NUMERIC(3,1) NOT NULL DEFAULT 10.0,
    option_spacing_pt NUMERIC(3,1) NOT NULL DEFAULT 6.0,
    mcq_option_layout TEXT NOT NULL DEFAULT 'auto',
    page_count_strategy TEXT NOT NULL DEFAULT 'auto',
    target_page_count INTEGER,
    section_break_new_page BOOLEAN NOT NULL DEFAULT FALSE,
    show_marks_per_question BOOLEAN NOT NULL DEFAULT TRUE,
    marks_alignment TEXT NOT NULL DEFAULT 'right',
    footer_note TEXT,
    show_page_numbers BOOLEAN NOT NULL DEFAULT TRUE,
    page_number_position TEXT NOT NULL DEFAULT 'bottom_center',
    header_footer JSONB NOT NULL DEFAULT '{}'::jsonb,
    design_data JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_layouts_paper_inst') THEN
        ALTER TABLE public.visual_layouts ADD CONSTRAINT fk_layouts_paper_inst 
            FOREIGN KEY (paper_id, institute_id) REFERENCES public.papers(id, institute_id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4.10 Paper Templates
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL,
    total_marks NUMERIC(5,1) NOT NULL,
    settings JSONB NOT NULL,
    layout JSONB NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 4.11 Sync Audit Log
CREATE TABLE IF NOT EXISTS public.sync_audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    modified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. PERFORMANCE & RLS INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_institute_id ON public.profiles(institute_id);
CREATE INDEX IF NOT EXISTS idx_invitations_lookup ON public.institute_invitations(invite_code, status);
CREATE INDEX IF NOT EXISTS idx_bank_folders_lookup ON public.bank_folders(institute_id, parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_question_bank_lookup ON public.question_bank(institute_id, folder_id, subject, class_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_papers_lookup ON public.papers(institute_id, created_by, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exam_settings_lookup ON public.exam_settings(paper_id, institute_id);
CREATE INDEX IF NOT EXISTS idx_paper_contents_lookup ON public.paper_contents(paper_id, institute_id);
CREATE INDEX IF NOT EXISTS idx_visual_layouts_lookup ON public.visual_layouts(paper_id, institute_id);
CREATE INDEX IF NOT EXISTS idx_templates_lookup ON public.templates(institute_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_audit_timeline ON public.sync_audit_log(institute_id, timestamp DESC);

-- 6. ATTACH UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trg_institutes_updated_at ON public.institutes;
CREATE TRIGGER trg_institutes_updated_at BEFORE UPDATE ON public.institutes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_invitations_updated_at ON public.institute_invitations;
CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON public.institute_invitations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_bank_folders_updated_at ON public.bank_folders;
CREATE TRIGGER trg_bank_folders_updated_at BEFORE UPDATE ON public.bank_folders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_question_bank_updated_at ON public.question_bank;
CREATE TRIGGER trg_question_bank_updated_at BEFORE UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_papers_updated_at ON public.papers;
CREATE TRIGGER trg_papers_updated_at BEFORE UPDATE ON public.papers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_exam_settings_updated_at ON public.exam_settings;
CREATE TRIGGER trg_exam_settings_updated_at BEFORE UPDATE ON public.exam_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_paper_contents_updated_at ON public.paper_contents;
CREATE TRIGGER trg_paper_contents_updated_at BEFORE UPDATE ON public.paper_contents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_visual_layouts_updated_at ON public.visual_layouts;
CREATE TRIGGER trg_visual_layouts_updated_at BEFORE UPDATE ON public.visual_layouts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_templates_updated_at ON public.templates;
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. CASCADE UNLINK HANDLER FOR BANK FOLDERS
CREATE OR REPLACE FUNCTION public.handle_bank_folder_deletion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.question_bank
    SET folder_id = NULL
    WHERE folder_id = OLD.id AND institute_id = OLD.institute_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.handle_bank_folder_deletion() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_handle_bank_folder_deletion ON public.bank_folders;
CREATE TRIGGER trg_handle_bank_folder_deletion
BEFORE DELETE ON public.bank_folders
FOR EACH ROW EXECUTE FUNCTION public.handle_bank_folder_deletion();

-- 8. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_institute_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT p.institute_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.current_user_institute_id() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role AS $$
BEGIN
    RETURN (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.current_user_role() OWNER TO postgres;

-- 9. INTEGRITY AND TAMPERING GUARDS
CREATE OR REPLACE FUNCTION public.guard_profile_tampering()
RETURNS TRIGGER AS $$
DECLARE
    caller_role public.user_role;
    owner_count INT;
BEGIN
    IF NEW.institute_id IS DISTINCT FROM OLD.institute_id THEN
        RAISE EXCEPTION 'Modifying institute_id is strictly forbidden.';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Modifying profile user ID is strictly forbidden.';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        caller_role := public.current_user_role();
        IF caller_role IS DISTINCT FROM 'owner'::public.user_role THEN
            RAISE EXCEPTION 'Permission denied: Only institute owners can modify roles.';
        END IF;

        IF OLD.id = auth.uid() AND NEW.role != 'owner'::public.user_role THEN
            SELECT pg_catalog.count(*) INTO owner_count 
            FROM public.profiles 
            WHERE institute_id = OLD.institute_id AND role = 'owner'::public.user_role;
            
            IF owner_count <= 1 THEN
                RAISE EXCEPTION 'Cannot demote the sole owner. Transfer ownership to another administrator first.';
            END IF;
        END IF;
    END IF;

    IF public.current_user_role() != 'owner'::public.user_role AND OLD.id != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied: Cannot modify another member profile.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.guard_profile_tampering() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_guard_profile_tampering ON public.profiles;
CREATE TRIGGER trg_guard_profile_tampering
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_tampering();

CREATE OR REPLACE FUNCTION public.guard_invitation_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email OR
       NEW.role IS DISTINCT FROM OLD.role OR
       NEW.invite_code IS DISTINCT FROM OLD.invite_code OR
       NEW.institute_id IS DISTINCT FROM OLD.institute_id THEN
        RAISE EXCEPTION 'Invitation core attributes cannot be edited. Revoke and issue a new invite instead.';
    END IF;

    IF OLD.status != 'pending'::public.invitation_status AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Cannot change status of an invitation that is already %.', OLD.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.guard_invitation_tampering() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_guard_invitation_tampering ON public.institute_invitations;
CREATE TRIGGER trg_guard_invitation_tampering
BEFORE UPDATE ON public.institute_invitations
FOR EACH ROW EXECUTE FUNCTION public.guard_invitation_tampering();

-- 10. ONBOARDING & MEMBERSHIP RPCs
CREATE OR REPLACE FUNCTION public.bootstrap_first_owner(
    p_full_name TEXT,
    p_institute_name TEXT,
    p_tagline TEXT DEFAULT NULL,
    p_affiliation TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_contact TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    new_institute_id UUID;
    existing_owner_count INT;
    existing_institute_count INT;
    existing_profile_count INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('omega_first_owner_lock'));

    SELECT pg_catalog.count(*) INTO existing_profile_count FROM public.profiles WHERE id = auth.uid();
    IF existing_profile_count > 0 THEN
        RAISE EXCEPTION 'You already have an active profile.';
    END IF;

    SELECT pg_catalog.count(*) INTO existing_institute_count FROM public.institutes;
    SELECT pg_catalog.count(*) INTO existing_owner_count FROM public.profiles WHERE role = 'owner'::public.user_role;
    IF existing_institute_count > 0 OR existing_owner_count > 0 THEN
        RAISE EXCEPTION 'System already initialized. Obtain an invitation code from your administrator.';
    END IF;

    INSERT INTO public.institutes (name, tagline, affiliation, address, contact)
    VALUES (p_institute_name, p_tagline, p_affiliation, p_address, p_contact)
    RETURNING id INTO new_institute_id;

    INSERT INTO public.profiles (id, institute_id, full_name, role)
    VALUES (auth.uid(), new_institute_id, p_full_name, 'owner'::public.user_role);

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'institute_id', new_institute_id,
        'role', 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.bootstrap_first_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.accept_invitation(
    p_invite_code TEXT,
    p_full_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation RECORD;
    caller_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'User already belongs to an organization.';
    END IF;

    SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
    IF caller_email IS NULL THEN
        RAISE EXCEPTION 'Authenticated user email could not be resolved.';
    END IF;

    SELECT * INTO invitation
    FROM public.institute_invitations
    WHERE invite_code = p_invite_code
      AND status = 'pending'::public.invitation_status
      AND expires_at > pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now())
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid, expired, or revoked invitation code.';
    END IF;

    IF pg_catalog.lower(pg_catalog.btrim(caller_email)) != pg_catalog.lower(pg_catalog.btrim(invitation.email)) THEN
        RAISE EXCEPTION 'This invitation was issued to % and cannot be redeemed by %.', invitation.email, caller_email;
    END IF;

    INSERT INTO public.profiles (id, institute_id, full_name, role)
    VALUES (auth.uid(), invitation.institute_id, p_full_name, invitation.role);

    UPDATE public.institute_invitations
    SET status = 'accepted'::public.invitation_status, updated_at = pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now())
    WHERE id = invitation.id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'institute_id', invitation.institute_id,
        'role', invitation.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.accept_invitation(TEXT, TEXT) OWNER TO postgres;

-- 11. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_audit_log ENABLE ROW LEVEL SECURITY;

-- 11.1 Institutes
DROP POLICY IF EXISTS "Institutes: Members can read" ON public.institutes;
CREATE POLICY "Institutes: Members can read" ON public.institutes
    FOR SELECT TO authenticated
    USING (id = public.current_user_institute_id());

DROP POLICY IF EXISTS "Institutes: Only Owner can update" ON public.institutes;
CREATE POLICY "Institutes: Only Owner can update" ON public.institutes
    FOR UPDATE TO authenticated
    USING (id = public.current_user_institute_id() AND public.current_user_role() = 'owner')
    WITH CHECK (id = public.current_user_institute_id());

-- 11.2 Profiles
DROP POLICY IF EXISTS "Profiles: View colleagues" ON public.profiles;
CREATE POLICY "Profiles: View colleagues" ON public.profiles
    FOR SELECT TO authenticated
    USING (institute_id = public.current_user_institute_id());

DROP POLICY IF EXISTS "Profiles: Update self or owner manage" ON public.profiles;
CREATE POLICY "Profiles: Update self or owner manage" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND 
        (id = auth.uid() OR public.current_user_role() = 'owner')
    )
    WITH CHECK (institute_id = public.current_user_institute_id());

DROP POLICY IF EXISTS "Profiles: Owner remove member" ON public.profiles;
CREATE POLICY "Profiles: Owner remove member" ON public.profiles
    FOR DELETE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND 
        public.current_user_role() = 'owner' AND 
        id != auth.uid()
    );

-- 11.3 Invitations
DROP POLICY IF EXISTS "Invitations: Owner/Admin view" ON public.institute_invitations;
CREATE POLICY "Invitations: Owner/Admin view" ON public.institute_invitations
    FOR SELECT TO authenticated
    USING (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Invitations: Owner/Admin insert" ON public.institute_invitations;
CREATE POLICY "Invitations: Owner/Admin insert" ON public.institute_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        institute_id = public.current_user_institute_id() AND
        public.current_user_role() IN ('owner', 'admin') AND
        invited_by = auth.uid() AND
        (public.current_user_role() = 'owner' OR role = 'teacher')
    );

DROP POLICY IF EXISTS "Invitations: Owner/Admin revoke" ON public.institute_invitations;
CREATE POLICY "Invitations: Owner/Admin revoke" ON public.institute_invitations
    FOR UPDATE TO authenticated
    USING (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin'))
    WITH CHECK (institute_id = public.current_user_institute_id() AND status = 'revoked');

-- 11.4 Bank Folders
DROP POLICY IF EXISTS "Folders: Select" ON public.bank_folders;
CREATE POLICY "Folders: Select" ON public.bank_folders
    FOR SELECT TO authenticated
    USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Folders: Insert" ON public.bank_folders;
CREATE POLICY "Folders: Insert" ON public.bank_folders
    FOR INSERT TO authenticated
    WITH CHECK (institute_id = public.current_user_institute_id() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Folders: Update" ON public.bank_folders;
CREATE POLICY "Folders: Update" ON public.bank_folders
    FOR UPDATE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())
    )
    WITH CHECK (institute_id = public.current_user_institute_id());

DROP POLICY IF EXISTS "Folders: Delete" ON public.bank_folders;
CREATE POLICY "Folders: Delete" ON public.bank_folders
    FOR DELETE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())
    );

-- 11.5 Question Bank Items
DROP POLICY IF EXISTS "Questions: Select" ON public.question_bank;
CREATE POLICY "Questions: Select" ON public.question_bank
    FOR SELECT TO authenticated
    USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Questions: Insert" ON public.question_bank;
CREATE POLICY "Questions: Insert" ON public.question_bank
    FOR INSERT TO authenticated
    WITH CHECK (institute_id = public.current_user_institute_id() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Questions: Update" ON public.question_bank;
CREATE POLICY "Questions: Update" ON public.question_bank
    FOR UPDATE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())
    )
    WITH CHECK (institute_id = public.current_user_institute_id());

DROP POLICY IF EXISTS "Questions: Delete" ON public.question_bank;
CREATE POLICY "Questions: Delete" ON public.question_bank
    FOR DELETE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())
    );

-- 11.6 Papers
DROP POLICY IF EXISTS "Papers: Select" ON public.papers;
CREATE POLICY "Papers: Select" ON public.papers
    FOR SELECT TO authenticated
    USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Papers: Insert" ON public.papers;
CREATE POLICY "Papers: Insert" ON public.papers
    FOR INSERT TO authenticated
    WITH CHECK (institute_id = public.current_user_institute_id() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Papers: Update" ON public.papers;
CREATE POLICY "Papers: Update" ON public.papers
    FOR UPDATE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())
    )
    WITH CHECK (institute_id = public.current_user_institute_id());

DROP POLICY IF EXISTS "Papers: Delete" ON public.papers;
CREATE POLICY "Papers: Delete" ON public.papers
    FOR DELETE TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR (created_by = auth.uid() AND status = 'draft'))
    );

-- 11.7 Child Tables
DROP POLICY IF EXISTS "Settings: Access" ON public.exam_settings;
CREATE POLICY "Settings: Access" ON public.exam_settings
    FOR ALL TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR EXISTS (
            SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()
        ))
    )
    WITH CHECK (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR EXISTS (
            SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Contents: Access" ON public.paper_contents;
CREATE POLICY "Contents: Access" ON public.paper_contents
    FOR ALL TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR EXISTS (
            SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()
        ))
    )
    WITH CHECK (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR EXISTS (
            SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "Layouts: Access" ON public.visual_layouts;
CREATE POLICY "Layouts: Access" ON public.visual_layouts
    FOR ALL TO authenticated
    USING (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR EXISTS (
            SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()
        ))
    )
    WITH CHECK (
        institute_id = public.current_user_institute_id() AND
        (public.current_user_role() IN ('owner', 'admin') OR EXISTS (
            SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()
        ))
    );

-- 11.8 Templates
DROP POLICY IF EXISTS "Templates: Select" ON public.templates;
CREATE POLICY "Templates: Select" ON public.templates
    FOR SELECT TO authenticated
    USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Templates: Owner/Admin manage" ON public.templates;
CREATE POLICY "Templates: Owner/Admin manage" ON public.templates
    FOR ALL TO authenticated
    USING (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin'))
    WITH CHECK (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin'));

-- 11.9 Sync Audit Log
DROP POLICY IF EXISTS "Audit: Read" ON public.sync_audit_log;
CREATE POLICY "Audit: Read" ON public.sync_audit_log
    FOR SELECT TO authenticated
    USING (institute_id = public.current_user_institute_id());

DROP POLICY IF EXISTS "Audit: Insert" ON public.sync_audit_log;
CREATE POLICY "Audit: Insert" ON public.sync_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (institute_id = public.current_user_institute_id());

-- 12. STORAGE BUCKET & POLICIES
CREATE OR REPLACE FUNCTION public.can_access_exam_asset(object_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    path_category TEXT;
    path_institute_text TEXT;
    path_institute_uuid UUID;
BEGIN
    path_category := pg_catalog.split_part(object_name, '/', 1);
    path_institute_text := pg_catalog.split_part(object_name, '/', 2);

    IF path_category NOT IN ('logos', 'diagrams') THEN
        RETURN FALSE;
    END IF;

    IF object_name LIKE '%..%' OR object_name LIKE '//%' THEN
        RETURN FALSE;
    END IF;

    BEGIN
        path_institute_uuid := path_institute_text::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    RETURN path_institute_uuid = public.current_user_institute_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.can_access_exam_asset(TEXT) OWNER TO postgres;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exam-assets',
    'exam-assets',
    false,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Storage: Private Download" ON storage.objects;
CREATE POLICY "Storage: Private Download"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'exam-assets' AND
    public.can_access_exam_asset(name)
);

DROP POLICY IF EXISTS "Storage: Private Upload" ON storage.objects;
CREATE POLICY "Storage: Private Upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'exam-assets' AND
    public.can_access_exam_asset(name)
);

DROP POLICY IF EXISTS "Storage: Private Overwrite" ON storage.objects;
CREATE POLICY "Storage: Private Overwrite"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'exam-assets' AND
    public.can_access_exam_asset(name) AND
    (public.current_user_role() IN ('owner', 'admin') OR (owner)::text = (auth.uid())::text)
)
WITH CHECK (
    bucket_id = 'exam-assets' AND
    public.can_access_exam_asset(name)
);

DROP POLICY IF EXISTS "Storage: Private Delete" ON storage.objects;
CREATE POLICY "Storage: Private Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'exam-assets' AND
    public.can_access_exam_asset(name) AND
    (public.current_user_role() IN ('owner', 'admin') OR (owner)::text = (auth.uid())::text)
);

-- 13. FUNCTION PERMISSION HARDENING (Least Privilege)
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_bank_folder_deletion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_tampering() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_invitation_tampering() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.current_user_institute_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_institute_id() TO authenticated;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

REVOKE ALL ON FUNCTION public.can_access_exam_asset(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_exam_asset(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_first_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.accept_invitation(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT, TEXT) TO authenticated;

-- 14. SCHEMA & TABLE PRIVILEGES FOR ROW LEVEL SECURITY
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON TABLE storage.objects TO anon, authenticated, service_role;

COMMIT;