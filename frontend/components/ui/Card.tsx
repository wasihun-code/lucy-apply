'use client'

import { cn } from '@/lib/utils'

type CardProps = {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className,
  interactive = false,
  onClick,
  padding = 'md',
}: CardProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      className={cn(
        'bg-surface rounded-lg border border-border shadow-sm text-left',
        interactive && 'cursor-pointer transition-shadow hover:shadow-md hover:border-primary/30',
        paddingStyles[padding],
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  )
}
