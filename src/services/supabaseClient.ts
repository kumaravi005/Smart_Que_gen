import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type SupabaseConnectionStatus =
  | 'connected'
  | 'unconfigured'
  | 'invalid_url'
  | 'unreachable'
  | 'auth_error'
  | 'tables_missing'
  | 'error'

export interface SupabaseConnectionResult {
  configured: boolean
  reachable: boolean
  status: SupabaseConnectionStatus
  message: string
  projectUrl?: string
  latencyMs?: number
  httpStatus?: number
  hasTables?: boolean
  errorDetails?: string
}

export interface SupabaseConfigStatus {
  isConfigured: boolean
  url: string | null
  hasAnonKey: boolean
  isPlaceholder: boolean
  keyType: 'publishable' | 'jwt' | 'unknown'
  missingKeys: string[]
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

/**
 * Checks if a string appears to be a default placeholder rather than a real value.
 */
function isPlaceholderValue(val: string): boolean {
  if (!val) return true
  const lower = val.toLowerCase()
  return (
    lower.includes('your-project-id') ||
    lower.includes('your-project') ||
    lower.includes('placeholder') ||
    lower.includes('your-anon-token') ||
    lower.includes('your-anon-or-publishable-key') ||
    lower.includes('your_supabase')
  )
}

/**
 * Validates a candidate Supabase URL format.
 */
function isValidHttpUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Identifies whether an API key is a new Supabase publishable key (sb_publishable_...)
 * or a legacy JWT-based anon key (eyJ...).
 */
export function getKeyType(key: string): 'publishable' | 'jwt' | 'unknown' {
  if (!key) return 'unknown'
  if (key.startsWith('sb_publishable_') || key.startsWith('sb_')) return 'publishable'
  if (key.startsWith('eyJ')) return 'jwt'
  return 'unknown'
}

// Cleaned URL without trailing slash
const sanitizedUrl = rawUrl.replace(/\/+$/, '')
const hasValidUrl = sanitizedUrl.length > 0 && isValidHttpUrl(sanitizedUrl) && !isPlaceholderValue(sanitizedUrl)
const hasValidKey = rawAnonKey.length > 0 && !isPlaceholderValue(rawAnonKey)

/**
 * True if both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present,
 * properly formatted, and non-placeholder values.
 */
export const isSupabaseConfigured = hasValidUrl && hasValidKey

export const supabaseUrl: string | null = hasValidUrl ? sanitizedUrl : null

/**
 * Global Supabase client instance.
 * Returns null if environment variables are not configured, preventing runtime
 * initialization crashes in offline or unconfigured environments.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(sanitizedUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

/**
 * Helper to get the active Supabase client or null.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase
}

/**
 * Inspects current configuration state synchronously.
 */
export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const missing: string[] = []
  if (!rawUrl || isPlaceholderValue(rawUrl)) missing.push('VITE_SUPABASE_URL')
  if (!rawAnonKey || isPlaceholderValue(rawAnonKey)) missing.push('VITE_SUPABASE_ANON_KEY')

  const isPlaceholder = isPlaceholderValue(rawUrl) || isPlaceholderValue(rawAnonKey)

  return {
    isConfigured: isSupabaseConfigured,
    url: sanitizedUrl || null,
    hasAnonKey: hasValidKey,
    isPlaceholder,
    keyType: getKeyType(rawAnonKey),
    missingKeys: missing
  }
}

/**
 * Performs a safe, non-destructive connection test against the configured Supabase instance.
 *
 * Supports both new-format Publishable Keys (`sb_publishable_...`) and legacy JWT keys (`eyJ...`).
 *
 * Checks:
 * 1. Configuration presence and URL validation
 * 2. Network reachability via Auth health endpoint with `apikey` header (never sends publishable keys as Bearer token)
 * 3. Anon / Publishable API key acceptance (detects HTTP 401 Unauthorized)
 * 4. Database schema verification (checks if Omega tables exist or if migrations are still needed)
 *
 * Will never throw uncaught exceptions or alter database state.
 */
