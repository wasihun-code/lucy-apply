import { render, screen } from '@testing-library/react'
import { Spinner } from '@/components/ui/Spinner'

describe('Spinner', () => {
  it('renders a spinner icon', () => {
    render(<Spinner />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('applies animate-spin class', () => {
    render(<Spinner />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveClass('animate-spin')
  })

  it('accepts custom className', () => {
    render(<Spinner className="text-primary" />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveClass('text-primary')
  })
})
