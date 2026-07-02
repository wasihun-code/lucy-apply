import { render, screen } from '@testing-library/react'
import AdminUsersLoading from '@/app/platform_admin/users/loading'
import AdminAuditLogLoading from '@/app/platform_admin/audit-log/loading'
import PortalAuditLogLoading from '@/app/portal/audit-log/loading'

describe('AdminUsersLoading', () => {
  it('renders without crashing', () => {
    const { container } = render(<AdminUsersLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders skeleton elements', () => {
    const { container } = render(<AdminUsersLoading />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(10)
  })

  it('renders 5 table row skeletons', () => {
    const { container } = render(<AdminUsersLoading />)
    const rows = container.querySelectorAll('.border-b')
    expect(rows.length).toBe(5)
  })
})

describe('AdminAuditLogLoading', () => {
  it('renders without crashing', () => {
    const { container } = render(<AdminAuditLogLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders skeleton elements', () => {
    const { container } = render(<AdminAuditLogLoading />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(5)
  })
})

describe('PortalAuditLogLoading', () => {
  it('renders without crashing', () => {
    const { container } = render(<PortalAuditLogLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders skeleton elements', () => {
    const { container } = render(<PortalAuditLogLoading />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(5)
  })
})
