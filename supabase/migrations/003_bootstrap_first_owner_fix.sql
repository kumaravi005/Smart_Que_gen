-- ============================================================================
-- OMEGA QUESTION PAPER GENERATOR: MIGRATION 003
-- Fix bootstrap_first_owner parameter signature, schema cache visibility,
-- and first-owner-only atomic locking
-- ============================================================================

BEGIN;

-- 1. DROP PREVIOUS SIGNATURES SAFELY
DROP FUNCTION IF EXISTS public.bootstrap_first_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.bootstrap_first_owner(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.bootstrap_first_owner();

-- 2. CREATE FUNCTION WITH CONSISTENT ALPHABETICAL PARAMETERS
-- All parameters use DEFAULT NULL so that named and positional argument matching
-- in PostgREST is 100% deterministic, without losing any institute metadata fields.
CREATE OR REPLACE FUNCTION public.bootstrap_first_owner(
    p_address TEXT DEFAULT NULL,
    p_affiliation TEXT DEFAULT NULL,
    p_contact TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_institute_name TEXT DEFAULT NULL,
    p_tagline TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    new_institute_id UUID;
    existing_owner_count INT;
    existing_institute_count INT;
    existing_profile_count INT;
    caller_id UUID;
BEGIN
    -- Resolve authenticated caller ID
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: You must be signed in with an administrator account to initialize the coaching center profile.';
    END IF;

    -- Transaction-level advisory lock to prevent concurrent first-owner creation race conditions
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('omega_first_owner_lock'));

    -- Check if caller already belongs to an institute
    SELECT pg_catalog.count(*) INTO existing_profile_count FROM public.profiles WHERE id = caller_id;
    IF existing_profile_count > 0 THEN
        RAISE EXCEPTION 'You already have an active profile.';
    END IF;

    -- Validate required parameters
    IF p_full_name IS NULL OR pg_catalog.btrim(p_full_name) = '' THEN
        RAISE EXCEPTION 'Full name is required.';
    END IF;

    IF p_institute_name IS NULL OR pg_catalog.btrim(p_institute_name) = '' THEN
        RAISE EXCEPTION 'Institute / Coaching Center name is required.';
    END IF;

    -- First-Owner-Only Guard: Verify the system has zero institutes and zero owners
    SELECT pg_catalog.count(*) INTO existing_institute_count FROM public.institutes;
    SELECT pg_catalog.count(*) INTO existing_owner_count FROM public.profiles WHERE role = 'owner'::public.user_role;
    IF existing_institute_count > 0 OR existing_owner_count > 0 THEN
        RAISE EXCEPTION 'System already initialized. An administrator has already been registered for this center.';
    END IF;

    -- Create Institute record
    INSERT INTO public.institutes (name, tagline, affiliation, address, contact)
    VALUES (
        pg_catalog.btrim(p_institute_name),
        NULLIF(pg_catalog.btrim(p_tagline), ''),
        NULLIF(pg_catalog.btrim(p_affiliation), ''),
        NULLIF(pg_catalog.btrim(p_address), ''),
        NULLIF(pg_catalog.btrim(p_contact), '')
    )
    RETURNING id INTO new_institute_id;

    -- Create Root Owner Profile
    INSERT INTO public.profiles (id, institute_id, full_name, role)
    VALUES (caller_id, new_institute_id, pg_catalog.btrim(p_full_name), 'owner'::public.user_role);

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'institute_id', new_institute_id,
        'role', 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. FUNCTION OWNERSHIP AND SECURITY GRANTS
ALTER FUNCTION public.bootstrap_first_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;

-- Restrict execution to authenticated users only. Unauthenticated callers are blocked
-- by PostgREST and cannot invoke this function without an active session.
REVOKE ALL ON FUNCTION public.bootstrap_first_owner(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.bootstrap_first_owner(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
-- Notify PostgREST to immediately rebuild its OpenAPI schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
