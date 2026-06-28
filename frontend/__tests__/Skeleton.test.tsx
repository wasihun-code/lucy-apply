import { render } from '@testing-library/react'
import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

describe('Skeleton', () => {
  it('renders with animate-pulse and bg-border classes', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('animate-pulse')
    expect(el.className).toContain('bg-border')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-10')
    expect(el.className).toContain('w-full')
  })
})

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has card-like structure', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.firstChild?.firstChild).toBeInTheDocument()
  })
})

describe('SkeletonRow', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonRow />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
