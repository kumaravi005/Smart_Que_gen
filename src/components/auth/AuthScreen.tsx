import React, { useState, useEffect } from 'react'
import {
  LogIn,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Building,
  UserCheck,
  MapPin,
  Award,
  Phone,
  CheckCircle2,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../common/Button'

interface AuthScreenProps {
  initialMode?: 'login' | 'bootstrap'
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialMode = 'login' }) => {
  const { user, profile, login, logout, bootstrapFirstOwner, isConfigured } = useAuth()

  const [mode, setMode] = useState<'login' | 'bootstrap'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Bootstrap fields
  const [fullName, setFullName] = useState('')
  const [instituteName, setInstituteName] = useState('Omega Education Centre')
  const [tagline, setTagline] = useState('एक अद्भुत शिक्षण शैली...')
  const [contact, setContact] = useState('')
  const [address, setAddress] = useState('')
  const [affiliation, setAffiliation] = useState('')

  useEffect(() => {
    if (user && !profile) {
      setMode('bootstrap')
    }
  }, [user, profile])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        if (result.needsSetup) {
          setMode('bootstrap')
          setSuccessMessage('Credentials verified! Complete the center profile below to finalize Owner elevation.')
        }
      } else {
        setErrorMessage(result.error || 'Invalid email or password.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      if (!user) {
        if (!email.trim() || !password) {
          setErrorMessage('Administrator Email and Password are required.')
          setIsSubmitting(false)
          return
        }

        const loginAttempt = await login(email, password)
        if (!loginAttempt.success) {
          setErrorMessage(
            `Authentication failed: ${loginAttempt.error}. Please ensure this administrator user exists in Supabase Auth.`
          )
          setIsSubmitting(false)
          return
        }
      }

      const result = await bootstrapFirstOwner({
        fullName,
        instituteName: instituteName.trim() || 'Omega Education Centre',
        tagline: tagline.trim() || 'एक अद्भुत शिक्षण शैली...',
        affiliation: affiliation || undefined,
        address: address || undefined,
        contact: contact || undefined
      })

      if (result.success) {
        setSuccessMessage('Center profile initialized and Owner privileges activated!')
      } else {
        setErrorMessage(result.error || 'Failed to initialize center.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing bootstrap.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFE600] flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-[#0055D4] selection:text-white relative">
      <div className="max-w-md w-full relative z-10">
        {/* Main Clean Card with Royal Blue Border */}
        <div className="bg-white border-2 border-[#0055D4] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/20 space-y-5">
          {/* Official Omega Logo (preserving original proportions) */}
          <div className="text-center space-y-2">
            <img
              src="/omega-logo.png"
              alt="Omega Education Centre"
              className="h-28 sm:h-32 w-auto object-contain mx-auto rounded-2xl drop-shadow-sm"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0055D4] tracking-tight">
                {mode === 'login' ? 'Teacher & Staff Login' : 'First-Time Setup'}
              </h1>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">{successMessage}</p>
            </div>
          )}

          {/* Mode 1: Clean & Compact Teacher Login */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@omegaedu.org"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0055D4] focus:ring-2 focus:ring-[#0055D4]/20 outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0055D4] focus:ring-2 focus:ring-[#0055D4]/20 outline-none transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#0055D4] hover:bg-[#0041a8] text-white font-bold rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2 border-none"
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null)
                    setMode('bootstrap')
                  }}
                  className="text-xs text-slate-500 hover:text-[#0055D4] font-medium transition-colors"
                >
                  First-Time Administrator Setup
                </button>
              </div>
            </form>
          ) : (
            /* Mode 2: Clean First-Time Administrator Bootstrap */
            <form onSubmit={handleBootstrapSubmit} className="space-y-3">
              {user ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500">Admin: </span>
                    <strong className="text-slate-900">{user.email}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Switch
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@omegaedu.org"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Admin Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Owner Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Institute Name
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    placeholder="Omega Education Centre"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Motto / Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="एक अद्भुत शिक्षण शैली..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contact Phone / Email
                  </label>
                  <div className="relative">
                    <Phone className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Affiliation / Board
                  </label>
                  <div className="relative">
                    <Award className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                    <input
                      type="text"
                      value={affiliation}
                      onChange={(e) => setAffiliation(e.target.value)}
                      placeholder="Board / JNV / CHS / Olympiad"
                      className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Campus Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Patna, Bihar"
                      className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#0055D4] hover:bg-[#0041a8] text-white font-bold rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2 border-none"
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                {isSubmitting ? 'Initializing...' : 'Initialize Center & Activate Owner'}
              </Button>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null)
                    setMode('login')
                  }}
                  className="text-xs text-slate-500 hover:text-[#0055D4] font-medium transition-colors"
                >
                  Already set up? Back to Sign In
                </button>
              </div>
            </form>
          )}

          {!isConfigured && (
            <p className="text-[11px] text-amber-700 text-center font-medium">
              Note: Connect your Supabase project in <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code>.
            </p>
          )}
        </div>

        {/* Small discreet footer */}
        <div className="text-center text-[11px] text-[#003F9E] font-medium mt-3">
          Omega Education Centre &bull; Smart Question Paper Generator
        </div>
      </div>
    </div>
  )
}
