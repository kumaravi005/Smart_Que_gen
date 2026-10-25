-- ============================================================================
-- OMEGA QUESTION PAPER GENERATOR: UPGRADE SCHEMA (002_upgrade_schema.sql)
-- Safe, non-destructive upgrade from any prior schema iteration
-- ============================================================================

BEGIN;

-- 1. PREFLIGHT STRUCTURAL AND RELATIONSHIP VALIDATION BEFORE CHANGES
DO $$
DECLARE
    required_cols TEXT[][] := ARRAY[
        -- Institutes
        ['public', 'institutes', 'id'],
        ['public', 'institutes', 'name'],
        ['public', 'institutes', 'tagline'],
        ['public', 'institutes', 'affiliation'],
        ['public', 'institutes', 'address'],
        ['public', 'institutes', 'contact'],

        -- Profiles
        ['public', 'profiles', 'id'],
        ['public', 'profiles', 'institute_id'],
        ['public', 'profiles', 'full_name'],
        ['public', 'profiles', 'role'],

        -- Invitations
        ['public', 'institute_invitations', 'id'],
        ['public', 'institute_invitations', 'institute_id'],
        ['public', 'institute_invitations', 'email'],
        ['public', 'institute_invitations', 'role'],
        ['public', 'institute_invitations', 'invite_code'],
        ['public', 'institute_invitations', 'status'],
        ['public', 'institute_invitations', 'invited_by'],
        ['public', 'institute_invitations', 'expires_at'],

        -- Bank Folders
        ['public', 'bank_folders', 'id'],
        ['public', 'bank_folders', 'institute_id'],
        ['public', 'bank_folders', 'name'],
        ['public', 'bank_folders', 'parent_id'],
        ['public', 'bank_folders', 'created_by'],
        ['public', 'bank_folders', 'deleted_at'],

        -- Question Bank
        ['public', 'question_bank', 'id'],
        ['public', 'question_bank', 'institute_id'],
        ['public', 'question_bank', 'folder_id'],
        ['public', 'question_bank', 'prompt'],
        ['public', 'question_bank', 'type'],
        ['public', 'question_bank', 'subject'],
        ['public', 'question_bank', 'created_by'],
        ['public', 'question_bank', 'deleted_at'],

        -- Papers
        ['public', 'papers', 'id'],
        ['public', 'papers', 'institute_id'],
        ['public', 'papers', 'title'],
        ['public', 'papers', 'subject'],
        ['public', 'papers', 'class_name'],
        ['public', 'papers', 'status'],
        ['public', 'papers', 'created_by'],
        ['public', 'papers', 'deleted_at'],

        -- Exam Settings
        ['public', 'exam_settings', 'id'],
        ['public', 'exam_settings', 'paper_id'],
        ['public', 'exam_settings', 'institute_id'],

        -- Paper Contents
        ['public', 'paper_contents', 'id'],
        ['public', 'paper_contents', 'paper_id'],
        ['public', 'paper_contents', 'institute_id'],

        -- Visual Layouts
        ['public', 'visual_layouts', 'id'],
        ['public', 'visual_layouts', 'paper_id'],
        ['public', 'visual_layouts', 'institute_id'],

        -- Templates
        ['public', 'templates', 'id'],
        ['public', 'templates', 'institute_id'],
        ['public', 'templates', 'name'],
        ['public', 'templates', 'deleted_at'],

        -- Sync Audit Log
        ['public', 'sync_audit_log', 'id'],
        ['public', 'sync_audit_log', 'institute_id'],

        -- Storage Buckets & Objects
        ['storage', 'buckets', 'id'],
        ['storage', 'buckets', 'public'],
        ['storage', 'buckets', 'file_size_limit'],
        ['storage', 'buckets', 'allowed_mime_types'],
        ['storage', 'objects', 'id'],
        ['storage', 'objects', 'bucket_id'],
        ['storage', 'objects', 'name'],
        ['storage', 'objects', 'owner']
    ];
    missing_items TEXT := '';
    i INT;
    v_schema TEXT;
    v_table TEXT;
    v_col TEXT;
    table_found BOOLEAN;
    col_found BOOLEAN;
    orphan_settings_count INT := 0;
    orphan_contents_count INT := 0;
    orphan_layouts_count INT := 0;
    broken_folder_count INT := 0;
    broken_question_count INT := 0;
    cross_folder_count INT := 0;
    cross_settings_count INT := 0;
    cross_contents_count INT := 0;
    cross_layouts_count INT := 0;
    cross_question_count INT := 0;
