'use client'

import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  iconTrailing?: React.ReactNode
  children?: React.ReactNode
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const variantStyles: Record<string, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary',
  secondary:
    'bg-surface text-text-900 border border-border hover:bg-background focus-visible:ring-primary',
  danger:
    'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger',
  ghost:
    'text-primary hover:bg-primary-soft focus-visible:ring-primary',
}

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-3 text-xs rounded gap-1.5',
  md: 'h-10 px-4 text-sm rounded gap-2',
  lg: 'h-11 px-5 text-base rounded gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconTrailing,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={size === 'sm' ? 12 : 16} /> : icon}
      {children && <span>{children}</span>}
      {!loading && iconTrailing}
    </button>
  )
}
