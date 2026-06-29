'use client'

import { cn } from '@/lib/utils'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'bg-surface border border-border rounded px-3 py-2 text-sm text-text-900',
        'placeholder:text-text-400',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'transition-colors duration-150 resize-y min-h-[80px]',
        error && 'border-danger focus:ring-danger/20',
        className,
      )}
      {...props}
    />
  )
}
