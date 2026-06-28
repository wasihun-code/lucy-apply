import { render, screen } from '@testing-library/react'
import { UniversityCard } from '@/components/shared/UniversityCard'

const mockUniversity = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Addis Ababa University',
  description: 'A prestigious Ethiopian university.',
  status: 'active',
  logo: null,
}

describe('UniversityCard', () => {
  it('renders university name', () => {
    render(<UniversityCard university={mockUniversity} />)
    expect(screen.getByText('Addis Ababa University')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<UniversityCard university={mockUniversity} />)
    expect(screen.getByText('A prestigious Ethiopian university.')).toBeInTheDocument()
  })

  it('renders initials when no logo', () => {
    render(<UniversityCard university={mockUniversity} />)
    expect(screen.getByText('AD')).toBeInTheDocument()
  })

  it('renders View Programs link', () => {
    render(<UniversityCard university={mockUniversity} />)
    expect(screen.getByText('View Programs →')).toBeInTheDocument()
  })

  it('links to university detail page', () => {
    render(<UniversityCard university={mockUniversity} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/universities/${mockUniversity.id}`)
  })
})
