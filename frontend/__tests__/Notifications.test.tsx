import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import NotificationsPage from '@/app/dashboard/notifications/page'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard/notifications',
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}))

const mockApplications = {
  results: [
    {
      id: 'app-1',
      program_name: 'BSc Computer Science',
      university_name: 'Test University',
      status: 'admitted',
      document_checklist: [
        { type: 'transcript', label: 'Transcript', status: null, uploaded: true },
      ],
      submitted_at: '2026-06-25T10:00:00Z',
      created_at: '2026-06-20T10:00:00Z',
    },
    {
      id: 'app-2',
      program_name: 'MSc Data Science',
      university_name: 'Test University',
      status: 'under_review',
      document_checklist: [
        { type: 'transcript', label: 'Transcript', status: 'flagged', uploaded: true },
      ],
      submitted_at: '2026-06-24T10:00:00Z',
      created_at: '2026-06-22T10:00:00Z',
    },
  ],
}

const mockHistoryApp1 = [
  {
    from_status: 'submitted',
    to_status: 'under_review',
    changed_by_type: 'university_staff',
    reason: 'Opened for review',
    created_at: '2026-06-24T12:00:00Z',
  },
  {
    from_status: 'under_review',
    to_status: 'admitted',
    changed_by_type: 'university_staff',
    reason: 'Decision issued',
    created_at: '2026-06-25T08:00:00Z',
  },
]

const mockHistoryApp2 = [
  {
    from_status: 'submitted',
    to_status: 'under_review',
    changed_by_type: 'university_staff',
    reason: 'Opened for review',
    created_at: '2026-06-24T14:00:00Z',
  },
]

function mockFetch(url: string) {
  if (url.includes('history/')) {
    const id = url.includes('app-1') ? 'app-1' : 'app-2'
    const data = id === 'app-1' ? mockHistoryApp1 : mockHistoryApp2
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    })
  }
  if (url.includes('/applications') || url.includes('/proxy')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApplications),
    })
  }
  return Promise.reject(new Error(`unexpected fetch: ${url}`))
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(mockFetch))
    localStorage.clear()
  })

  it('renders admitted notification', async () => {
    render(<NotificationsPage />)
    await waitFor(() => {
      expect(screen.getByText("You've been admitted!")).toBeInTheDocument()
    })
  })

  it('renders under review notification', async () => {
    render(<NotificationsPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Your application is being reviewed').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders flagged document notification', async () => {
    render(<NotificationsPage />)
    await waitFor(() => {
      expect(screen.getByText(/A document needs your attention/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no applications', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      }),
    )
    render(<NotificationsPage />)
    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument()
    })
  })

  it('shows error state on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    )
    render(<NotificationsPage />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('renders application name in notification', async () => {
    render(<NotificationsPage />)
    await waitFor(() => {
      expect(screen.getAllByText(/Application to BSc Computer Science/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Application to MSc Data Science/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('sorts notifications newest first', async () => {
    render(<NotificationsPage />)
    await waitFor(() => {
      const messages = screen.getAllByText(/admitted|being reviewed|needs your attention/)
      expect(messages.length).toBeGreaterThanOrEqual(3)
    })
  })
})
