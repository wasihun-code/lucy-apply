import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '@/components/shared/EmptyState'

describe('EmptyState', () => {
  it('renders heading', () => {
    render(<EmptyState heading="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<EmptyState heading="Empty" description="There is nothing here." />)
    expect(screen.getByText('There is nothing here.')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<EmptyState heading="Empty" icon={<span data-testid="icon">📭</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders action button and fires onClick', () => {
    const handleClick = vi.fn()
    render(
      <EmptyState
        heading="Empty"
        action={{ label: 'Create One', onClick: handleClick }}
      />,
    )
    const btn = screen.getByText('Create One')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders action link with href', () => {
    render(
      <EmptyState
        heading="Empty"
        action={{ label: 'Go Somewhere', href: '/somewhere' }}
      />,
    )
    const link = screen.getByRole('link', { name: /Go Somewhere/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/somewhere')
  })
})
