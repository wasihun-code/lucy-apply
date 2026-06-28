import { render, screen } from '@testing-library/react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'

describe('FormField', () => {
  it('renders label text', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <Input id="email" />
      </FormField>,
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders hint when provided', () => {
    render(
      <FormField label="Email" htmlFor="email" hint="We will never share your email.">
        <Input id="email" />
      </FormField>,
    )
    expect(screen.getByText('We will never share your email.')).toBeInTheDocument()
  })

  it('renders error in text-danger', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Email is required">
        <Input id="email" error />
      </FormField>,
    )
    const error = screen.getByText('Email is required')
    expect(error.className).toContain('text-danger')
  })
})
