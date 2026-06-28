import Link from 'next/link'
import { cn } from '@/lib/utils'

type Breadcrumb = {
  label: string
  href: string
}

type PageHeaderProps = {
  title: string
  description?: string
  breadcrumb?: Breadcrumb[]
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumb, action, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-text-400 mb-2">
          {breadcrumb.map((item, i) => (
            <span key={item.href} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              <Link href={item.href} className="hover:text-text-600 transition-colors">
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-900">
            {title}
          </h1>
          {description && (
            <p className="text-sm font-body font-normal text-text-600 mt-1">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
