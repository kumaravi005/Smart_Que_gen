import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../services/supabaseClient'
import type { UserProfile, Institute, UserRole } from '../types/auth'

export interface BootstrapOwnerParams {
  fullName: string
  instituteName: string
  tagline?: string
  affiliation?: string
  address?: string
  contact?: string
}

export interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  institute: Institute | null
  role: UserRole | null
  isAdmin: boolean
  isOwner: boolean
  isLoading: boolean
  isAuthenticated: boolean
  isConfigured: boolean
  needsSetup: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsSetup?: boolean }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  bootstrapFirstOwner: (params: BootstrapOwnerParams) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [institute, setInstitute] = useState<Institute | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const CACHE_PROFILE_KEY = (uid: string) => `omega_auth_profile_${uid}`
  const CACHE_INSTITUTE_KEY = (iid: string) => `omega_auth_institute_${iid}`

  const fetchProfileAndInstitute = useCallback(async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    if (!supabase) return null

    try {
      // 1. Fetch user's profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profErr) {
        console.warn('Could not retrieve user profile:', profErr.message)

        // Offline / Network fallback: recover cached profile if offline
        const cachedProfStr = localStorage.getItem(CACHE_PROFILE_KEY(userId))
        if (cachedProfStr) {
          try {
            const cachedProf = JSON.parse(cachedProfStr) as UserProfile
            setProfile(cachedProf)
            if (cachedProf.institute_id) {
              const cachedInstStr = localStorage.getItem(CACHE_INSTITUTE_KEY(cachedProf.institute_id))
              if (cachedInstStr) {
                setInstitute(JSON.parse(cachedInstStr) as Institute)
              }
            }
            return cachedProf
          } catch {
            // ignore cache parse failure
          }
        }

        setProfile(null)
        setInstitute(null)
        return null
      }

      if (prof) {
        const enrichedProfile: UserProfile = {
          ...prof,
          email: userEmail || prof.email
        }
        setProfile(enrichedProfile)
        try {
          localStorage.setItem(CACHE_PROFILE_KEY(userId), JSON.stringify(enrichedProfile))
        } catch {
          // ignore localStorage quota error
        }

        // 2. Fetch associated institute record
        if (prof.institute_id) {
          const { data: inst, error: instErr } = await supabase
            .from('institutes')
            .select('*')
            .eq('id', prof.institute_id)
            .maybeSingle()

          if (!instErr && inst) {
            setInstitute(inst as Institute)
            try {
              localStorage.setItem(CACHE_INSTITUTE_KEY(prof.institute_id), JSON.stringify(inst))
            } catch {
              // ignore localStorage quota error
            }
          }
        }
        return enrichedProfile
      } else {
        // Authenticated user has no profile row yet (first-time setup required)
        localStorage.removeItem(CACHE_PROFILE_KEY(userId))
        setProfile(null)
        setInstitute(null)
        return null
      }
    } catch (err) {
      console.error('Error fetching profile and institute:', err)

      // Offline / Network fallback: recover cached profile
      const cachedProfStr = localStorage.getItem(CACHE_PROFILE_KEY(userId))
      if (cachedProfStr) {
        try {
          const cachedProf = JSON.parse(cachedProfStr) as UserProfile
          setProfile(cachedProf)
          if (cachedProf.institute_id) {
            const cachedInstStr = localStorage.getItem(CACHE_INSTITUTE_KEY(cachedProf.institute_id))
            if (cachedInstStr) {
              setInstitute(JSON.parse(cachedInstStr) as Institute)
            }
          }
          return cachedProf
        } catch {
          // ignore cache parse failure
        }
      }

      setProfile(null)
      setInstitute(null)
      return null
    }
  }, [])

  // Initialize and listen for auth state changes
  useEffect(() => {
    const client = supabase
    if (!isSupabaseConfigured || !client) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await client.auth.getSession()
        if (error) {
          console.warn('Session retrieval error:', error.message)
        }

        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession)
            setUser(initialSession.user)
            await fetchProfileAndInstitute(initialSession.user.id, initialSession.user.email)
          } else {
            setSession(null)
            setUser(null)
            setProfile(null)
            setInstitute(null)
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)
          await fetchProfileAndInstitute(newSession.user.id, newSession.user.email)
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setProfile(null)
        setInstitute(null)
      }
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfileAndInstitute])

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string; needsSetup?: boolean }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, error: 'Supabase cloud configuration is not available in this environment.' }
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        })

        if (error) {
          return { success: false, error: error.message }
        }

        if (data.user) {
          setSession(data.session)
          setUser(data.user)
          const loadedProfile = await fetchProfileAndInstitute(data.user.id, data.user.email)
          return { success: true, needsSetup: !loadedProfile }
        }

        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message || 'Authentication failed' }
      }
    },
    [fetchProfileAndInstitute]
  )

  const logout = useCallback(async (): Promise<void> => {
    if (!supabase) return
    try {
      if (user) {
        localStorage.removeItem(`omega_auth_profile_${user.id}`)
      }
      if (profile?.institute_id) {
        localStorage.removeItem(`omega_auth_institute_${profile.institute_id}`)
      }
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Sign-out error:', err)
    } finally {
      setSession(null)
      setUser(null)
      setProfile(null)
      setInstitute(null)
    }
  }, [user, profile])

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (user) {
      await fetchProfileAndInstitute(user.id, user.email)
    }
  }, [user, fetchProfileAndInstitute])

  const bootstrapFirstOwner = useCallback(
    async (params: BootstrapOwnerParams): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, error: 'Supabase is not configured.' }
      }

      try {
        const { error } = await supabase.rpc('bootstrap_first_owner', {
          p_address: params.address?.trim() || null,
          p_affiliation: params.affiliation?.trim() || null,
          p_contact: params.contact?.trim() || null,
          p_full_name: params.fullName.trim(),
          p_institute_name: params.instituteName.trim(),
          p_tagline: params.tagline?.trim() || null
        })

        if (error) {
          return { success: false, error: error.message }
        }

        if (user) {
          await fetchProfileAndInstitute(user.id, user.email)
        }

        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message || 'Bootstrap initialization failed' }
      }
    },
    [user, fetchProfileAndInstitute]
  )

  const role = profile?.role ?? null
  const isOwner = role === 'owner'
  const isAdmin = role === 'owner' || role === 'admin'
  const isAuthenticated = !!user
  const needsSetup = !!user && !profile && !isLoading

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      institute,
      role,
      isAdmin,
      isOwner,
      isLoading,
      isAuthenticated,
      isConfigured: isSupabaseConfigured,
      needsSetup,
      login,
      logout,
      refreshProfile,
      bootstrapFirstOwner
    }),
    [
      user,
      session,
      profile,
      institute,
      role,
      isAdmin,
      isOwner,
      isLoading,
      isAuthenticated,
      needsSetup,
      login,
      logout,
      refreshProfile,
      bootstrapFirstOwner
    ]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
