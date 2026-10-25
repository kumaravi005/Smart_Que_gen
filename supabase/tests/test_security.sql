-- ============================================================================
-- OMEGA SECURITY VALIDATION TEST HARNESS (GENUINE RLS & STORAGE ACCESS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: SETUP TEST ENGINE & DYNAMIC FIXTURES (Runs as postgres superuser)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pg_temp.test_registry (
    entity_name TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL
);
GRANT ALL ON TABLE pg_temp.test_registry TO authenticated, anon;

CREATE OR REPLACE FUNCTION pg_temp.assert(p_condition BOOLEAN, p_name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF NOT p_condition THEN
        RAISE EXCEPTION 'ASSERTION FAILED: %', p_name;
    END IF;
    RETURN 'PASS: ' || p_name;
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION pg_temp.assert(BOOLEAN, TEXT) TO authenticated, anon;

CREATE OR REPLACE FUNCTION pg_temp.assert_fails_with(p_query TEXT, p_expected_pattern TEXT, p_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_err_msg TEXT;
BEGIN
    BEGIN
        EXECUTE p_query;
    EXCEPTION WHEN OTHERS THEN
        v_err_msg := SQLERRM;
        IF v_err_msg NOT ILIKE '%' || p_expected_pattern || '%' THEN
            RAISE EXCEPTION 'TEST FAILED: % threw unexpected error "%" instead of pattern "%"', p_name, v_err_msg, p_expected_pattern;
        END IF;
        RETURN 'PASS: ' || p_name || ' (Expected error matched: ' || v_err_msg || ')';
    END;
    RAISE EXCEPTION 'SECURITY BREACH: % succeeded when it should have failed!', p_name;
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION pg_temp.assert_fails_with(TEXT, TEXT, TEXT) TO authenticated, anon;

DO $$
DECLARE
    v_inst_a UUID := gen_random_uuid();
    v_inst_b UUID := gen_random_uuid();
    v_owner_a UUID := gen_random_uuid();
    v_admin_a UUID := gen_random_uuid();
    v_teacher_a UUID := gen_random_uuid();
    v_teacher_b UUID := gen_random_uuid();
    v_unattached_mismatch UUID := gen_random_uuid();
    v_invited_valid UUID := gen_random_uuid();
    v_folder_a UUID := gen_random_uuid();
    v_folder_b UUID := gen_random_uuid();
    v_paper_a UUID := gen_random_uuid();
    v_paper_b UUID := gen_random_uuid();
    v_obj_a UUID := gen_random_uuid();
    v_obj_b UUID := gen_random_uuid();
    v_tmpl_a UUID := gen_random_uuid();
BEGIN
    -- Record all fixture IDs by explicit unique name
    INSERT INTO pg_temp.test_registry (entity_name, entity_type, entity_id) VALUES 
        ('inst_a', 'institute', v_inst_a), 
        ('inst_b', 'institute', v_inst_b),
        ('owner_a', 'user', v_owner_a), 
        ('admin_a', 'user', v_admin_a), 
        ('teacher_a', 'user', v_teacher_a), 
        ('teacher_b', 'user', v_teacher_b), 
        ('unattached_mismatch', 'user', v_unattached_mismatch), 
        ('invited_valid', 'user', v_invited_valid),
        ('folder_a', 'folder', v_folder_a),
        ('folder_b', 'folder', v_folder_b),
        ('paper_a', 'paper', v_paper_a),
        ('paper_b', 'paper', v_paper_b),
        ('tmpl_a', 'template', v_tmpl_a),
        ('obj_a', 'storage', v_obj_a), 
        ('obj_b', 'storage', v_obj_b);

    -- Mock Institutes
    INSERT INTO public.institutes (id, name) VALUES (v_inst_a, '[TEST] Omega Alpha ' || v_inst_a);
    INSERT INTO public.institutes (id, name) VALUES (v_inst_b, '[TEST] Omega Beta ' || v_inst_b);

    -- Mock Auth Users
    INSERT INTO auth.users (id, email) VALUES (v_owner_a, 'owner_' || v_owner_a || '@omega.edu');
    INSERT INTO auth.users (id, email) VALUES (v_admin_a, 'admin_' || v_admin_a || '@omega.edu');
    INSERT INTO auth.users (id, email) VALUES (v_teacher_a, 'teacher_' || v_teacher_a || '@omega.edu');
    INSERT INTO auth.users (id, email) VALUES (v_teacher_b, 'teacher_' || v_teacher_b || '@rival.edu');
    INSERT INTO auth.users (id, email) VALUES (v_unattached_mismatch, 'mallory_' || v_unattached_mismatch || '@hacker.edu');
    INSERT INTO auth.users (id, email) VALUES (v_invited_valid, 'invited_' || v_invited_valid || '@omega.edu');

    -- Profiles
    INSERT INTO public.profiles (id, institute_id, full_name, role) VALUES (v_owner_a, v_inst_a, 'Alice Owner', 'owner');
    INSERT INTO public.profiles (id, institute_id, full_name, role) VALUES (v_admin_a, v_inst_a, 'Adam Admin', 'admin');
    INSERT INTO public.profiles (id, institute_id, full_name, role) VALUES (v_teacher_a, v_inst_a, 'Bob Teacher A', 'teacher');
    INSERT INTO public.profiles (id, institute_id, full_name, role) VALUES (v_teacher_b, v_inst_b, 'Charlie Teacher B', 'teacher');

    -- Folders
    INSERT INTO public.bank_folders (id, institute_id, name, created_by) VALUES (v_folder_a, v_inst_a, 'Math Grade 10', v_teacher_a);
    INSERT INTO public.bank_folders (id, institute_id, name, created_by) VALUES (v_folder_b, v_inst_b, 'Science Grade 10', v_teacher_b);

    -- Questions
    INSERT INTO public.question_bank (id, institute_id, folder_id, prompt, type, subject, class_name, topic, difficulty, created_by)
    VALUES (gen_random_uuid(), v_inst_a, v_folder_a, 'Question Alpha 1', 'mcq', 'Math', '10', 'Algebra', 'easy', v_teacher_a);

    INSERT INTO public.question_bank (id, institute_id, folder_id, prompt, type, subject, class_name, topic, difficulty, created_by)
    VALUES (gen_random_uuid(), v_inst_b, v_folder_b, 'Question Beta 1', 'mcq', 'Science', '10', 'Physics', 'medium', v_teacher_b);

    -- Papers & Child Tables
    INSERT INTO public.papers (id, institute_id, title, subject, class_name, exam_name, created_by, status)
    VALUES (v_paper_a, v_inst_a, 'Paper Alpha', 'Math', '10', 'Midterm', v_teacher_a, 'draft');

    INSERT INTO public.papers (id, institute_id, title, subject, class_name, exam_name, created_by, status)
    VALUES (v_paper_b, v_inst_b, 'Paper Beta', 'Science', '10', 'Final', v_teacher_b, 'ready');

    INSERT INTO public.exam_settings (paper_id, institute_id, institute_profile, exam_name, academic_session, class_name, subject, student_fields)
    VALUES (v_paper_a, v_inst_a, '{}'::jsonb, 'Midterm', '2026', '10', 'Math', '{}'::jsonb);

    INSERT INTO public.paper_contents (paper_id, institute_id, sections, total_calculated_marks, total_calculated_questions)
    VALUES (v_paper_a, v_inst_a, '[]'::jsonb, 100, 25);

    INSERT INTO public.visual_layouts (paper_id, institute_id, page_margins_mm, header_footer)
    VALUES (v_paper_a, v_inst_a, '{"top": 15, "bottom": 15, "left": 15, "right": 15}'::jsonb, '{}'::jsonb);

    -- Templates
    INSERT INTO public.templates (id, institute_id, name, subject, class_name, total_marks, settings, layout, created_by)
    VALUES (v_tmpl_a, v_inst_a, 'Alpha Template', 'Math', '10', 50, '{}'::jsonb, '{}'::jsonb, v_owner_a);

    -- Invitations
    INSERT INTO public.institute_invitations (id, institute_id, email, role, invite_code, invited_by, expires_at)
    VALUES (gen_random_uuid(), v_inst_a, 'invited_' || v_invited_valid || '@omega.edu', 'teacher', 'inv_valid_' || v_inst_a, v_owner_a, timezone('utc'::text, now()) + INTERVAL '7 days');

    INSERT INTO public.institute_invitations (id, institute_id, email, role, invite_code, invited_by, expires_at)
    VALUES (gen_random_uuid(), v_inst_a, 'expired_staff@omega.edu', 'teacher', 'inv_expired_' || v_inst_a, v_owner_a, timezone('utc'::text, now()) - INTERVAL '1 day');

    -- Storage Objects
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES (v_obj_a, 'exam-assets', 'diagrams/' || v_inst_a || '/diagram_a.png', v_teacher_a);

    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES (v_obj_b, 'exam-assets', 'diagrams/' || v_inst_b || '/diagram_b.png', v_teacher_b);
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: TEST CROSS-TENANT CRUD DENIALS (Teacher B against Institute A)
-- ----------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    v_inst_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_a');
    v_teacher_b UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'teacher_b');
    v_rows INT;
BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_teacher_b::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'teacher_b@rival.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teacher_b, 'role', 'authenticated', 'email', 'teacher_b@rival.edu')::text, true);

    -- 1. SELECT cross-tenant paper returns 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.papers WHERE institute_id = v_inst_a),
        'Cross-tenant papers are invisible'
    );

    -- 2. SELECT cross-tenant question returns 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.question_bank WHERE institute_id = v_inst_a),
        'Cross-tenant questions are invisible'
    );

    -- 3. SELECT cross-tenant folder returns 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.bank_folders WHERE institute_id = v_inst_a),
        'Cross-tenant folders are invisible'
    );

    -- 4. SELECT cross-tenant child tables return 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.exam_settings WHERE institute_id = v_inst_a),
        'Cross-tenant exam_settings are invisible'
    );
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.paper_contents WHERE institute_id = v_inst_a),
        'Cross-tenant paper_contents are invisible'
    );
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.visual_layouts WHERE institute_id = v_inst_a),
        'Cross-tenant visual_layouts are invisible'
    );

    -- 5. SELECT cross-tenant template returns 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.templates WHERE institute_id = v_inst_a),
        'Cross-tenant templates are invisible'
    );

    -- 6. SELECT cross-tenant profile returns 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.profiles WHERE institute_id = v_inst_a),
        'Cross-tenant profiles are invisible'
    );

    -- 7. SELECT cross-tenant invitation returns 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM public.institute_invitations WHERE institute_id = v_inst_a),
        'Cross-tenant invitations are invisible'
    );

    -- 8. INSERT into cross-tenant papers blocked by RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.papers (id, institute_id, title, subject, class_name, exam_name, created_by, status) VALUES (gen_random_uuid(), %L, ''Infiltrator Paper'', ''Math'', ''10'', ''Midterm'', %L, ''draft'')', v_inst_a, v_teacher_b),
        'violates row-level security policy',
        'Cross-tenant paper INSERT is blocked by RLS'
    );

    -- 9. INSERT into cross-tenant questions blocked by RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.question_bank (id, institute_id, prompt, type, subject, class_name, topic, difficulty, created_by) VALUES (gen_random_uuid(), %L, ''Rogue Question'', ''mcq'', ''Math'', ''10'', ''Alg'', ''easy'', %L)', v_inst_a, v_teacher_b),
        'violates row-level security policy',
        'Cross-tenant question INSERT is blocked by RLS'
    );

    -- 10. INSERT into cross-tenant folders blocked by RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.bank_folders (id, institute_id, name, created_by) VALUES (gen_random_uuid(), %L, ''Rogue Folder'', %L)', v_inst_a, v_teacher_b),
        'violates row-level security policy',
        'Cross-tenant folder INSERT is blocked by RLS'
    );

    -- 11. INSERT into cross-tenant child table blocked by RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.exam_settings (paper_id, institute_id, institute_profile, exam_name, academic_session, class_name, subject, student_fields) VALUES ((SELECT id FROM public.papers WHERE institute_id = %L LIMIT 1), %L, ''{}''::jsonb, ''Rogue'', ''2026'', ''10'', ''Math'', ''{}''::jsonb)', v_inst_a, v_inst_a),
        'violates row-level security policy',
        'Cross-tenant exam_settings INSERT is blocked by RLS'
    );

    -- 12. UPDATE cross-tenant paper affects 0 rows
    UPDATE public.papers SET title = 'Hacked' WHERE institute_id = v_inst_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant paper UPDATE affects zero rows');

    -- 13. UPDATE cross-tenant question affects 0 rows
    UPDATE public.question_bank SET prompt = 'Hacked' WHERE institute_id = v_inst_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant question UPDATE affects zero rows');

    -- 14. UPDATE cross-tenant folder affects 0 rows
    UPDATE public.bank_folders SET name = 'Hacked' WHERE institute_id = v_inst_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant folder UPDATE affects zero rows');

    -- 15. DELETE cross-tenant paper affects 0 rows
    DELETE FROM public.papers WHERE institute_id = v_inst_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant paper DELETE affects zero rows');

    -- 16. DELETE cross-tenant question affects 0 rows
    DELETE FROM public.question_bank WHERE institute_id = v_inst_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant question DELETE affects zero rows');

    -- 17. DELETE cross-tenant folder affects 0 rows
    DELETE FROM public.bank_folders WHERE institute_id = v_inst_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant folder DELETE affects zero rows');