BEGIN
    -- 1.1 Structural Preflight: Validate existence of all required tables and columns
    FOR i IN 1..array_length(required_cols, 1) LOOP
        v_schema := required_cols[i][1];
        v_table := required_cols[i][2];
        v_col := required_cols[i][3];

        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = v_schema AND table_name = v_table
        ) INTO table_found;

        IF NOT table_found THEN
            IF missing_items NOT LIKE '%' || v_schema || '.' || v_table || ' (table)%' THEN
                missing_items := missing_items || v_schema || '.' || v_table || ' (table), ';
            END IF;
        ELSE
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = v_schema AND table_name = v_table AND column_name = v_col
            ) INTO col_found;

            IF NOT col_found THEN
                missing_items := missing_items || v_schema || '.' || v_table || '.' || v_col || ' (column), ';
            END IF;
        END IF;
    END LOOP;

    IF missing_items <> '' THEN
        RAISE EXCEPTION 'PREFLIGHT AUDIT FAILED: Required tables or columns are missing before upgrade can proceed: %', rtrim(missing_items, ', ');
    END IF;

    -- 1.2 Relationship & Orphan Audit
    -- Check 1: Orphaned exam settings
    SELECT count(*) INTO orphan_settings_count 
    FROM public.exam_settings s 
    WHERE NOT EXISTS (SELECT 1 FROM public.papers p WHERE p.id = s.paper_id);

    -- Check 2: Orphaned paper contents
    SELECT count(*) INTO orphan_contents_count 
    FROM public.paper_contents c 
    WHERE NOT EXISTS (SELECT 1 FROM public.papers p WHERE p.id = c.paper_id);

    -- Check 3: Orphaned visual layouts
    SELECT count(*) INTO orphan_layouts_count 
    FROM public.visual_layouts l 
    WHERE NOT EXISTS (SELECT 1 FROM public.papers p WHERE p.id = l.paper_id);

    -- Check 4: Broken folder parent hierarchies
    SELECT count(*) INTO broken_folder_count
    FROM public.bank_folders f
    WHERE f.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bank_folders p WHERE p.id = f.parent_id);

    -- Check 5: Cross-institute folder nesting in existing records
    SELECT count(*) INTO cross_folder_count
    FROM public.bank_folders f
    JOIN public.bank_folders p ON f.parent_id = p.id
    WHERE f.institute_id IS DISTINCT FROM p.institute_id;

    -- Check 6: Broken question folder references
    SELECT count(*) INTO broken_question_count
    FROM public.question_bank q
    WHERE q.folder_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bank_folders f WHERE f.id = q.folder_id);

    -- Check 7: Cross-institute exam settings
    SELECT count(*) INTO cross_settings_count
    FROM public.exam_settings s
    JOIN public.papers p ON s.paper_id = p.id
    WHERE s.institute_id IS NOT NULL AND s.institute_id IS DISTINCT FROM p.institute_id;

    -- Check 8: Cross-institute paper contents
    SELECT count(*) INTO cross_contents_count
    FROM public.paper_contents c
    JOIN public.papers p ON c.paper_id = p.id
    WHERE c.institute_id IS NOT NULL AND c.institute_id IS DISTINCT FROM p.institute_id;

    -- Check 9: Cross-institute visual layouts
    SELECT count(*) INTO cross_layouts_count
    FROM public.visual_layouts l
    JOIN public.papers p ON l.paper_id = p.id
    WHERE l.institute_id IS NOT NULL AND l.institute_id IS DISTINCT FROM p.institute_id;

    -- Check 10: Cross-institute question folder
    SELECT count(*) INTO cross_question_count
    FROM public.question_bank q
    JOIN public.bank_folders f ON q.folder_id = f.id
    WHERE q.institute_id IS DISTINCT FROM f.institute_id;

    IF orphan_settings_count > 0 OR orphan_contents_count > 0 OR orphan_layouts_count > 0 OR
       broken_folder_count > 0 OR broken_question_count > 0 OR cross_folder_count > 0 OR
       cross_settings_count > 0 OR cross_contents_count > 0 OR cross_layouts_count > 0 OR cross_question_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT AUDIT FAILED: Data integrity anomalies detected! (orphan_settings: %, orphan_contents: %, orphan_layouts: %, broken_folders: %, broken_questions: %, cross_institute_folders: %, cross_institute_settings: %, cross_institute_contents: %, cross_institute_layouts: %, cross_institute_questions: %). Fix these records before running the upgrade.',
            orphan_settings_count, orphan_contents_count, orphan_layouts_count, broken_folder_count, broken_question_count, cross_folder_count, cross_settings_count, cross_contents_count, cross_layouts_count, cross_question_count;
    END IF;
