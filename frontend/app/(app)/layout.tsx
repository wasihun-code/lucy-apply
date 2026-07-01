import { PublicShell } from '@/components/layout/PublicShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
