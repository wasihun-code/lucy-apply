import { render, screen } from '@testing-library/react'
import AdminStatsLoading from '@/app/admin/stats/loading'

describe('AdminStatsLoading', () => {
  it('renders without crashing', () => {
    const { container } = render(<AdminStatsLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders skeleton elements with animate-pulse', () => {
    const { container } = render(<AdminStatsLoading />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(10)
  })

  it('renders 4 skeleton cards for summary stats', () => {
    const { container } = render(<AdminStatsLoading />)
    const skeletonCards = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
    expect(skeletonCards.length).toBeGreaterThanOrEqual(4)
  })

  it('renders 6 skeleton items for status breakdown', () => {
    const { container } = render(<AdminStatsLoading />)
    const allSkeletons = container.querySelectorAll('[class*="animate-pulse"]')
    const gridSkeletons = allSkeletons.length
    expect(gridSkeletons).toBeGreaterThan(0)
  })
})
