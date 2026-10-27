import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { adminService } from '../../services/adminService'
import type { UserProfile } from '../../types/auth'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { Modal } from '../common/Modal'

export const TeacherManagementSection: React.FC = () => {
  const { user, profile, isOwner, isAuthenticated, isConfigured } = useAuth()

  const [members, setMembers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Add Teacher Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newFullName, setNewFullName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [createdSummary, setCreatedSummary] = useState<{
    email: string
    pass: string
    name: string
    role: string
  } | null>(null)

  // Revoke Modal State
  const [revokeTarget, setRevokeTarget] = useState<UserProfile | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  // Reset Password Modal State
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!isConfigured || !isAuthenticated) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await adminService.listInstituteMembers()
      setMembers(data)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load institute member list.')
    } finally {
      setIsLoading(false)
    }
  }, [isConfigured, isAuthenticated])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let pass = ''
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  const handleOpenAddModal = () => {
    setNewFullName('')
    setNewEmail('')
    setNewPassword(generateRandomPassword())
    setAddError(null)
    setCreatedSummary(null)
    setIsAddModalOpen(true)
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setIsCreating(true)

    try {
      const result = await adminService.createTeacher({
        full_name: newFullName,
        email: newEmail,
        password: newPassword,
        role: 'teacher'
      })

      if (result.success) {
        setCreatedSummary({
          email: newEmail,
          pass: newPassword,
          name: newFullName,
          role: 'teacher'
        })
        await loadMembers()
      } else {
        setAddError(result.message)
      }
    } catch (err: any) {
      setAddError(err.message || 'Error creating teacher account.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return
    setIsRevoking(true)
    try {
      const res = await adminService.revokeTeacher(revokeTarget.id)
      if (res.success) {
        setRevokeTarget(null)
        await loadMembers()
      } else {
        alert(res.message)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to revoke access.')
    } finally {
      setIsRevoking(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    setIsResetting(true)
    try {
      const res = await adminService.resetPassword(resetTarget.id, tempPassword)
      if (res.success) {
        setResetSuccess(true)
        setTimeout(() => {
          setResetTarget(null)
          setResetSuccess(false)
        }, 1800)
      } else {
        alert(res.message)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update password.')
    } finally {
      setIsResetting(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (!isConfigured) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm">
          <Users className="w-5 h-5 text-blue-600" />
          <span>Faculty & Teacher Management</span>
        </div>
        <p className="text-xs text-slate-500">
          Connect your Supabase project in <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">.env.local</code> to provision and manage cloud accounts for coaching teachers.
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm">
          <Users className="w-5 h-5 text-blue-600" />
          <span>Faculty & Teacher Management</span>
        </div>
        <p className="text-xs text-slate-500">
          Sign in as the Institute Owner to provision and manage cloud accounts for coaching teachers.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>{isOwner ? 'Owner: Teacher & Staff Accounts' : 'Shared Institute Faculty'}</span>
            </h3>
            <Badge variant={isOwner ? 'primary' : 'default'} size="sm">
              {isOwner ? 'Owner Portal' : 'Teacher View'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOwner
              ? 'Create, manage, and deactivate teacher accounts. All authorized teachers access your shared institute dataset.'
              : `Signed in as ${profile?.full_name || 'Teacher'}. All question papers, bank items, and templates are shared across your institute.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMembers}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {isOwner && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddModal}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add Teacher
            </Button>
          )}
        </div>
      </div>

      {!isOwner && (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Teacher account creation, password resets, and deactivations are strictly restricted to the Institute Owner.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Members Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
            <tr>
              <th className="px-4 py-3">Member Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 hidden sm:table-cell">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => {
              const isSelf = member.id === user?.id
              const isOwnerRole = member.role === 'owner'

              return (
                <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                        {member.full_name?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <div>{member.full_name}</div>
                        {isSelf && (
                          <span className="text-[10px] text-blue-600 font-medium">You</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {member.role === 'owner' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        <ShieldCheck className="w-3 h-3" />
                        Owner
                      </span>
                    ) : member.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Teacher
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Active'}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {isOwner && !isSelf && !isOwnerRole ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(member)
                              setTempPassword(generateRandomPassword())
                              setResetSuccess(false)
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setRevokeTarget(member)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate / Revoke Teacher Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-normal">
                          {isSelf ? 'Current User' : isOwnerRole ? 'Owner' : 'Active'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}

            {members.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  {isOwner
                    ? 'No teachers found. Click "Add Teacher" above to provision accounts.'
                    : 'No faculty members found in your institute.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Teacher Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision New Teacher Account"
        description="Creates credentials directly in your shared institute tenant. Public signup remains disabled."
        maxWidth="md"
      >
        {createdSummary ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Account Created Successfully!</span>
              </div>
              <p className="text-emerald-700">
                Share these login credentials securely with <strong>{createdSummary.name}</strong>:
              </p>
              <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1 font-mono text-[11px] text-slate-800 select-all">
                <div><strong>Email:</strong> {createdSummary.email}</div>
                <div><strong>Password:</strong> {createdSummary.pass}</div>
                <div><strong>Role:</strong> {createdSummary.role}</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `Omega Edu Login Credentials\nEmail: ${createdSummary.email}\nPassword: ${createdSummary.pass}\nLogin at: ${window.location.origin}`,
                    'creds'
                  )
                }
                leftIcon={copiedKey === 'creds' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedKey === 'creds' ? 'Copied Details' : 'Copy Credentials'}
              </Button>

              <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateTeacher} className="space-y-3.5">
            {addError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {addError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Teacher's Full Name
              </label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Pooja Verma"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Teacher's Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="pooja.verma@omegaedu.org"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Initial Password
                </label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateRandomPassword())}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Assigned Role
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Teacher</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Shares common institute question bank, papers, folders, and templates. Cannot provision or deactivate other accounts.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isCreating}>
                {isCreating ? 'Creating Account...' : 'Create Teacher'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke Teacher Access"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              Are you sure you want to revoke account access for{' '}
              <strong>{revokeTarget?.full_name}</strong>? They will be immediately signed out and unable to log back in.
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRevokeConfirm}
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : 'Confirm Revoke'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={`Reset Password: ${resetTarget?.full_name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-3.5">
          {resetSuccess ? (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Password updated successfully!
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  New Temporary Password
                </label>
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setResetTarget(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isResetting}>
                  {isResetting ? 'Saving...' : 'Set Password'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  )
}