export async function testSupabaseConnection(timeoutMs = 6000): Promise<SupabaseConnectionResult> {
  const config = getSupabaseConfigStatus()

  if (!config.isConfigured) {
    if (rawUrl && !isValidHttpUrl(sanitizedUrl)) {
      return {
        configured: false,
        reachable: false,
        status: 'invalid_url',
        message: `The provided VITE_SUPABASE_URL "${rawUrl}" is not a valid HTTP/HTTPS URL.`,
        projectUrl: rawUrl
      }
    }

    const missingNotice =
      config.missingKeys.length > 0
        ? `Missing or placeholder environment variables: ${config.missingKeys.join(', ')}.`
        : 'Supabase configuration is incomplete.'

    return {
      configured: false,
      reachable: false,
      status: 'unconfigured',
      message: `${missingNotice} Create a .env.local file based on .env.example with your real Supabase credentials.`,
      projectUrl: sanitizedUrl || undefined
    }
  }

  const client = supabase
  if (!client || !sanitizedUrl) {
    return {
      configured: false,
      reachable: false,
      status: 'unconfigured',
      message: 'Supabase client could not be initialized.',
      projectUrl: sanitizedUrl || undefined
    }
  }

  const startTime = performance.now()

  try {
    // Phase 1: Test basic HTTP reachability and API key acceptance via the Auth health endpoint
    // Using `apikey` header works for both new `sb_publishable_` keys and legacy JWT keys.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    if (typeof (timer as any).unref === 'function') (timer as any).unref()

    let healthResponse: Response
    try {
      healthResponse = await fetch(`${sanitizedUrl}/auth/v1/health`, {
        method: 'GET',
        headers: {
          apikey: rawAnonKey
        },
        signal: controller.signal
      })
    } finally {
      clearTimeout(timer)
    }

    const latencyMs = Math.round(performance.now() - startTime)

    if (healthResponse.status === 401 || healthResponse.status === 403) {
      return {
        configured: true,
        reachable: true,
        status: 'auth_error',
        httpStatus: healthResponse.status,
        latencyMs,
        projectUrl: sanitizedUrl,
        message: `Connected to Supabase project, but the API key was rejected (HTTP ${healthResponse.status}). Please verify VITE_SUPABASE_ANON_KEY in .env.local.`
      }
    }

    if (!healthResponse.ok && healthResponse.status !== 200 && healthResponse.status !== 204) {
      return {
        configured: true,
        reachable: true,
        status: 'error',
        httpStatus: healthResponse.status,
        latencyMs,
        projectUrl: sanitizedUrl,
        message: `Supabase API returned unexpected status HTTP ${healthResponse.status}.`
      }
    }

    // Phase 2: Verify if the Omega schema exists by querying 'institutes' table using the client
    try {
      const { error: queryError, status: queryStatus } = await client
        .from('institutes')
        .select('id', { count: 'exact', head: true })

      if (queryError) {
        const errorMsg = queryError.message || ''
        const isTableMissing =
          queryError.code === 'PGRST205' ||
          queryError.code === '42P01' ||
          errorMsg.toLowerCase().includes('relation "public.institutes" does not exist') ||
          errorMsg.toLowerCase().includes('relation "institutes" does not exist') ||
          errorMsg.toLowerCase().includes('could not find the table')

        if (isTableMissing) {
          return {
            configured: true,
            reachable: true,
            hasTables: false,
            status: 'tables_missing',
            httpStatus: queryStatus,
            latencyMs,
            projectUrl: sanitizedUrl,
            message:
              'Successfully connected to Supabase project, but the Omega database tables (001_initial_schema.sql) have not been created yet.'
          }
        }

        // Return error if unexpected failure
        return {
          configured: true,
          reachable: true,
          hasTables: false,
          status: 'error',
          httpStatus: queryStatus,
          latencyMs,
          projectUrl: sanitizedUrl,
          message: `Connected to Supabase, but received error when querying schema: ${queryError.message}`,
          errorDetails: queryError.message
        }
      }

      return {
        configured: true,
        reachable: true,
        hasTables: true,
        status: 'connected',
        httpStatus: queryStatus || 200,
        latencyMs,
        projectUrl: sanitizedUrl,
        message: 'Successfully connected to Supabase project. Omega schema is detected.'
      }
    } catch (schemaCheckErr: any) {
      return {
        configured: true,
        reachable: true,
        hasTables: false,
        status: 'connected',
        latencyMs,
        projectUrl: sanitizedUrl,
        message: 'Successfully reached Supabase project API endpoint.',
        errorDetails: schemaCheckErr?.message
      }
    }
  } catch (networkErr: any) {
    const latencyMs = Math.round(performance.now() - startTime)
    const isAbort = networkErr.name === 'AbortError'
    return {
      configured: true,
      reachable: false,
      status: 'unreachable',
      latencyMs,
      projectUrl: sanitizedUrl,
      message: isAbort
        ? `Connection to Supabase timed out after ${timeoutMs}ms. Please check your internet connection and project URL.`
        : `Could not reach Supabase at ${sanitizedUrl}. Network error: ${networkErr?.message || 'Failed to fetch'}.`,
      errorDetails: networkErr?.message
    }
  }
}
