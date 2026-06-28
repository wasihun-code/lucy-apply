import { render, screen, fireEvent } from '@testing-library/react'
import { ProgramFilterClient } from '@/components/shared/ProgramFilterClient'

const mockPrograms = [
  {
    id: '1',
    name: 'Computer Science',
    degree_level: 'undergraduate',
    description: 'CS program',
    fee_amount: '1000',
    fee_currency: 'USD',
    university: 'u1',
    university_name: 'AAU',
    open_cycles: [{ close_date: '2025-09-30T00:00:00Z' }],
  },
  {
    id: '2',
    name: 'Data Science',
    degree_level: 'postgraduate',
    description: 'DS program',
    fee_amount: '2000',
    fee_currency: 'USD',
    university: 'u1',
    university_name: 'AAU',
    open_cycles: [{ close_date: '2025-10-30T00:00:00Z' }],
  },
]

describe('ProgramFilterClient', () => {
  it('renders all tabs', () => {
    render(<ProgramFilterClient programs={mockPrograms} />)
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undergraduate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Postgraduate' })).toBeInTheDocument()
  })

  it('shows all programs by default', () => {
    render(<ProgramFilterClient programs={mockPrograms} />)
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
    expect(screen.getByText('Data Science')).toBeInTheDocument()
  })

  it('filters by undergraduate when tab clicked', () => {
    render(<ProgramFilterClient programs={mockPrograms} />)
    fireEvent.click(screen.getByRole('button', { name: 'Undergraduate' }))
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
    expect(screen.queryByText('Data Science')).not.toBeInTheDocument()
  })

  it('filters by postgraduate when tab clicked', () => {
    render(<ProgramFilterClient programs={mockPrograms} />)
    fireEvent.click(screen.getByRole('button', { name: 'Postgraduate' }))
    expect(screen.getByText('Data Science')).toBeInTheDocument()
    expect(screen.queryByText('Computer Science')).not.toBeInTheDocument()
  })

  it('shows empty state when no programs match filter', () => {
    render(<ProgramFilterClient programs={[]} />)
    expect(screen.getByText('No programs available')).toBeInTheDocument()
  })
})
