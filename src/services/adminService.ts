import { supabase, isSupabaseConfigured } from './supabaseClient'
import type {
  UserProfile,
  AdminCreateTeacherPayload,
  AdminOperationResult
} from '../types/auth'

/**
 * Service for administrative member and teacher account management.
 * All sensitive account provisioning operations are delegated to the
 * secure server-side Supabase Edge Function ('admin-manage-user').
 */
export const adminService = {
  /**
   * Fetches all registered profiles for the current user's institute.
   * RLS policy 'Profiles: View colleagues' automatically limits this
   * to members sharing the caller's institute_id.
   */
  async listInstituteMembers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured || !supabase) {
      return []
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, institute_id, full_name, role, created_at, updated_at')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to list institute members:', error)
      throw new Error(error.message)
    }

    return (data as UserProfile[]) || []
  },

  /**
   * Provisions a new teacher or administrator account via the Edge Function.
   * Does NOT require or expose service-role keys in the client.
   */
  async createTeacher(payload: AdminCreateTeacherPayload): Promise<AdminOperationResult> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Supabase is not configured in this environment.'
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: 'create_teacher',
          email: payload.email,
          password: payload.password,
          full_name: payload.full_name,
          role: payload.role || 'teacher'
        }
      })

      if (error) {
        return {
          success: false,
          message: error.message || 'Failed to communicate with Edge Function.',
          error: error.message
        }
      }

      if (data?.error) {
        return {
          success: false,
          message: data.error,
          error: data.error
        }
      }

      return {
        success: true,
        message: data?.message || 'Teacher account created successfully.',
        user: data?.user
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error while contacting admin Edge Function.',
        error: err.message
      }
    }
  },

  /**
   * Revokes access and removes a teacher account via the Edge Function.
   */
  async revokeTeacher(userId: string): Promise<AdminOperationResult> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Supabase is not configured.'
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: 'delete_teacher',
          user_id: userId
        }
      })

      if (error) {
        return {
          success: false,
          message: error.message || 'Failed to revoke teacher account.',
          error: error.message
        }
      }

      if (data?.error) {
        return {
          success: false,
          message: data.error,
          error: data.error
        }
      }

      return {
        success: true,
        message: data?.message || 'Teacher access revoked successfully.'
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error while contacting Edge Function.',
        error: err.message
      }
    }
  },

  /**
   * Sets a temporary or reset password for an existing teacher account.
   */
  async resetPassword(userId: string, newPassword: string): Promise<AdminOperationResult> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Supabase is not configured.'
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: 'reset_password',
          user_id: userId,
          new_password: newPassword
        }
      })

      if (error) {
        return {
          success: false,
          message: error.message,
          error: error.message
        }
      }

      if (data?.error) {
        return {
          success: false,
          message: data.error,
          error: data.error
        }
      }

      return {
        success: true,
        message: data?.message || 'Password reset successfully.'
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message,
        error: err.message
      }
    }
  }
}
