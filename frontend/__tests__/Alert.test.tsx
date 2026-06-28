import { render, screen } from '@testing-library/react'
import { Alert } from '@/components/ui/Alert'

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert variant="info">Message</Alert>)
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('renders with role="alert"', () => {
    render(<Alert variant="info">Alert!</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { rerender } = render(<Alert variant="info">Info</Alert>)
    expect(screen.getByRole('alert').className).toContain('text-primary')

    rerender(<Alert variant="success">Success</Alert>)
    expect(screen.getByRole('alert').className).toContain('text-success')

    rerender(<Alert variant="warning">Warning</Alert>)
    expect(screen.getByRole('alert').className).toContain('text-warning')

    rerender(<Alert variant="danger">Danger</Alert>)
    expect(screen.getByRole('alert').className).toContain('text-danger')
  })

  it('renders icon for each variant', () => {
    const { container: infoContainer } = render(<Alert variant="info">Info</Alert>)
    expect(infoContainer.querySelector('svg')).toBeInTheDocument()

    const { container: dangerContainer } = render(<Alert variant="danger">Danger</Alert>)
    expect(dangerContainer.querySelector('svg')).toBeInTheDocument()
  })
})
