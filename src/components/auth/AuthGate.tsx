import React from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { AuthScreen } from './AuthScreen'

interface AuthGateProps {
  children: React.ReactNode
}

/**
 * Route protection gate that enforces private, institute-authenticated access.
 *
 * Rules:
 * 1. While resolving the Supabase session token: shows a branded loading indicator.
 * 2. If unauthenticated, or authenticated without an authorized institute profile:
 *    renders only the AuthScreen (login or owner-bootstrap).
 * 3. Never renders child routes (Dashboard, Question Bank, Papers, Settings) unless
 *    a valid Supabase session AND an authorized institute profile are present.
 */
export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { isAuthenticated, profile, needsSetup, isLoading } = useAuth()

  // 1. Session check in progress: Show branded loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFE600] flex flex-col items-center justify-center p-4">
        <div className="bg-white border-2 border-[#0055D4] rounded-3xl p-8 shadow-2xl shadow-blue-950/20 flex flex-col items-center gap-4 text-center max-w-sm w-full mx-4">
          <img
            src="/omega-logo.png"
            alt="Omega Education Centre"
            className="h-24 w-auto object-contain rounded-2xl animate-pulse drop-shadow-sm"
          />
          <div>
            <h1 className="text-lg font-extrabold text-[#0055D4]">Omega Education Centre</h1>
            <p className="text-xs text-emerald-700 font-semibold mt-0.5">एक अद्भुत शिक्षण शैली...</p>
            <p className="text-xs text-slate-500 mt-2">Verifying secure session...</p>
          </div>
          <Loader2 className="w-6 h-6 text-[#0055D4] animate-spin" />
        </div>
      </div>
    )
  }

  // 2. Unauthenticated OR Authenticated without an authorized institute profile
  // Block entire application and show only the AuthScreen
  if (!isAuthenticated || needsSetup || !profile || !profile.institute_id) {
    return <AuthScreen initialMode={needsSetup ? 'bootstrap' : 'login'} />
  }

  // 3. Authenticated AND authorized institute member: render protected application
  return <>{children}</>
}
