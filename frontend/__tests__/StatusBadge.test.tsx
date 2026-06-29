import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/ui/StatusBadge'

describe('StatusBadge', () => {
  const statuses = [
    { status: 'draft', expectedLabel: 'Draft' },
    { status: 'submitted', expectedLabel: 'Submitted' },
    { status: 'under_review', expectedLabel: 'Under Review' },
    { status: 'admitted', expectedLabel: 'Admitted' },
    { status: 'rejected', expectedLabel: 'Rejected' },
    { status: 'waitlisted', expectedLabel: 'Waitlisted' },
    { status: 'accepted', expectedLabel: 'Accepted' },
    { status: 'declined', expectedLabel: 'Declined' },
    { status: 'active', expectedLabel: 'Active' },
    { status: 'inactive', expectedLabel: 'Inactive' },
    { status: 'published', expectedLabel: 'Published' },
    { status: 'pending', expectedLabel: 'Pending' },
    { status: 'archived', expectedLabel: 'Archived' },
    { status: 'scheduled', expectedLabel: 'Scheduled' },
    { status: 'open', expectedLabel: 'Open' },
    { status: 'closed', expectedLabel: 'Closed' },
    { status: 'admin', expectedLabel: 'Admin' },
    { status: 'officer', expectedLabel: 'Officer' },
  ]

  statuses.forEach(({ status, expectedLabel }) => {
    it(`renders "${expectedLabel}" for status "${status}"`, () => {
      render(<StatusBadge status={status} />)
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })
  })

  it('renders unknown status with fallback label', () => {
    render(<StatusBadge status="unknown_status" />)
    expect(screen.getByText('Unknown Status')).toBeInTheDocument()
  })

  it('applies semantic color classes for submitted', () => {
    render(<StatusBadge status="submitted" />)
    const badge = screen.getByText('Submitted')
    expect(badge.className).toContain('text-primary')
  })

  it('applies semantic color classes for rejected', () => {
    render(<StatusBadge status="rejected" />)
    const badge = screen.getByText('Rejected')
    expect(badge.className).toContain('text-danger')
  })

  it('applies accent color for admitted', () => {
    render(<StatusBadge status="admitted" />)
    const badge = screen.getByText('Admitted')
    expect(badge.className).toContain('text-accent')
  })

  it('applies success/green color for open', () => {
    render(<StatusBadge status="open" />)
    const badge = screen.getByText('Open')
    expect(badge.className).toContain('text-success')
  })

  it('applies danger/red color for closed', () => {
    render(<StatusBadge status="closed" />)
    const badge = screen.getByText('Closed')
    expect(badge.className).toContain('text-danger')
  })

  it('applies neutral/gray color for scheduled', () => {
    render(<StatusBadge status="scheduled" />)
    const badge = screen.getByText('Scheduled')
    expect(badge.className).toContain('text-neutral')
  })
})
