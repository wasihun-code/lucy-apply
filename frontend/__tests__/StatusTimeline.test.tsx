import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusTimeline } from '@/components/shared/StatusTimeline'
import type { TimelineEntry } from '@/components/shared/StatusTimeline'

const mockEntries: TimelineEntry[] = [
  {
    id: '1',
    from_status: 'submitted',
    to_status: 'under_review',
    changed_by_type: 'university_staff',
    reason: 'Application opened for review',
    created_at: '2026-06-24T12:00:00Z',
  },
  {
    id: '2',
    from_status: null,
    to_status: 'submitted',
    changed_by_type: 'applicant',
    reason: 'Payment received',
    created_at: '2026-06-23T10:00:00Z',
  },
  {
    id: '3',
    from_status: 'under_review',
    to_status: 'admitted',
    changed_by_type: 'system',
    created_at: '2026-06-25T08:00:00Z',
  },
]

describe('StatusTimeline', () => {
  it('renders entries sorted newest first', () => {
    render(<StatusTimeline entries={mockEntries} />)
    const statuses = screen.getAllByText(/Admitted|Submitted|Under Review/)
    expect(statuses[0]).toHaveTextContent('Admitted')
    expect(statuses[1]).toHaveTextContent('Under Review')
    expect(statuses[2]).toHaveTextContent('Submitted')
  })

  it('shows actor label for applicant', () => {
    render(<StatusTimeline entries={mockEntries} />)
    expect(screen.getByText(/by applicant/)).toBeInTheDocument()
  })

  it('shows actor label for university staff', () => {
    render(<StatusTimeline entries={mockEntries} />)
    expect(screen.getByText(/by admissions team/)).toBeInTheDocument()
  })

  it('shows actor label for system', () => {
    render(<StatusTimeline entries={mockEntries} />)
    expect(screen.getByText(/automatically/)).toBeInTheDocument()
  })

  it('shows reason text when present', () => {
    render(<StatusTimeline entries={mockEntries} />)
    expect(screen.getByText('Application opened for review')).toBeInTheDocument()
    expect(screen.getByText('Payment received')).toBeInTheDocument()
  })

  it('shows from-status line', () => {
    render(<StatusTimeline entries={mockEntries} />)
    expect(screen.getByText(/Previously: submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/Previously: under review/i)).toBeInTheDocument()
  })

  it('renders empty state when no entries', () => {
    render(<StatusTimeline entries={[]} />)
    expect(screen.getByText('No status changes recorded.')).toBeInTheDocument()
  })

  it('renders loading skeletons', () => {
    const { container } = render(<StatusTimeline entries={[]} loading />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders StatusBadge for each entry', () => {
    render(<StatusTimeline entries={mockEntries} />)
    expect(screen.getByText('Admitted')).toBeInTheDocument()
    expect(screen.getByText('Under Review')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('handles empty entries gracefully without crashing', () => {
    const { container } = render(<StatusTimeline entries={[]} />)
    expect(container.textContent).toContain('No status changes recorded')
  })
})
