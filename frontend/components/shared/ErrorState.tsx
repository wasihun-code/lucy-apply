import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

type ErrorStateProps = {
  heading?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ heading, message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle size={48} className="text-danger mb-4" />
      {heading && (
        <h2 className="text-xl font-display font-semibold text-text-900 mb-2">
          {heading}
        </h2>
      )}
      <div className="max-w-md">
        <Alert variant="danger">{message}</Alert>
      </div>
      {onRetry && (
        <Button variant="primary" className="mt-6" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}