END $$;

-- 2. EXPLICITLY DROP ONLY KNOWN OMEGA POLICIES (Preserves Unrelated Policies)
-- Institutes
DROP POLICY IF EXISTS "Institutes: Members can read" ON public.institutes;
DROP POLICY IF EXISTS "Institutes: Only Owner can update" ON public.institutes;
DROP POLICY IF EXISTS "Institutes: Owner can update" ON public.institutes;

-- Profiles
DROP POLICY IF EXISTS "Profiles: View colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: View colleagues in institute" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Update self or owner manage" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Users can update own name" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Self update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Owner manage roles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Owner remove member" ON public.profiles;

-- Invitations
DROP POLICY IF EXISTS "Invitations: Owner/Admin view" ON public.institute_invitations;
DROP POLICY IF EXISTS "Invitations: Owner/Admin view issued" ON public.institute_invitations;
DROP POLICY IF EXISTS "Invitations: Owner/Admin insert" ON public.institute_invitations;
DROP POLICY IF EXISTS "Invitations: Owner/Admin create" ON public.institute_invitations;
DROP POLICY IF EXISTS "Invitations: Owner/Admin revoke" ON public.institute_invitations;

-- Folders
DROP POLICY IF EXISTS "Folders: Select" ON public.bank_folders;
DROP POLICY IF EXISTS "Folders: Read active" ON public.bank_folders;
DROP POLICY IF EXISTS "Folders: Insert" ON public.bank_folders;
DROP POLICY IF EXISTS "Folders: Update" ON public.bank_folders;
DROP POLICY IF EXISTS "Folders: Delete" ON public.bank_folders;
DROP POLICY IF EXISTS "Bank & Folders: Read shared" ON public.bank_folders;
DROP POLICY IF EXISTS "Bank & Folders: Insert" ON public.bank_folders;

-- Questions
DROP POLICY IF EXISTS "Questions: Select" ON public.question_bank;
DROP POLICY IF EXISTS "Questions: Read active" ON public.question_bank;
DROP POLICY IF EXISTS "Questions: Read shared" ON public.question_bank;
DROP POLICY IF EXISTS "Questions: Insert" ON public.question_bank;
DROP POLICY IF EXISTS "Questions: Update" ON public.question_bank;
DROP POLICY IF EXISTS "Questions: Delete" ON public.question_bank;
DROP POLICY IF EXISTS "Questions: Soft Delete" ON public.question_bank;

-- Papers
DROP POLICY IF EXISTS "Papers: Select" ON public.papers;
DROP POLICY IF EXISTS "Papers: Read active" ON public.papers;
DROP POLICY IF EXISTS "Papers: Insert" ON public.papers;
DROP POLICY IF EXISTS "Papers: Update" ON public.papers;
DROP POLICY IF EXISTS "Papers: Delete" ON public.papers;

