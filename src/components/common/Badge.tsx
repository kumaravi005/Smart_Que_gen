import React from 'react'

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'info' | 'purple' | 'omega'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-blue-50 text-[#0055D4] border-blue-200 font-semibold',
    omega: 'bg-[#FFE600] text-blue-950 border-yellow-400 font-bold',
    success: 'bg-emerald-50 text-[#047857] border-emerald-200 font-medium',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  }

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] leading-tight font-medium',
    md: 'px-2.5 py-0.5 text-xs font-medium'
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border font-sans tracking-wide ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  )
}