END $$;

ROLLBACK;

-- ----------------------------------------------------------------------------
-- STEP 3: TEST COMPOSITE FOREIGN KEY ISOLATION & HIERARCHY INTEGRITY
-- ----------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE
    v_inst_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_a');
    v_inst_b UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_b');
    v_folder_b UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'folder_b');
    v_paper_b UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'paper_b');
BEGIN
    -- 18. Cross-institute folder nesting blocked by composite FK
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.bank_folders (id, institute_id, name, parent_id) VALUES (gen_random_uuid(), %L, ''Cross Folder'', %L)', v_inst_a, v_folder_b),
        'violates foreign key constraint "fk_bank_folders_parent_inst"',
        'Cross-institute folder parenting is blocked by composite FK'
    );

    -- 19. Cross-institute question folder assignment blocked by composite FK
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.question_bank (id, institute_id, folder_id, prompt, type, subject, class_name, topic, difficulty) VALUES (gen_random_uuid(), %L, %L, ''Cross Question'', ''mcq'', ''Math'', ''10'', ''Alg'', ''easy'')', v_inst_a, v_folder_b),
        'violates foreign key constraint "fk_question_folder_inst"',
        'Cross-institute question-folder link is blocked by composite FK'
    );

    -- 20. Cross-institute child table paper assignment blocked by composite FK
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.exam_settings (paper_id, institute_id, institute_profile, exam_name, academic_session, class_name, subject, student_fields) VALUES (%L, %L, ''{}''::jsonb, ''Midterm'', ''2026'', ''10'', ''Math'', ''{}''::jsonb)', v_paper_b, v_inst_a),
        'violates foreign key constraint "fk_settings_paper_inst"',
        'Cross-institute exam_settings paper link is blocked by composite FK'
    );