-- Child Tables
DROP POLICY IF EXISTS "Settings: Access" ON public.exam_settings;
DROP POLICY IF EXISTS "Settings: Linked to paper" ON public.exam_settings;
DROP POLICY IF EXISTS "Exam Settings: Access via Paper" ON public.exam_settings;

DROP POLICY IF EXISTS "Contents: Access" ON public.paper_contents;
DROP POLICY IF EXISTS "Contents: Linked to paper" ON public.paper_contents;
DROP POLICY IF EXISTS "Paper Contents: Access via Paper" ON public.paper_contents;

DROP POLICY IF EXISTS "Layouts: Access" ON public.visual_layouts;
DROP POLICY IF EXISTS "Layouts: Linked to paper" ON public.visual_layouts;
DROP POLICY IF EXISTS "Visual Layouts: Access via Paper" ON public.visual_layouts;

-- Templates
DROP POLICY IF EXISTS "Templates: Select" ON public.templates;
DROP POLICY IF EXISTS "Templates: Read active" ON public.templates;
DROP POLICY IF EXISTS "Templates: Read" ON public.templates;
DROP POLICY IF EXISTS "Templates: Owner/Admin manage" ON public.templates;
DROP POLICY IF EXISTS "Templates: Manage" ON public.templates;

-- Audit
DROP POLICY IF EXISTS "Audit: Read" ON public.sync_audit_log;
DROP POLICY IF EXISTS "Audit: Read institute changes" ON public.sync_audit_log;
DROP POLICY IF EXISTS "Audit: Insert" ON public.sync_audit_log;
DROP POLICY IF EXISTS "Audit: Insert record" ON public.sync_audit_log;

-- Storage
DROP POLICY IF EXISTS "Storage: Private Download" ON storage.objects;
DROP POLICY IF EXISTS "Storage: Private Upload" ON storage.objects;
DROP POLICY IF EXISTS "Storage: Private Overwrite" ON storage.objects;
DROP POLICY IF EXISTS "Storage: Private Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Exam Assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Exam Assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Exam Assets" ON storage.objects;

-- 3. ENSURE RLS IS ENABLED ACROSS ALL APPLICATION TABLES
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
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. COLUMN ADDITIONS AND BACKFILLS
ALTER TABLE public.exam_settings ADD COLUMN IF NOT EXISTS institute_id UUID;
UPDATE public.exam_settings s 
SET institute_id = p.institute_id 
FROM public.papers p 
WHERE s.paper_id = p.id AND s.institute_id IS NULL;
ALTER TABLE public.exam_settings ALTER COLUMN institute_id SET NOT NULL;

ALTER TABLE public.paper_contents ADD COLUMN IF NOT EXISTS institute_id UUID;
UPDATE public.paper_contents c 
SET institute_id = p.institute_id 
FROM public.papers p 
WHERE c.paper_id = p.id AND c.institute_id IS NULL;
ALTER TABLE public.paper_contents ALTER COLUMN institute_id SET NOT NULL;

ALTER TABLE public.visual_layouts ADD COLUMN IF NOT EXISTS institute_id UUID;
UPDATE public.visual_layouts l 
SET institute_id = p.institute_id 
FROM public.papers p 
WHERE l.paper_id = p.id AND l.institute_id IS NULL;
ALTER TABLE public.visual_layouts ALTER COLUMN institute_id SET NOT NULL;

