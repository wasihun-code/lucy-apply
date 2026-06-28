import { StaffShell } from '@/components/layout/StaffShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>
}
