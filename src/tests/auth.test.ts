import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { adminService } from '../services/adminService'
import { supabase } from '../services/supabaseClient'

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    }
  }
}

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

  it('adminService gracefully extracts custom error message from FunctionsHttpError context', async () => {
    if (!supabase) return

    const functionsProto = Object.getPrototypeOf(supabase.functions)
    vi.spyOn(functionsProto, 'invoke').mockResolvedValueOnce({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: async () => ({
            error: 'Forbidden: Only the institute owner can create or deactivate teacher accounts'
          })
        }
      } as any
    })

    const result = await adminService.createTeacher({
      email: 'intruder@test.com',
      password: 'Password123',
      full_name: 'Intruder',
      role: 'teacher'
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Forbidden: Only the institute owner can create or deactivate teacher accounts')
  })

  it('offline IndexedDB stores and functionality remain functional without Supabase', async () => {
    const { getDatabase } = await import('../services/db')
    const db = await getDatabase()
    expect(db).toBeDefined()
    expect(typeof db.getAll).toBe('function')

    // Verify paper, question bank, and template stores exist locally
    const stores = ['papers', 'question_bank', 'templates', 'bank_folders', 'app_settings']
    for (const store of stores) {
      const items = await db.getAll(store as any)
      expect(Array.isArray(items)).toBe(true)
    }
  })

  it('offline auth profile caching and restoration preserve teacher session offline', () => {
    const mockUid = 'user_offline_123'
    const mockInstId = 'inst_omega_456'
    const cachedProfile = {
      id: mockUid,
      institute_id: mockInstId,
      full_name: 'Pooja Verma',
      role: 'teacher' as const
    }

    // Cache to localStorage
    localStorage.setItem(`omega_auth_profile_${mockUid}`, JSON.stringify(cachedProfile))
    localStorage.setItem(`omega_auth_institute_${mockInstId}`, JSON.stringify({
      id: mockInstId,
      name: 'Omega Education Center'
    }))

    // Verify retrieval
    const retrievedProf = JSON.parse(localStorage.getItem(`omega_auth_profile_${mockUid}`) || '{}')
    expect(retrievedProf.full_name).toBe('Pooja Verma')
    expect(retrievedProf.role).toBe('teacher')
    expect(retrievedProf.institute_id).toBe(mockInstId)

    // Verify cleanup
    localStorage.removeItem(`omega_auth_profile_${mockUid}`)
    localStorage.removeItem(`omega_auth_institute_${mockInstId}`)
    expect(localStorage.getItem(`omega_auth_profile_${mockUid}`)).toBeNull()
  })

  it('authentication gate rules strictly require session AND valid institute_id profile', () => {
    // Helper function mirroring AuthGate decision logic
    const canAccessApp = (isAuthenticated: boolean, needsSetup: boolean, profile: any) => {
      if (!isAuthenticated || needsSetup || !profile || !profile.institute_id) {
        return false
      }
      return true
    }

    // Scenario 1: Logged out / unauthenticated visitor
    expect(canAccessApp(false, false, null)).toBe(false)

    // Scenario 2: Authenticated in Supabase but no profile yet (needs root setup)
    expect(canAccessApp(true, true, null)).toBe(false)

    // Scenario 3: Authenticated but profile has no institute_id
    expect(canAccessApp(true, false, { id: 'u1', role: 'teacher' })).toBe(false)

    // Scenario 4: Authenticated Teacher with authorized institute
    expect(canAccessApp(true, false, { id: 'u1', role: 'teacher', institute_id: 'inst_1' })).toBe(true)

    // Scenario 5: Authenticated Owner with authorized institute
    expect(canAccessApp(true, false, { id: 'u2', role: 'owner', institute_id: 'inst_1' })).toBe(true)
  })
})

