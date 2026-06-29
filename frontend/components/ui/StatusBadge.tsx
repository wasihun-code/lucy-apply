import { cn } from '@/lib/utils'

type Status =
  | 'draft' | 'submitted' | 'under_review' | 'admitted'
  | 'rejected' | 'waitlisted' | 'accepted' | 'declined'
  | 'active' | 'inactive' | 'published' | 'pending' | 'archived'
  | 'scheduled' | 'open' | 'closed'

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft:       { label: 'Draft',       className: 'bg-neutral/10 text-neutral border-neutral/20' },
  submitted:   { label: 'Submitted',   className: 'bg-primary-soft text-primary border-primary/20' },
  under_review:{ label: 'Under Review',className: 'bg-warning/10 text-warning border-warning/20' },
  admitted:    { label: 'Admitted',    className: 'bg-accent/10 text-accent border-accent/20' },
  rejected:    { label: 'Rejected',    className: 'bg-danger/10 text-danger border-danger/20' },
  waitlisted:  { label: 'Waitlisted',  className: 'bg-neutral/10 text-neutral border-neutral/20' },
  accepted:    { label: 'Accepted',    className: 'bg-success/10 text-success border-success/20' },
  declined:    { label: 'Declined',    className: 'bg-neutral/10 text-neutral border-neutral/20' },
  active:      { label: 'Active',      className: 'bg-success/10 text-success border-success/20' },
  inactive:    { label: 'Inactive',    className: 'bg-neutral/10 text-neutral border-neutral/20' },
  published:   { label: 'Published',   className: 'bg-success/10 text-success border-success/20' },
  pending:     { label: 'Pending',     className: 'bg-warning/10 text-warning border-warning/20' },
  archived:    { label: 'Archived',    className: 'bg-neutral/10 text-neutral border-neutral/20' },
  scheduled:   { label: 'Scheduled',   className: 'bg-neutral/10 text-neutral border-neutral/20' },
  open:        { label: 'Open',        className: 'bg-success/10 text-success border-success/20' },
  closed:      { label: 'Closed',      className: 'bg-danger/10 text-danger border-danger/20' },
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const config = statusConfig[status as Status] ?? {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    className: 'bg-neutral/10 text-neutral border-neutral/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
      )}
    >
      {label ?? config.label}
    </span>
  )
}
