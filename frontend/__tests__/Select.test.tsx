import { render, screen } from '@testing-library/react'
import { Select } from '@/components/ui/Select'

describe('Select', () => {
  it('renders select element', () => {
    render(
      <Select>
        <option value="">Choose</option>
        <option value="1">Option 1</option>
      </Select>,
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders options', () => {
    render(
      <Select>
        <option value="">Choose</option>
        <option value="1">Option 1</option>
      </Select>,
    )
    expect(screen.getByText('Choose')).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('applies error styles when error prop is true', () => {
    render(
      <Select error>
        <option value="">Choose</option>
      </Select>,
    )
    const select = screen.getByRole('combobox')
    expect(select.className).toContain('border-danger')
  })
})
