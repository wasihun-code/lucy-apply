'use client'

import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

export type Column<T> = {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render: (item: T) => React.ReactNode
}

type TableProps<T> = {
  columns: Column<T>[]
  data: T[]
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (item: T) => void
  className?: string
}

export function Table<T extends { id: string }>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  className,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse', className)}>
        <thead>
          <tr className="bg-background border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left',
                  col.sortable && 'cursor-pointer select-none hover:text-text-600 transition-colors',
                  col.className,
                )}
                onClick={() => {
                  if (col.sortable && onSort) onSort(col.key)
                }}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && sortDir === 'asc' && (
                    <ChevronUp size={14} className="shrink-0" />
                  )}
                  {col.sortable && sortKey === col.key && sortDir === 'desc' && (
                    <ChevronDown size={14} className="shrink-0" />
                  )}
                  {col.sortable && sortKey !== col.key && (
                    <ChevronUp size={14} className="shrink-0 text-text-400/40" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className={cn(
                'border-b border-border last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-primary-soft/20',
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3 text-sm text-text-900', col.className)}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
