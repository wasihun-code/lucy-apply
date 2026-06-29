'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { PublicShell } from '@/components/layout/PublicShell'
import { Button } from '@/components/ui/Button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <PublicShell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={48} className="text-danger mb-4" />
        <h1 className="text-2xl font-display font-bold text-text-900">
          Something went wrong
        </h1>
        <p className="text-sm text-text-600 mt-2 max-w-md">
          An unexpected error occurred. Please try again or return to the homepage.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="primary" onClick={reset}>
            Try Again
          </Button>
          <Link href="/">
            <Button variant="secondary">Go Home</Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  )
}
