import { render, screen, fireEvent } from '@testing-library/react'
import { Card } from '@/components/ui/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Content</p></Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders as button when interactive and onClick provided', () => {
    render(<Card interactive onClick={() => {}}>Clickable</Card>)
    expect(screen.getByRole('button')).toHaveTextContent('Clickable')
  })

  it('renders as div when not interactive', () => {
    const { container } = render(<Card>Static</Card>)
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('fires onClick when clicked as button', () => {
    const handleClick = vi.fn()
    render(<Card interactive onClick={handleClick}>Click</Card>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies default padding (md)', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content').className).toContain('p-6')
  })

  it('applies custom padding', () => {
    const { rerender } = render(<Card padding="sm">Small</Card>)
    expect(screen.getByText('Small').className).toContain('p-4')

    rerender(<Card padding="lg">Large</Card>)
    expect(screen.getByText('Large').className).toContain('p-8')

    rerender(<Card padding="none">None</Card>)
    expect(screen.getByText('None').className).toContain('p-0')
  })

  it('applies interactive hover styles when interactive', () => {
    render(<Card interactive onClick={() => {}}>Interactive</Card>)
    expect(screen.getByRole('button').className).toContain('hover:shadow-md')
  })
})
