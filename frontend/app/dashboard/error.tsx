'use client'

import { ErrorState } from '@/components/shared/ErrorState'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorState
      heading="Something went wrong"
      message={error.message || 'An unexpected error occurred. Please try again.'}
      onRetry={reset}
    />
  )
}
