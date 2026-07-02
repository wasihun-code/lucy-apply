import { render, screen } from '@testing-library/react'
import ProfilePage from '@/app/dashboard/profile/page'

const mockReplace = vi.fn()
const mockPush = vi.fn()
const mockRouter = { push: mockPush, replace: mockReplace }

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

const mockGetMe = vi.fn()
vi.mock('@/lib/auth', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
}))

const mockProfile = {
  id: 'applicant-1',
  email: 'alice@test.com',
  full_name: 'Alice Test',
  country_of_residence: 'Kenya',
  date_of_birth: '2000-06-15',
  nationality: 'Kenyan',
  email_verified: true,
}

function mockFetchProfile() {
  global.fetch = vi.fn((url: string, options?: RequestInit) => {
    if (url === '/api/proxy/applicants/me/' && (!options || options.method === 'GET' || !options.method)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      })
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  }) as ReturnType<typeof vi.fn>
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMe.mockResolvedValue({
      role: 'applicant',
      email: 'alice@test.com',
      full_name: 'Alice Test',
    })
    mockFetchProfile()
  })

  it('renders page title, personal info card, and security card', async () => {
    render(<ProfilePage />)
    expect(await screen.findByText('My Profile')).toBeInTheDocument()
    expect(await screen.findByText('Personal Information')).toBeInTheDocument()
    expect(await screen.findByText('Account Security')).toBeInTheDocument()
  })

  it('renders personal info fields in display mode', async () => {
    render(<ProfilePage />)
    expect(await screen.findByText('Alice Test')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('Kenya')).toBeInTheDocument()
    expect(screen.getByText('Kenyan')).toBeInTheDocument()
  })

  it('renders Edit button in display mode', async () => {
    render(<ProfilePage />)
    expect(await screen.findByText('Edit')).toBeInTheDocument()
  })

  it('renders Account Security: Password section and 2FA', async () => {
    render(<ProfilePage />)
    expect(await screen.findByText('Password')).toBeInTheDocument()
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
    expect(screen.getByText('Change Password')).toBeInTheDocument()
  })

  it('shows 2FA Not enabled when mfa is off', async () => {
    render(<ProfilePage />)
    expect(await screen.findByText('Status: Not enabled')).toBeInTheDocument()
  })

  it('shows 2FA Enabled when mfa is on', async () => {
    mockGetMe.mockResolvedValue({
      role: 'applicant',
      email: 'alice@test.com',
      full_name: 'Alice Test',
      mfa_enabled: true,
      mfa_verified: true,
    })
    render(<ProfilePage />)
    expect(await screen.findByText('Status: Enabled')).toBeInTheDocument()
  })
})
