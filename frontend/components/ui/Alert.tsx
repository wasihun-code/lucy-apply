import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

type AlertProps = {
  variant: 'info' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
  className?: string
}

const config: Record<string, { icon: React.ReactNode; className: string }> = {
  info: {
    icon: <Info size={16} />,
    className: 'bg-primary-soft text-primary border-primary/20',
  },
  success: {
    icon: <CheckCircle2 size={16} />,
    className: 'bg-success/10 text-success border-success/20',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  danger: {
    icon: <AlertCircle size={16} />,
    className: 'bg-danger/10 text-danger border-danger/20',
  },
}

export function Alert({ variant, children, className }: AlertProps) {
  const { icon, className: variantClass } = config[variant]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 text-sm',
        variantClass,
        className,
      )}
      role="alert"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
