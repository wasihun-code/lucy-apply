'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin/universities') }, [router])
  return <p>Redirecting...</p>
}
