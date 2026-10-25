import React, { useState, useEffect } from 'react'
import {
  LogIn,
  Lock,
  Mail,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Building,
  UserCheck,
  MapPin,
  Award
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useAuth } from '../../hooks/useAuth'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, login, bootstrapFirstOwner } = useAuth()

  const [mode, setMode] = useState<'login' | 'bootstrap'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Bootstrap fields
  const [fullName, setFullName] = useState('')
  const [instituteName, setInstituteName] = useState('')
  const [tagline, setTagline] = useState('')
  const [contact, setContact] = useState('')
  const [address, setAddress] = useState('')
  const [affiliation, setAffiliation] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (user && !profile) {
        setMode('bootstrap')
      }
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [isOpen, user, profile])

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
          setSuccessMessage('Credentials verified! Please complete the coaching center profile below to elevate this account to Owner.')
        } else {
          onClose()
        }
      } else {
        setErrorMessage(result.error || 'Invalid credentials or connection error.')
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
      // 1. Authenticate administrator if not already logged in
      if (!user) {
        if (!email.trim() || !password) {
          setErrorMessage('Administrator Email and Password are required.')
          setIsSubmitting(false)
          return
        }

        const loginAttempt = await login(email, password)
        if (!loginAttempt.success) {
          setErrorMessage(
            `Authentication failed: ${loginAttempt.error}. Public signup is disabled. Please ensure this administrator user has been added in your Supabase Dashboard under Authentication -> Users with "Auto Confirm User" enabled, then enter those credentials here.`
          )
          setIsSubmitting(false)
          return
        }
      }

      // 2. Execute bootstrap RPC with all 6 institute fields
      const result = await bootstrapFirstOwner({
        fullName,
        instituteName,
        tagline: tagline || undefined,
        affiliation: affiliation || undefined,
        address: address || undefined,
        contact: contact || undefined
      })

      if (result.success) {
        setSuccessMessage('Coaching center profile initialized and Owner privileges activated!')
        setTimeout(() => {
          onClose()
        }, 1500)
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Teacher & Administrator Login' : 'Initialize First Administrator'}
      description={
        mode === 'login'
          ? 'Sign in to access your shared institute question papers and bank.'
          : 'First-time setup to register the root Owner account for your coaching center.'
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700 animate-in fade-in">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@omegaedu.org"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Admin Policy Notice */}
            <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-800">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Admin-Controlled Access:</span> Public signup is disabled.
                Teacher accounts are provisioned exclusively by your institute administrator.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null)
                  setMode('bootstrap')
                }}
                className="text-xs text-slate-500 hover:text-blue-600 transition-colors font-medium"
              >
                First-time setup?
              </button>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSubmitting}
                  leftIcon={<LogIn className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBootstrapSubmit} className="space-y-3">
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
              This initializes the center profile and elevates your administrator account to <strong>Owner</strong>.
              Only run once per institute.
            </div>

            {!user && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Admin Account Notice:</strong> Public signup is disabled for security. Enter the credentials of the administrator user created in your <em>Supabase Dashboard &rarr; Authentication &rarr; Users</em> (with <em>Auto Confirm User</em> enabled).
                </div>
              </div>
            )}

            {user ? (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                <span>Logged in as: <strong>{user.email}</strong></span>
                <span className="text-[10px] bg-blue-200/60 text-blue-900 px-2 py-0.5 rounded-full font-medium">Elevating to Owner</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@omegaedu.org"
                      className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Rajesh Sharma"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Institute / Coaching Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  placeholder="Omega Education Center"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Motto / Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Excellence in Board Exams"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Contact Phone / Email
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Affiliation / Board
                </label>
                <div className="relative">
                  <Award className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    placeholder="CBSE / ICSE / State Board"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Campus Address
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Main Road, Kankarbagh, Patna"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null)
                  setMode('login')
                }}
                className="text-xs text-slate-500 hover:text-blue-600 transition-colors font-medium"
              >
                Back to Sign In
              </button>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Initializing...' : 'Initialize Center'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
