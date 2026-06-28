import { cn } from '@/lib/utils'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean
  className?: string
  children: React.ReactNode
}

export function Select({ error, className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'bg-surface border border-border rounded h-10 px-3 text-sm text-text-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
        'transition-colors duration-150',
        error && 'border-danger focus:ring-danger/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
