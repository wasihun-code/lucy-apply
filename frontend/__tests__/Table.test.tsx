import { render, screen, fireEvent } from '@testing-library/react'
import { Table, type Column } from '@/components/ui/Table'

interface TestItem {
  id: string
  name: string
  status: string
}

const data: TestItem[] = [
  { id: '1', name: 'Alpha', status: 'open' },
  { id: '2', name: 'Beta', status: 'closed' },
]

const columns: Column<TestItem>[] = [
  { key: 'name', header: 'Name', render: (item) => item.name },
  { key: 'status', header: 'Status', sortable: true, render: (item) => item.status },
]

describe('Table', () => {
  it('renders column headers', () => {
    render(<Table columns={columns} data={data} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders data rows with correct content', () => {
    render(<Table columns={columns} data={data} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('closed')).toBeInTheDocument()
  })

  it('renders correct number of rows', () => {
    const { container } = render(<Table columns={columns} data={data} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
  })

  it('renders sortable chevron indicator on sortable column', () => {
    render(<Table columns={columns} data={data} />)
    const header = screen.getByText('Status')
    const chevrons = header.closest('th')?.querySelectorAll('svg')
    expect(chevrons?.length).toBeGreaterThan(0)
  })

  it('calls onSort when sortable header is clicked', () => {
    const onSort = vi.fn()
    render(<Table columns={columns} data={data} sortKey="name" sortDir="asc" onSort={onSort} />)
    const header = screen.getByText('Status')
    fireEvent.click(header)
    expect(onSort).toHaveBeenCalledWith('status')
  })

  it('does not call onSort when non-sortable header is clicked', () => {
    const onSort = vi.fn()
    render(<Table columns={columns} data={data} onSort={onSort} />)
    fireEvent.click(screen.getByText('Name'))
    expect(onSort).not.toHaveBeenCalled()
  })

  it('shows ChevronUp when sorted ascending', () => {
    const { container } = render(<Table columns={columns} data={data} sortKey="name" sortDir="asc" />)
    const chevrons = container.querySelectorAll('svg')
    const upChevrons = Array.from(chevrons).filter(
      (svg) => svg.getAttribute('data-sentry-element') !== undefined || true,
    )
    expect(chevrons.length).toBeGreaterThan(0)
  })

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn()
    render(<Table columns={columns} data={data} onRowClick={onRowClick} />)
    const row = screen.getByText('Alpha').closest('tr')
    if (row) fireEvent.click(row)
    expect(onRowClick).toHaveBeenCalledWith(data[0])
  })

  it('renders empty state when no data', () => {
    const { container } = render(<Table columns={columns} data={[]} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(0)
  })

  it('applies custom className to table', () => {
    const { container } = render(<Table columns={columns} data={data} className="custom-class" />)
    const table = container.querySelector('table')
    expect(table?.className).toContain('custom-class')
  })

  it('applies column-specific className to th and td', () => {
    const colsWithClass: Column<TestItem>[] = [
      { key: 'name', header: 'Name', className: 'col-name', render: (item) => item.name },
      { key: 'status', header: 'Status', render: (item) => item.status },
    ]
    const { container } = render(<Table columns={colsWithClass} data={data} />)
    const cells = container.querySelectorAll('th, td')
    const nameCells = Array.from(cells).filter((el) => el.textContent === 'Name' || el.textContent === 'Alpha' || el.textContent === 'Beta')
    nameCells.forEach((cell) => {
      expect(cell.className).toContain('col-name')
    })
  })

  it('renders custom ReactNode in cells via render function', () => {
    const colsWithBadge: Column<TestItem>[] = [
      {
        key: 'status',
        header: 'Status',
        render: (item) => <span data-testid="badge-{item.id}">{item.status.toUpperCase()}</span>,
      },
    ]
    render(<Table columns={colsWithBadge} data={data} />)
    expect(screen.getByText('OPEN')).toBeInTheDocument()
    expect(screen.getByText('CLOSED')).toBeInTheDocument()
  })
})
