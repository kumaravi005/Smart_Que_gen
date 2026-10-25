import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase environment keys' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Verify caller session token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const {
      data: { user: callerUser },
      error: userError
    } = await callerClient.auth.getUser()

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Look up caller profile to enforce admin/owner role and retrieve institute_id
    const { data: callerProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('id, institute_id, role, full_name')
      .eq('id', callerUser.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Caller profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (callerProfile.role !== 'owner' && callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: Only institute owners or administrators can manage teacher accounts'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Initialize Admin Client with service_role key (server-side only)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { action } = body

    // Action 1: Create teacher / member account
    if (action === 'create_teacher' || action === 'create_user') {
      const { email, password, full_name, role } = body

      if (!email || !password || !full_name) {
        return new Response(
          JSON.stringify({ error: 'Email, password, and full name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters long' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const assignedRole = role === 'admin' ? 'admin' : 'teacher'

      // Restrict admin role assignment: only owner can create another admin
      if (assignedRole === 'admin' && callerProfile.role !== 'owner') {
        return new Response(
          JSON.stringify({ error: 'Permission denied: Only institute owners can provision administrator accounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() }
      })

      if (authError || !authData.user) {
        return new Response(
          JSON.stringify({ error: authError?.message || 'Failed to create user account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert profile bound to caller's institute_id
      const { data: newProfile, error: profileInsertError } = await adminClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          institute_id: callerProfile.institute_id,
          full_name: full_name.trim(),
          role: assignedRole
        })
        .select()
        .single()

      if (profileInsertError) {
        // Rollback created auth user if profile insertion failed
        await adminClient.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: `Failed to create profile: ${profileInsertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Account for ${full_name} (${assignedRole}) created successfully.`,
          user: {
            ...newProfile,
            email: authData.user.email
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action 2: Revoke / delete teacher account
    if (action === 'delete_teacher' || action === 'revoke_user') {
      const { user_id } = body

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (user_id === callerUser.id) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete your own account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify target user belongs to same institute
      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('id, institute_id, role, full_name')
        .eq('id', user_id)
        .single()

      if (targetError || !targetProfile) {
        return new Response(
          JSON.stringify({ error: 'Target member profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (targetProfile.institute_id !== callerProfile.institute_id) {
        return new Response(
          JSON.stringify({ error: 'Cross-institute member deletion is strictly forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (targetProfile.role === 'owner') {
        return new Response(
          JSON.stringify({ error: 'Institute owner accounts cannot be deleted through this interface' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete from Auth (cascades to profiles via foreign key)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Account for ${targetProfile.full_name} has been revoked and removed.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action 3: Reset password for a teacher
    if (action === 'reset_password') {
      const { user_id, new_password } = body

      if (!user_id || !new_password || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Valid user_id and new_password (min 6 chars) are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify target user belongs to same institute
      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('id, institute_id, role, full_name')
        .eq('id', user_id)
        .single()

      if (!targetProfile || targetProfile.institute_id !== callerProfile.institute_id) {
        return new Response(
          JSON.stringify({ error: 'Target member not found in your institute' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password
      })

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Password updated successfully for ${targetProfile.full_name}.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: "${action}"` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
