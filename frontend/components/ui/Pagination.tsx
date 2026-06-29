'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  function getPageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }
    pages.push(1)
    if (currentPage > 3) pages.push('ellipsis')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  const pages = getPageNumbers()

  return (
    <nav className="flex items-center justify-center gap-1 mt-6" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded text-sm transition-colors',
          currentPage <= 1
            ? 'opacity-50 cursor-not-allowed text-text-400'
            : 'text-text-600 hover:bg-background hover:text-text-900',
        )}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-text-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'inline-flex items-center justify-center h-8 w-8 rounded text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary text-white'
                : 'text-text-600 hover:bg-background hover:text-text-900',
            )}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded text-sm transition-colors',
          currentPage >= totalPages
            ? 'opacity-50 cursor-not-allowed text-text-400'
            : 'text-text-600 hover:bg-background hover:text-text-900',
        )}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