END $$;
ROLLBACK;

-- ----------------------------------------------------------------------------
-- STEP 4: TEST PRIVILEGE ESCALATION, PROFILE IMMUTABILITY & ONBOARDING
-- ----------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    v_inst_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_a');
    v_inst_b UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_b');
    v_owner_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'owner_a');
    v_admin_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'admin_a');
    v_teacher_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'teacher_a');
    v_rows INT;
BEGIN
    -- Test as Teacher A
    PERFORM set_config('request.jwt.claim.sub', v_teacher_a::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'teacher_a@omega.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teacher_a, 'role', 'authenticated', 'email', 'teacher_a@omega.edu')::text, true);

    -- 21. Self-role elevation to owner blocked by trigger
    PERFORM pg_temp.assert_fails_with(
        format('UPDATE public.profiles SET role = ''owner'' WHERE id = %L', v_teacher_a),
        'Permission denied: Only institute owners can modify roles',
        'Teacher self-role elevation to owner is blocked by trigger'
    );

    -- 22. Self-role elevation to admin blocked by trigger
    PERFORM pg_temp.assert_fails_with(
        format('UPDATE public.profiles SET role = ''admin'' WHERE id = %L', v_teacher_a),
        'Permission denied: Only institute owners can modify roles',
        'Teacher self-role elevation to admin is blocked by trigger'
    );

    -- 23. Institute switching / cross-tenant leap blocked by trigger
    PERFORM pg_temp.assert_fails_with(
        format('UPDATE public.profiles SET institute_id = %L WHERE id = %L', v_inst_b, v_teacher_a),
        'Modifying institute_id is strictly forbidden',
        'Institute switching is blocked by trigger'
    );

    -- 24. Modifying another colleague profile affects 0 rows (blocked by RLS)
    UPDATE public.profiles SET full_name = 'Hacked Name' WHERE id = v_owner_a;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Teacher modifying another member profile affects zero rows');

    -- 25. Teacher attempting to issue invitation blocked by RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.institute_invitations (institute_id, email, role, invited_by) VALUES (%L, ''victim@omega.edu'', ''teacher'', %L)', v_inst_a, v_teacher_a),
        'violates row-level security policy',
        'Teacher issuing invitation is blocked by RLS'
    );

    -- 26. Teacher attempting to bootstrap first owner blocked (system already initialized / profile exists)
    PERFORM pg_temp.assert_fails_with(
        'SELECT public.bootstrap_first_owner(''Imposter'', ''Rogue Institute'')',
        'You already have an active profile',
        'Active member bootstrapping first owner is rejected'
    );

    -- Test as Admin A
    PERFORM set_config('request.jwt.claim.sub', v_admin_a::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'admin_a@omega.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a, 'role', 'authenticated', 'email', 'admin_a@omega.edu')::text, true);

    -- 27. Admin attempting to issue invitation for admin role blocked by RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.institute_invitations (institute_id, email, role, invited_by) VALUES (%L, ''admin2@omega.edu'', ''admin'', %L)', v_inst_a, v_admin_a),
        'violates row-level security policy',
        'Admin issuing invitation for admin role is blocked by RLS'
    );

    -- 28. Admin attempting to issue invitation for owner role blocked by RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.institute_invitations (institute_id, email, role, invited_by) VALUES (%L, ''owner2@omega.edu'', ''owner'', %L)', v_inst_a, v_admin_a),
        'violates row-level security policy',
        'Admin issuing invitation for owner role is blocked by RLS'
    );
