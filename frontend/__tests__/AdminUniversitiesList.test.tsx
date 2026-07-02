import { render, screen } from '@testing-library/react'
import AdminUniversitiesLoading from '@/app/platform_admin/universities/loading'
import UniversityDetailLoading from '@/app/platform_admin/universities/[id]/loading'
import { Skeleton } from '@/components/ui/Skeleton'

describe('AdminUniversitiesLoading', () => {
  it('renders without crashing', () => {
    const { container } = render(<AdminUniversitiesLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders 3 skeleton rows', () => {
    const { container } = render(<AdminUniversitiesLoading />)
    const rows = container.querySelectorAll('.border-b')
    expect(rows.length).toBe(3)
  })

  it('renders skeleton elements', () => {
    const { container } = render(<AdminUniversitiesLoading />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(5)
  })
})

describe('UniversityDetailLoading', () => {
  it('renders without crashing', () => {
    const { container } = render(<UniversityDetailLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders two skeleton cards in a grid', () => {
    const { container } = render(<UniversityDetailLoading />)
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
    expect(grid?.className).toContain('md:grid-cols-2')
  })

  it('renders skeleton elements', () => {
    const { container } = render(<UniversityDetailLoading />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(3)
  })
})
