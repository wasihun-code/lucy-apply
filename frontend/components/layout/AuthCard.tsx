type AuthCardProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="max-w-md mx-auto mt-16 mb-16">
      <div className="bg-surface rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <p className="font-display font-bold text-2xl text-text-900 mb-1">
            Lucy Apply
          </p>
          <h1 className="text-2xl font-display font-bold text-text-900 mt-6">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm font-body font-normal text-text-600 mt-2">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
