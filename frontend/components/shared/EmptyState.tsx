import Link from 'next/link'
import { Button } from '@/components/ui/Button'

type EmptyStateProps = {
  icon?: React.ReactNode
  heading: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function EmptyState({ icon, heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon && (
        <div className="bg-background rounded-full p-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-display font-semibold text-text-900">
        {heading}
      </h3>
      {description && (
        <p className="text-sm font-body font-normal text-text-600 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-2">
          {action.href ? (
            <Link href={action.href}>
              <Button>{action.label}</Button>
            </Link>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  )
}
