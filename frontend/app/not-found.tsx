import Link from 'next/link'
import { PublicShell } from '@/components/layout/PublicShell'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <PublicShell>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-5xl font-display font-bold text-text-900">404</h1>
        <p className="text-xl font-display font-semibold text-text-600 mt-4">
          Page not found
        </p>
        <p className="text-sm text-text-400 mt-2 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="mt-6">
          <Button variant="primary">Go to Homepage</Button>
        </Link>
      </div>
    </PublicShell>
  )
}
