import { cn, formatDate, formatCurrency } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('resolves tailwind conflicts', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })

  it('handles clsx array syntax', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })
})

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2026-06-15T00:00:00Z')
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2026')
  })

  it('formats a date-only string', () => {
    const result = formatDate('2024-01-01')
    expect(result).toContain('Jan')
    expect(result).toContain('1')
    expect(result).toContain('2024')
  })
})

describe('formatCurrency', () => {
  it('formats a number as USD', () => {
    expect(formatCurrency(100)).toBe('$100')
  })

  it('formats a string amount', () => {
    expect(formatCurrency('250.50')).toBe('$250.5')
  })

  it('respects currency parameter', () => {
    const result = formatCurrency(50, 'EUR')
    expect(result).toContain('€')
    expect(result).toContain('50')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})
