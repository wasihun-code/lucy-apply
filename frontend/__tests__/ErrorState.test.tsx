import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorState } from '@/components/shared/ErrorState'

describe('ErrorState', () => {
  it('renders message', () => {
    render(<ErrorState message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders heading when provided', () => {
    render(<ErrorState heading="Oops" message="Something went wrong" />)
    expect(screen.getByText('Oops')).toBeInTheDocument()
  })

  it('renders retry button and fires onClick', () => {
    const handleRetry = vi.fn()
    render(<ErrorState message="Error" onRetry={handleRetry} />)
    const btn = screen.getByText('Try Again')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState message="Error" />)
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
  })

  it('renders AlertTriangle icon', () => {
    const { container } = render(<ErrorState message="Error" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
