import { render, screen } from '@testing-library/react'
import { ProgramCard } from '@/components/shared/ProgramCard'

const mockProgram = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'Computer Science',
  degree_level: 'undergraduate',
  description: 'A four-year计算机科学 program.',
  fee_amount: '2000',
  fee_currency: 'USD',
  university: '550e8400-e29b-41d4-a716-446655440000',
  university_name: 'Addis Ababa University',
  open_cycles: [{ close_date: '2025-09-30T00:00:00Z' }],
}

describe('ProgramCard', () => {
  it('renders program name', () => {
    render(<ProgramCard program={mockProgram} />)
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
  })

  it('renders university name', () => {
    render(<ProgramCard program={mockProgram} />)
    expect(screen.getByText('Addis Ababa University')).toBeInTheDocument()
  })

  it('renders degree level label', () => {
    render(<ProgramCard program={mockProgram} />)
    expect(screen.getByText('Undergraduate')).toBeInTheDocument()
  })

  it('renders fee', () => {
    render(<ProgramCard program={mockProgram} />)
    expect(screen.getByText('$2,000')).toBeInTheDocument()
  })

  it('renders deadline when open cycle exists', () => {
    render(<ProgramCard program={mockProgram} />)
    expect(screen.getByText(/Deadline:/)).toBeInTheDocument()
  })

  it('renders applications closed when no open cycle', () => {
    render(<ProgramCard program={{ ...mockProgram, open_cycles: [] }} />)
    expect(screen.getByText('Applications closed')).toBeInTheDocument()
  })

  it('renders descriptions for postgraduate level', () => {
    render(<ProgramCard program={{ ...mockProgram, degree_level: 'postgraduate' }} />)
    expect(screen.getByText('Postgraduate')).toBeInTheDocument()
  })

  it('links to program detail page', () => {
    render(<ProgramCard program={mockProgram} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      `/universities/${mockProgram.university}/programs/${mockProgram.id}`,
    )
  })
})