-- 5. CONSTRAINTS AND COMPOSITE KEYS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bank_folders_id_inst') THEN
        ALTER TABLE public.bank_folders ADD CONSTRAINT uq_bank_folders_id_inst UNIQUE (id, institute_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_papers_id_inst') THEN
        ALTER TABLE public.papers ADD CONSTRAINT uq_papers_id_inst UNIQUE (id, institute_id);
    END IF;
END $$;

ALTER TABLE public.bank_folders DROP CONSTRAINT IF EXISTS bank_folders_parent_id_fkey;
ALTER TABLE public.bank_folders DROP CONSTRAINT IF EXISTS fk_bank_folders_parent_inst;
ALTER TABLE public.bank_folders ADD CONSTRAINT fk_bank_folders_parent_inst 
    FOREIGN KEY (parent_id, institute_id) REFERENCES public.bank_folders(id, institute_id) ON DELETE CASCADE;

ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS question_bank_folder_id_fkey;
ALTER TABLE public.question_bank DROP CONSTRAINT IF EXISTS fk_question_folder_inst;
ALTER TABLE public.question_bank ADD CONSTRAINT fk_question_folder_inst 
    FOREIGN KEY (folder_id, institute_id) REFERENCES public.bank_folders(id, institute_id) ON DELETE NO ACTION;

ALTER TABLE public.exam_settings DROP CONSTRAINT IF EXISTS exam_settings_paper_id_fkey;
ALTER TABLE public.exam_settings DROP CONSTRAINT IF EXISTS fk_settings_paper_inst;
ALTER TABLE public.exam_settings ADD CONSTRAINT fk_settings_paper_inst 
    FOREIGN KEY (paper_id, institute_id) REFERENCES public.papers(id, institute_id) ON DELETE CASCADE;

ALTER TABLE public.paper_contents DROP CONSTRAINT IF EXISTS paper_contents_paper_id_fkey;
ALTER TABLE public.paper_contents DROP CONSTRAINT IF EXISTS fk_contents_paper_inst;
ALTER TABLE public.paper_contents ADD CONSTRAINT fk_contents_paper_inst 
    FOREIGN KEY (paper_id, institute_id) REFERENCES public.papers(id, institute_id) ON DELETE CASCADE;

ALTER TABLE public.visual_layouts DROP CONSTRAINT IF EXISTS visual_layouts_paper_id_fkey;
ALTER TABLE public.visual_layouts DROP CONSTRAINT IF EXISTS fk_layouts_paper_inst;
ALTER TABLE public.visual_layouts ADD CONSTRAINT fk_layouts_paper_inst 
    FOREIGN KEY (paper_id, institute_id) REFERENCES public.papers(id, institute_id) ON DELETE CASCADE;

-- 6. RECREATE FUNCTIONS AND SET OWNERSHIP
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;

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

-- 7. REAPPLY AUDITED RLS POLICIES
CREATE POLICY "Institutes: Members can read" ON public.institutes FOR SELECT TO authenticated USING (id = public.current_user_institute_id());
CREATE POLICY "Institutes: Only Owner can update" ON public.institutes FOR UPDATE TO authenticated USING (id = public.current_user_institute_id() AND public.current_user_role() = 'owner') WITH CHECK (id = public.current_user_institute_id());

CREATE POLICY "Profiles: View colleagues" ON public.profiles FOR SELECT TO authenticated USING (institute_id = public.current_user_institute_id());
CREATE POLICY "Profiles: Update self or owner manage" ON public.profiles FOR UPDATE TO authenticated USING (institute_id = public.current_user_institute_id() AND (id = auth.uid() OR public.current_user_role() = 'owner')) WITH CHECK (institute_id = public.current_user_institute_id());
CREATE POLICY "Profiles: Owner remove member" ON public.profiles FOR DELETE TO authenticated USING (institute_id = public.current_user_institute_id() AND public.current_user_role() = 'owner' AND id != auth.uid());

CREATE POLICY "Invitations: Owner/Admin view" ON public.institute_invitations FOR SELECT TO authenticated USING (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin'));
CREATE POLICY "Invitations: Owner/Admin insert" ON public.institute_invitations FOR INSERT TO authenticated WITH CHECK (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin') AND invited_by = auth.uid() AND (public.current_user_role() = 'owner' OR role = 'teacher'));
CREATE POLICY "Invitations: Owner/Admin revoke" ON public.institute_invitations FOR UPDATE TO authenticated USING (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin')) WITH CHECK (institute_id = public.current_user_institute_id() AND status = 'revoked');

CREATE POLICY "Folders: Select" ON public.bank_folders FOR SELECT TO authenticated USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);
CREATE POLICY "Folders: Insert" ON public.bank_folders FOR INSERT TO authenticated WITH CHECK (institute_id = public.current_user_institute_id() AND created_by = auth.uid());
CREATE POLICY "Folders: Update" ON public.bank_folders FOR UPDATE TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())) WITH CHECK (institute_id = public.current_user_institute_id());
CREATE POLICY "Folders: Delete" ON public.bank_folders FOR DELETE TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid()));

