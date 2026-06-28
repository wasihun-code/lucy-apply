import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('passes through placeholder', () => {
    render(<Input placeholder="Enter name" />)
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
  })

  it('applies error styles when error is true', () => {
    render(<Input error />)
    expect(screen.getByRole('textbox').className).toContain('border-danger')
  })

  it('fires onChange when typing', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('passes through value', () => {
    render(<Input value="hello" readOnly />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })
})
