import { render, screen } from '@testing-library/react'
import MFAVerifyPage from '@/app/(auth)/mfa/verify/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('redirect=/portal/applications'),
}))

vi.mock('@/lib/auth', () => ({
  getMe: vi.fn().mockResolvedValue(null),
}))

describe('MFAVerifyPage', () => {
  it('renders AuthCard with title', () => {
    render(<MFAVerifyPage />)
    expect(screen.getByText('Two-factor authentication')).toBeInTheDocument()
  })

  it('renders Lucy Apply logo wordmark', () => {
    render(<MFAVerifyPage />)
    expect(screen.getByText('Lucy Apply')).toBeInTheDocument()
  })

  it('renders the code input field', () => {
    render(<MFAVerifyPage />)
    const input = screen.getByPlaceholderText('000000')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('inputMode', 'numeric')
    expect(input).toHaveAttribute('maxLength', '6')
  })

  it('renders verify button', () => {
    render(<MFAVerifyPage />)
    expect(screen.getByText('Verify')).toBeInTheDocument()
  })

  it('renders sign in with different account button', () => {
    render(<MFAVerifyPage />)
    expect(screen.getByText('Sign in with a different account')).toBeInTheDocument()
  })
})