CREATE POLICY "Questions: Select" ON public.question_bank FOR SELECT TO authenticated USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);
CREATE POLICY "Questions: Insert" ON public.question_bank FOR INSERT TO authenticated WITH CHECK (institute_id = public.current_user_institute_id() AND created_by = auth.uid());
CREATE POLICY "Questions: Update" ON public.question_bank FOR UPDATE TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())) WITH CHECK (institute_id = public.current_user_institute_id());
CREATE POLICY "Questions: Delete" ON public.question_bank FOR DELETE TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid()));

CREATE POLICY "Papers: Select" ON public.papers FOR SELECT TO authenticated USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);
CREATE POLICY "Papers: Insert" ON public.papers FOR INSERT TO authenticated WITH CHECK (institute_id = public.current_user_institute_id() AND created_by = auth.uid());
CREATE POLICY "Papers: Update" ON public.papers FOR UPDATE TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR created_by = auth.uid())) WITH CHECK (institute_id = public.current_user_institute_id());
CREATE POLICY "Papers: Delete" ON public.papers FOR DELETE TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR (created_by = auth.uid() AND status = 'draft')));

CREATE POLICY "Settings: Access" ON public.exam_settings FOR ALL TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()))) WITH CHECK (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid())));
CREATE POLICY "Contents: Access" ON public.paper_contents FOR ALL TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()))) WITH CHECK (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid())));
CREATE POLICY "Layouts: Access" ON public.visual_layouts FOR ALL TO authenticated USING (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid()))) WITH CHECK (institute_id = public.current_user_institute_id() AND (public.current_user_role() IN ('owner', 'admin') OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid())));

CREATE POLICY "Templates: Select" ON public.templates FOR SELECT TO authenticated USING (institute_id = public.current_user_institute_id() AND deleted_at IS NULL);
CREATE POLICY "Templates: Owner/Admin manage" ON public.templates FOR ALL TO authenticated USING (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin')) WITH CHECK (institute_id = public.current_user_institute_id() AND public.current_user_role() IN ('owner', 'admin'));

CREATE POLICY "Audit: Read" ON public.sync_audit_log FOR SELECT TO authenticated USING (institute_id = public.current_user_institute_id());
CREATE POLICY "Audit: Insert" ON public.sync_audit_log FOR INSERT TO authenticated WITH CHECK (institute_id = public.current_user_institute_id());

-- 8. STORAGE RECONFIGURATION & POLICIES
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

UPDATE storage.buckets 
SET public = false, 
    file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'exam-assets';

CREATE POLICY "Storage: Private Download" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'exam-assets' AND public.can_access_exam_asset(name));
CREATE POLICY "Storage: Private Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exam-assets' AND public.can_access_exam_asset(name));
CREATE POLICY "Storage: Private Overwrite" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'exam-assets' AND public.can_access_exam_asset(name) AND (public.current_user_role() IN ('owner', 'admin') OR (owner)::text = (auth.uid())::text)) WITH CHECK (bucket_id = 'exam-assets' AND public.can_access_exam_asset(name));
CREATE POLICY "Storage: Private Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exam-assets' AND public.can_access_exam_asset(name) AND (public.current_user_role() IN ('owner', 'admin') OR (owner)::text = (auth.uid())::text));

-- 9. LEAST-PRIVILEGE FUNCTION GRANTS
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

-- 10. SCHEMA & TABLE PRIVILEGES FOR ROW LEVEL SECURITY
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON TABLE storage.objects TO anon, authenticated, service_role;

COMMIT;