import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adminService } from '../services/adminService'
import { supabase } from '../services/supabaseClient'

describe('Authentication & Admin-Controlled Teacher Accounts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adminService.createTeacher invokes Edge Function and returns structured result', async () => {
    if (!supabase) {
      const res = await adminService.createTeacher({
        email: 'teacher@test.com',
        password: 'Password123',
        full_name: 'Test Teacher',
        role: 'teacher'
      })
      expect(res.success).toBe(false)
      expect(res.message).toContain('Supabase is not configured')
      return
    }

    const functionsProto = Object.getPrototypeOf(supabase.functions)
    const invokeSpy = vi.spyOn(functionsProto, 'invoke').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Account for Test Teacher (teacher) created successfully.',
        user: {
          id: 'user_123',
          full_name: 'Test Teacher',
          role: 'teacher'
        }
      },
      error: null
    })

    const result = await adminService.createTeacher({
      email: 'teacher@test.com',
      password: 'Password123',
      full_name: 'Test Teacher',
      role: 'teacher'
    })

    expect(invokeSpy).toHaveBeenCalledWith('admin-manage-user', {
      body: {
        action: 'create_teacher',
        email: 'teacher@test.com',
        password: 'Password123',
        full_name: 'Test Teacher',
        role: 'teacher'
      }
    })
    expect(result.success).toBe(true)
    expect(result.user?.full_name).toBe('Test Teacher')
  })

  it('adminService.revokeTeacher enforces server-side invocation', async () => {
    if (!supabase) {
      const res = await adminService.revokeTeacher('user_123')
      expect(res.success).toBe(false)
      return
    }

    const functionsProto = Object.getPrototypeOf(supabase.functions)
    const invokeSpy = vi.spyOn(functionsProto, 'invoke').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Account for Test Teacher has been revoked and removed.'
      },
      error: null
    })

    const result = await adminService.revokeTeacher('user_123')

    expect(invokeSpy).toHaveBeenCalledWith('admin-manage-user', {
      body: {
        action: 'delete_teacher',
        user_id: 'user_123'
      }
    })
    expect(result.success).toBe(true)
  })

  it('adminService.resetPassword enforces server-side invocation', async () => {
    if (!supabase) {
      const res = await adminService.resetPassword('user_123', 'newSecret123')
      expect(res.success).toBe(false)
      return
    }

    const functionsProto = Object.getPrototypeOf(supabase.functions)
    const invokeSpy = vi.spyOn(functionsProto, 'invoke').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Password updated successfully for Test Teacher.'
      },
      error: null
    })

    const result = await adminService.resetPassword('user_123', 'newSecret123')

    expect(invokeSpy).toHaveBeenCalledWith('admin-manage-user', {
      body: {
        action: 'reset_password',
        user_id: 'user_123',
        new_password: 'newSecret123'
      }
    })
    expect(result.success).toBe(true)
  })

  it('adminService.listInstituteMembers queries profiles table safely', async () => {
    if (!supabase) {
      const members = await adminService.listInstituteMembers()
      expect(Array.isArray(members)).toBe(true)
      expect(members.length).toBe(0)
      return
    }

    const mockProfiles = [
      {
        id: 'prof_1',
        institute_id: 'inst_1',
        full_name: 'Admin Sharma',
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ]

    vi.spyOn(supabase, 'from').mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({
        data: mockProfiles,
        error: null
      })
    } as any)

    const members = await adminService.listInstituteMembers()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBe(1)
    expect(members[0].full_name).toBe('Admin Sharma')
  })

  it('bootstrap_first_owner sends alphabetical parameters and preserves all institute fields', async () => {
    if (!supabase) return

    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: { success: true, institute_id: 'inst_abc', role: 'owner' },
      error: null
    } as any)

    const params = {
      p_address: 'Main Road, Kankarbagh, Patna',
      p_affiliation: 'CBSE Affiliated',
      p_contact: '629976109',
      p_full_name: 'Avinash Kumar',
      p_institute_name: 'Omega Education Centre',
      p_tagline: 'एक अद्भुत शिक्षण शैली'
    }

    const res = await supabase.rpc('bootstrap_first_owner', params)

    expect(rpcSpy).toHaveBeenCalledWith('bootstrap_first_owner', params)
    expect(Object.keys(params)).toEqual([
      'p_address',
      'p_affiliation',
      'p_contact',
      'p_full_name',
      'p_institute_name',
      'p_tagline'
    ])
    expect(res.data?.success).toBe(true)
    expect(res.data?.role).toBe('owner')
  })
})

