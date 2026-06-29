import { render, screen, fireEvent } from '@testing-library/react'
import { ApplicationCard } from '@/components/shared/ApplicationCard'
import type { Application } from '@/lib/api'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function makeApp(overrides?: Partial<Application>): Application {
  return {
    id: 'app-1',
    program: 'prog-1',
    program_name: 'Computer Science',
    university_name: 'Addis Ababa University',
    admission_cycle: 'cycle-1',
    status: 'submitted',
    form_data: {},
    document_checklist: [],
    payment: null,
    submitted_at: '2026-05-15T10:00:00Z',
    decision_at: null,
    decision_by: null,
    offer_response_at: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-05-15T10:00:00Z',
    ...overrides,
  }
}

describe('ApplicationCard', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders program name and university name', () => {
    render(<ApplicationCard application={makeApp()} />)
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
    expect(screen.getByText('Addis Ababa University')).toBeInTheDocument()
  })

  it('renders status badge with correct status', () => {
    render(<ApplicationCard application={makeApp({ status: 'under_review' })} />)
    expect(screen.getByText('Under Review')).toBeInTheDocument()
  })

  it('shows document verification count for non-draft applications', () => {
    render(
      <ApplicationCard
        application={makeApp({
          document_verified_count: 2,
          document_total_count: 5,
        })}
      />,
    )
    expect(screen.getByText('2/5 verified')).toBeInTheDocument()
  })

  it('hides document verification count for draft applications', () => {
    render(
      <ApplicationCard
        application={makeApp({
          status: 'draft',
          document_verified_count: 2,
          document_total_count: 5,
        })}
      />,
    )
    expect(screen.queryByText('2/5 verified')).not.toBeInTheDocument()
  })

  it('navigates to wizard on click when draft', () => {
    render(<ApplicationCard application={makeApp({ status: 'draft' })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith(
      '/dashboard/apply/prog-1/?cycle=cycle-1',
    )
  })

  it('navigates to detail page on click when not draft', () => {
    render(<ApplicationCard application={makeApp()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith(
      '/dashboard/applications/app-1/',
    )
  })

  it('shows formatted submitted date when present', () => {
    render(<ApplicationCard application={makeApp()} />)
    expect(screen.getByText('May 15, 2026')).toBeInTheDocument()
  })

  it('applies border-l-4 for non-draft status', () => {
    render(<ApplicationCard application={makeApp()} />)
    expect(screen.getByRole('button').className).toContain('border-l-4')
  })

  it('omits border-l-4 for draft status', () => {
    render(<ApplicationCard application={makeApp({ status: 'draft' })} />)
    expect(screen.getByRole('button').className).not.toContain('border-l-4')
  })

  it('applies accent border for admitted status', () => {
    render(<ApplicationCard application={makeApp({ status: 'admitted' })} />)
    expect(screen.getByRole('button').className).toContain('border-l-accent')
  })

  it('applies success border for accepted status', () => {
    render(<ApplicationCard application={makeApp({ status: 'accepted' })} />)
    expect(screen.getByRole('button').className).toContain('border-l-success')
  })

  it('applies danger border for rejected status', () => {
    render(<ApplicationCard application={makeApp({ status: 'rejected' })} />)
    expect(screen.getByRole('button').className).toContain('border-l-danger')
  })

  it('renders as an interactive Card (button)', () => {
    render(<ApplicationCard application={makeApp()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