END $$;

ROLLBACK;

-- ----------------------------------------------------------------------------
-- STEP 5: TEST INVITATION LIFECYCLE & REDEMPTION
-- ----------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    v_inst_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_a');
    v_teacher_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'teacher_a');
    v_unattached_mismatch UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'unattached_mismatch');
    v_invited_valid UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'invited_valid');
    v_accept_res JSONB;
BEGIN
    -- 29. Existing member attempting to redeem invitation is rejected
    PERFORM set_config('request.jwt.claim.sub', v_teacher_a::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'teacher_a@omega.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teacher_a, 'role', 'authenticated', 'email', 'teacher_a@omega.edu')::text, true);

    PERFORM pg_temp.assert_fails_with(
        format('SELECT public.accept_invitation(''inv_valid_%s'', ''Teacher Bob'')', v_inst_a),
        'User already belongs to an organization',
        'Existing member redeeming invitation is rejected'
    );

    -- 30. Unattached user with mismatched email attempting to redeem is rejected
    PERFORM set_config('request.jwt.claim.sub', v_unattached_mismatch::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'mallory_' || v_unattached_mismatch || '@hacker.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_unattached_mismatch, 'role', 'authenticated', 'email', 'mallory_' || v_unattached_mismatch || '@hacker.edu')::text, true);

    PERFORM pg_temp.assert_fails_with(
        format('SELECT public.accept_invitation(''inv_valid_%s'', ''Mallory Hacker'')', v_inst_a),
        'cannot be redeemed by',
        'Redeeming invitation with mismatched email is rejected'
    );

    -- 31. Unattached user attempting to redeem expired invitation is rejected
    PERFORM set_config('request.jwt.claim.sub', v_invited_valid::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'invited_' || v_invited_valid || '@omega.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_invited_valid, 'role', 'authenticated', 'email', 'invited_' || v_invited_valid || '@omega.edu')::text, true);

    PERFORM pg_temp.assert_fails_with(
        format('SELECT public.accept_invitation(''inv_expired_%s'', ''David Invited'')', v_inst_a),
        'Invalid, expired, or revoked invitation code',
        'Redeeming expired invitation is rejected'
    );

    -- 32. Authorized user with matching email redeems valid invitation -> SUCCEEDS
    SELECT public.accept_invitation('inv_valid_' || v_inst_a, 'David Invited') INTO v_accept_res;
    PERFORM pg_temp.assert(
        (v_accept_res->>'success')::boolean = true AND (v_accept_res->>'role') = 'teacher',
        'Valid invitation redemption succeeds and assigns teacher role'
    );

    -- Verify profile was created
    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM public.profiles WHERE id = v_invited_valid AND institute_id = v_inst_a AND role = 'teacher'),
        'Accepted invitation created valid profile record'
    );

    -- 33. Token reuse / double claiming rejected
    PERFORM pg_temp.assert_fails_with(
        format('SELECT public.accept_invitation(''inv_valid_%s'', ''David Again'')', v_inst_a),
        'User already belongs to an organization',
        'Re-redeeming already claimed invitation is rejected'
    );
END $$;

ROLLBACK;

-- ----------------------------------------------------------------------------
-- STEP 6: TEST STORAGE RLS (CROSS-TENANT & OWN-TENANT CRUD)
-- ----------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    v_inst_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_a');
    v_inst_b UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_b');
    v_teacher_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'teacher_a');
    v_teacher_b UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'teacher_b');
    v_new_obj_id UUID := gen_random_uuid();
    v_rows INT;
