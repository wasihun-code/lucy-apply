import { render, screen } from '@testing-library/react'
import MFASetupPage from '@/app/(auth)/mfa/setup/page'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
}))

vi.mock('@/lib/auth', () => ({
  getMe: vi.fn().mockResolvedValue(null),
}))

describe('MFASetupPage', () => {
  it('renders AuthCard with title in loading state', () => {
    render(<MFASetupPage />)
    expect(screen.getByText('Set up two-factor authentication')).toBeInTheDocument()
  })

  it('renders Lucy Apply logo wordmark', () => {
    render(<MFASetupPage />)
    expect(screen.getByText('Lucy Apply')).toBeInTheDocument()
  })

  it('renders loading skeleton initially', () => {
    const { container } = render(<MFASetupPage />)
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })
})
