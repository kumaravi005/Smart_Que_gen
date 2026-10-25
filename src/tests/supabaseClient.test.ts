import { describe, it, expect } from 'vitest'
import {
  isSupabaseConfigured,
  supabase,
  getSupabaseConfigStatus,
  testSupabaseConnection,
  getKeyType
} from '../services/supabaseClient'

describe('Supabase Client & Safe Connection Diagnostics', () => {
  it('correctly categorizes API key types without throwing', () => {
    expect(getKeyType('sb_publishable_12345abcdef')).toBe('publishable')
    expect(getKeyType('sb_temp_12345abcdef')).toBe('publishable')
    expect(getKeyType('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz')).toBe('jwt')
    expect(getKeyType('')).toBe('unknown')
  })

  it('inspects environment configuration structure gracefully', () => {
    const config = getSupabaseConfigStatus()
    expect(config).toBeDefined()
    expect(typeof config.isConfigured).toBe('boolean')
    expect(config.isConfigured).toBe(isSupabaseConfigured)
    expect(Array.isArray(config.missingKeys)).toBe(true)
    expect(['publishable', 'jwt', 'unknown']).toContain(config.keyType)

    if (config.isConfigured) {
      expect(supabase).not.toBeNull()
      expect(typeof config.url).toBe('string')
    } else {
      expect(supabase).toBeNull()
    }
  })

  it('testSupabaseConnection executes non-destructively and never throws', async () => {
    const result = await testSupabaseConnection(4000)
    expect(result).toBeDefined()
    expect(typeof result.configured).toBe('boolean')
    expect(typeof result.reachable).toBe('boolean')
    expect(typeof result.message).toBe('string')

    // If configured via .env.local, it should successfully reach the project
    if (result.configured) {
      expect(result.reachable).toBe(true)
      expect(['connected', 'tables_missing']).toContain(result.status)
      if (result.status === 'connected') {
        expect(result.hasTables).toBe(true)
      }
    } else {
      expect(result.status).toBe('unconfigured')
    }
  })
})