BEGIN
    -- --- TEST AS TEACHER B (Cross-Tenant Denials) ---
    PERFORM set_config('request.jwt.claim.sub', v_teacher_b::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'teacher_b@rival.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teacher_b, 'role', 'authenticated', 'email', 'teacher_b@rival.edu')::text, true);

    -- 34. Storage SELECT cross-tenant returns 0 rows
    PERFORM pg_temp.assert(
        NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'exam-assets' AND name LIKE 'diagrams/' || v_inst_a || '/%'),
        'Cross-tenant storage object is invisible in storage.objects'
    );

    -- 35. Storage INSERT cross-tenant blocked by Storage RLS
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES (gen_random_uuid(), ''exam-assets'', ''diagrams/%s/hack.png'', %L)', v_inst_a, v_teacher_b),
        'violates row-level security policy',
        'Cross-tenant Storage INSERT is blocked by Storage RLS'
    );

    -- 36. Storage UPDATE cross-tenant affects 0 rows
    UPDATE storage.objects SET metadata = '{"compromised": true}'::jsonb WHERE bucket_id = 'exam-assets' AND name LIKE 'diagrams/' || v_inst_a || '/%';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant Storage UPDATE affects zero rows');

    -- 37. Storage DELETE cross-tenant affects 0 rows
    DELETE FROM storage.objects WHERE bucket_id = 'exam-assets' AND name LIKE 'diagrams/' || v_inst_a || '/%';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 0, 'Cross-tenant Storage DELETE affects zero rows');

    -- --- TEST AS TEACHER A (Own-Tenant Authorizations) ---
    PERFORM set_config('request.jwt.claim.sub', v_teacher_a::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'teacher_a@omega.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teacher_a, 'role', 'authenticated', 'email', 'teacher_a@omega.edu')::text, true);

    -- 38. Own-tenant storage object is visible
    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'exam-assets' AND name LIKE 'diagrams/' || v_inst_a || '/%'),
        'Own-tenant storage object is visible to Teacher A'
    );

    -- 39. Own-tenant Storage INSERT succeeds
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES (v_new_obj_id, 'exam-assets', 'diagrams/' || v_inst_a || '/teacher_upload.png', v_teacher_a);

    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM storage.objects WHERE id = v_new_obj_id),
        'Own-tenant Storage INSERT succeeds'
    );

    -- 40. Own-tenant Storage UPDATE succeeds
    UPDATE storage.objects 
    SET metadata = '{"verified": true}'::jsonb 
    WHERE id = v_new_obj_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 1, 'Own-tenant Storage UPDATE affects 1 row');

    -- 41. Own-tenant Storage DELETE succeeds
    DELETE FROM storage.objects WHERE id = v_new_obj_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 1, 'Own-tenant Storage DELETE affects 1 row');
