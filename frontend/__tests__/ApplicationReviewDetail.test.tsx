import { render, screen } from '@testing-library/react'
import {
  statusLabel,
  historyDotColor,
  getDocDisplayStatus,
  ApplicationDetailSkeleton,
} from '@/lib/application-helpers'

describe('statusLabel', () => {
  it('converts underscored status to space-separated', () => {
    expect(statusLabel('under_review')).toBe('under review')
  })

  it('passes through single-word status', () => {
    expect(statusLabel('draft')).toBe('draft')
  })

  it('handles multiple underscores', () => {
    expect(statusLabel('under_active_review')).toBe('under active review')
  })

  it('returns empty string for empty input', () => {
    expect(statusLabel('')).toBe('')
  })
})

describe('historyDotColor', () => {
  const cases = [
    { status: 'draft', expected: 'bg-neutral/30' },
    { status: 'submitted', expected: 'bg-primary' },
    { status: 'under_review', expected: 'bg-warning' },
    { status: 'admitted', expected: 'bg-success' },
    { status: 'accepted', expected: 'bg-success' },
    { status: 'rejected', expected: 'bg-danger' },
    { status: 'declined', expected: 'bg-danger' },
    { status: 'waitlisted', expected: 'bg-neutral' },
    { status: 'unknown', expected: 'bg-neutral/30' },
  ]

  cases.forEach(({ status, expected }) => {
    it(`returns "${expected}" for status "${status}"`, () => {
      expect(historyDotColor(status)).toBe(expected)
    })
  })
})

describe('getDocDisplayStatus', () => {
  it('returns draft/Not Uploaded when not uploaded', () => {
    expect(getDocDisplayStatus({ uploaded: false, status: null })).toEqual({
      badgeStatus: 'draft',
      label: 'Not Uploaded',
    })
  })

  it('returns pending/Pending when uploaded but unreviewed', () => {
    expect(getDocDisplayStatus({ uploaded: true, status: null })).toEqual({
      badgeStatus: 'pending',
      label: 'Pending',
    })
  })

  it('returns accepted/Verified when verified', () => {
    expect(
      getDocDisplayStatus({ uploaded: true, status: 'verified' }),
    ).toEqual({
      badgeStatus: 'accepted',
      label: 'Verified',
    })
  })

  it('returns rejected/Flagged when flagged', () => {
    expect(
      getDocDisplayStatus({ uploaded: true, status: 'flagged' }),
    ).toEqual({
      badgeStatus: 'rejected',
      label: 'Flagged',
    })
  })

  it('falls back to pending/Pending for unexpected status', () => {
    expect(
      getDocDisplayStatus({ uploaded: true, status: 'expired' }),
    ).toEqual({
      badgeStatus: 'pending',
      label: 'Pending',
    })
  })
})

describe('ApplicationDetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ApplicationDetailSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders skeleton blocks for left and right columns', () => {
    const { container } = render(<ApplicationDetailSkeleton />)
    const skeletonGrid = container.querySelector('.grid')
    expect(skeletonGrid).toBeInTheDocument()
    expect(skeletonGrid!.className).toContain('lg:grid-cols-[2fr_1fr]')
  })

  it('renders multiple Skeleton elements', () => {
    const { container } = render(<ApplicationDetailSkeleton />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(5)
  })

  it('renders left column with applicant info, documents, and timeline cards', () => {
    const { container } = render(<ApplicationDetailSkeleton />)
    const leftColumn = container.querySelector('.grid > div:first-child')
    expect(leftColumn).toBeInTheDocument()
    const cardElements = leftColumn!.querySelectorAll('.border')
    expect(cardElements.length).toBeGreaterThanOrEqual(3)
  })

  it('renders decision card in the right column', () => {
    const { container } = render(<ApplicationDetailSkeleton />)
    const gridChildren = container.querySelector('.grid')?.children
    expect(gridChildren).toBeDefined()
    expect(gridChildren!.length).toBe(2)
  })

  it('has correct two-column layout on large screens', () => {
    const { container } = render(<ApplicationDetailSkeleton />)
    const grid = container.querySelector('.grid')
    expect(grid!.className).toContain('lg:grid-cols-[2fr_1fr]')
  })
})
