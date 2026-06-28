import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
  className?: string
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'bg-surface border border-border rounded h-10 px-3 text-sm text-text-900',
        'placeholder:text-text-400',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'transition-colors duration-150',
        error && 'border-danger focus:ring-danger/20',
        className,
      )}
      {...props}
    />
  )
}