END $$;

ROLLBACK;

-- ----------------------------------------------------------------------------
-- STEP 7: TEST OWN-TENANT AUTHORIZED CRUD OPERATIONS (Positive Verification)
-- ----------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    v_inst_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'inst_a');
    v_owner_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'owner_a');
    v_admin_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'admin_a');
    v_teacher_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'teacher_a');
    v_paper_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'paper_a');
    v_folder_a UUID := (SELECT entity_id FROM pg_temp.test_registry WHERE entity_name = 'folder_a');
    v_new_question_id UUID := gen_random_uuid();
    v_new_paper_id UUID := gen_random_uuid();
    v_new_tmpl_id UUID := gen_random_uuid();
    v_rows INT;
BEGIN
    -- --- 1. Teacher A Operations ---
    PERFORM set_config('request.jwt.claim.sub', v_teacher_a::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'teacher_a@omega.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teacher_a, 'role', 'authenticated', 'email', 'teacher_a@omega.edu')::text, true);

    -- 42. Own paper is visible to Teacher A
    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM public.papers WHERE id = v_paper_a),
        'Own paper is visible to Teacher A'
    );

    -- 43. Teacher A can INSERT new question
    INSERT INTO public.question_bank (id, institute_id, folder_id, prompt, type, subject, class_name, topic, difficulty, created_by)
    VALUES (v_new_question_id, v_inst_a, v_folder_a, 'Authorized Teacher Question', 'short_answer', 'Math', '10', 'Algebra', 'easy', v_teacher_a);

    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM public.question_bank WHERE id = v_new_question_id),
        'Teacher A successfully inserts question into question_bank'
    );

    -- 44. Teacher A can UPDATE own question
    UPDATE public.question_bank SET prompt = 'Updated Prompt' WHERE id = v_new_question_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 1, 'Teacher A successfully updates own question');

    -- 45. Teacher A can DELETE own question
    DELETE FROM public.question_bank WHERE id = v_new_question_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 1, 'Teacher A successfully deletes own question');

    -- 46. Teacher A can INSERT draft paper
    INSERT INTO public.papers (id, institute_id, title, subject, class_name, exam_name, created_by, status)
    VALUES (v_new_paper_id, v_inst_a, 'Teacher Exam Paper', 'Math', '10', 'Unit 1', v_teacher_a, 'draft');

    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM public.papers WHERE id = v_new_paper_id),
        'Teacher A successfully creates new paper'
    );

    -- 47. Teacher A can UPDATE own paper
    UPDATE public.papers SET title = 'Teacher Exam Paper V2' WHERE id = v_new_paper_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 1, 'Teacher A successfully updates own paper');

    -- 48. Teacher A CANNOT insert template (Owner/Admin restricted)
    PERFORM pg_temp.assert_fails_with(
        format('INSERT INTO public.templates (id, institute_id, name, subject, class_name, total_marks, settings, layout, created_by) VALUES (gen_random_uuid(), %L, ''Rogue Template'', ''Math'', ''10'', 50, ''{}''::jsonb, ''{}''::jsonb, %L)', v_inst_a, v_teacher_a),
        'violates row-level security policy',
        'Teacher inserting template is blocked by RLS'
    );

    -- --- 2. Admin A Operations ---
    PERFORM set_config('request.jwt.claim.sub', v_admin_a::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.email', 'admin_a@omega.edu', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a, 'role', 'authenticated', 'email', 'admin_a@omega.edu')::text, true);

    -- 49. Admin A can insert template
    INSERT INTO public.templates (id, institute_id, name, subject, class_name, total_marks, settings, layout, created_by)
    VALUES (v_new_tmpl_id, v_inst_a, 'Admin Template', 'Math', '10', 100, '{}'::jsonb, '{}'::jsonb, v_admin_a);

    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM public.templates WHERE id = v_new_tmpl_id),
        'Admin A successfully inserts template'
    );

    -- 50. Admin A can UPDATE template
    UPDATE public.templates SET name = 'Admin Template Updated' WHERE id = v_new_tmpl_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 1, 'Admin A successfully updates template');

    -- 51. Admin A can DELETE template
    DELETE FROM public.templates WHERE id = v_new_tmpl_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    PERFORM pg_temp.assert(v_rows = 1, 'Admin A successfully deletes template');

    -- 52. Admin A can issue teacher invitation
    INSERT INTO public.institute_invitations (institute_id, email, role, invited_by)
    VALUES (v_inst_a, 'new_math_teacher@omega.edu', 'teacher', v_admin_a);

    PERFORM pg_temp.assert(
        EXISTS (SELECT 1 FROM public.institute_invitations WHERE email = 'new_math_teacher@omega.edu'),
        'Admin A successfully issues teacher invitation'
    );
END $$;

ROLLBACK;

-- ----------------------------------------------------------------------------
-- STEP 8: TEARDOWN TEST FIXTURES & REPORT (Runs as postgres superuser)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    DELETE FROM storage.objects WHERE id IN (SELECT entity_id FROM pg_temp.test_registry WHERE entity_type = 'storage');
    DELETE FROM public.institutes WHERE id IN (SELECT entity_id FROM pg_temp.test_registry WHERE entity_type = 'institute');
    DELETE FROM auth.users WHERE id IN (SELECT entity_id FROM pg_temp.test_registry WHERE entity_type = 'user');

    DROP TABLE IF EXISTS pg_temp.test_registry;
    DROP FUNCTION IF EXISTS pg_temp.assert(BOOLEAN, TEXT);
    DROP FUNCTION IF EXISTS pg_temp.assert_fails_with(TEXT, TEXT, TEXT);

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'SUCCESS: ALL 52 SECURITY AND ACCESS ASSERTIONS PASSED';
    RAISE NOTICE '=======================================================';
END $$;