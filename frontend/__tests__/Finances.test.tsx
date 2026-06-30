import { render, screen } from '@testing-library/react'
import FinancesPage from '@/app/dashboard/finances/page'

const mockReplace = vi.fn()
const mockPush = vi.fn()
const mockRouter = { push: mockPush, replace: mockReplace }

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard/finances',
}))

const mockGetMe = vi.fn()
vi.mock('@/lib/auth', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
}))

function mockFetchPayments(empty = false) {
  global.fetch = vi.fn((url: string) => {
    if (url === '/api/proxy/applications/') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            empty
              ? { results: [] }
              : {
                  results: [
                    {
                      id: 'app-1',
                      program_name: 'BSc Computer Science',
                      university_name: 'Test University',
                    },
                    {
                      id: 'app-2',
                      program_name: 'MSc Data Science',
                      university_name: 'Test University',
                    },
                  ],
                },
          ),
      })
    }
    if (url === '/api/proxy/applications/app-1/payment/') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'pay-abc123def456',
            amount: '50.00',
            currency: 'USD',
            status: 'succeeded',
            refundable: true,
            initiated_at: '2026-06-25T10:00:00Z',
            completed_at: '2026-06-25T10:01:00Z',
          }),
      })
    }
    if (url === '/api/proxy/applications/app-2/payment/') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'pay-xyz789ghi012',
            amount: '75.00',
            currency: 'USD',
            status: 'pending',
            refundable: false,
            initiated_at: '2026-06-26T14:00:00Z',
            completed_at: null,
          }),
      })
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  }) as ReturnType<typeof vi.fn>
}

describe('FinancesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMe.mockResolvedValue({
      role: 'applicant',
      email: 'alice@test.com',
      full_name: 'Alice Test',
    })
  })

  it('renders page title and description', async () => {
    mockFetchPayments()
    render(<FinancesPage />)
    expect(await screen.findByText('Finances')).toBeInTheDocument()
    expect(screen.getByText('Your application fee payment history.')).toBeInTheDocument()
  })

  it('renders non-refundable policy alert', async () => {
    mockFetchPayments()
    render(<FinancesPage />)
    expect(await screen.findByText(/Application fees are non-refundable/)).toBeInTheDocument()
  })

  it('renders payment receipt cards with amounts', async () => {
    mockFetchPayments()
    render(<FinancesPage />)
    expect(await screen.findByText(/USD 50\.00/)).toBeInTheDocument()
    expect(await screen.findByText(/USD 75\.00/)).toBeInTheDocument()
  })

  it('renders program names in payment cards', async () => {
    mockFetchPayments()
    render(<FinancesPage />)
    expect(await screen.findByText('BSc Computer Science')).toBeInTheDocument()
    expect(await screen.findByText('MSc Data Science')).toBeInTheDocument()
  })

  it('renders status badges with correct labels', async () => {
    mockFetchPayments()
    render(<FinancesPage />)
    expect(await screen.findByText('Paid')).toBeInTheDocument()
    expect(await screen.findByText('Pending')).toBeInTheDocument()
  })

  it('renders View Application buttons', async () => {
    mockFetchPayments()
    render(<FinancesPage />)
    const buttons = await screen.findAllByText('View Application')
    expect(buttons.length).toBe(2)
  })

  it('shows empty state when no payments exist', async () => {
    mockFetchPayments(true)
    render(<FinancesPage />)
    expect(await screen.findByText('No payments yet')).toBeInTheDocument()
  })

  it('shows receipt IDs formatted correctly', async () => {
    mockFetchPayments()
    render(<FinancesPage />)
    expect(await screen.findByText(/Receipt #PAY-ABC1/)).toBeInTheDocument()
  })
})
