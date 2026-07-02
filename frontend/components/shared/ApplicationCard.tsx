'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Trash2, AlertTriangle } from 'lucide-react'
import type { Application } from '@/lib/api'

type ApplicationCardProps = {
  application: Application
  onDeleted?: (id: string) => void
}

const borderColor = (status: string) => {
  switch (status) {
    case 'admitted':
      return 'border-l-accent'
    case 'accepted':
      return 'border-l-success'
    case 'rejected':
      return 'border-l-danger'
    case 'draft':
      return ''
    default:
      return 'border-l-primary/20'
  }
}

export function ApplicationCard({ application, onDeleted }: ApplicationCardProps) {
  const router = useRouter()
  const [showArchivedModal, setShowArchivedModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const isArchived = application.program_is_archived && application.status === 'draft'
  const canDelete = application.status === 'draft'

  const handleClick = () => {
    if (isArchived) {
      setShowArchivedModal(true)
      return
    }
    if (application.status === 'draft') {
      router.push(
        `/dashboard/apply/${application.program}/?cycle=${application.admission_cycle}`,
      )
    } else {
      router.push(`/dashboard/applications/${application.id}/`)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/proxy/applications/${application.id}/`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to delete application')
      }
      setShowDeleteModal(false)
      setShowArchivedModal(false)
      if (onDeleted) onDeleted(application.id)
      else window.location.reload()
    } catch (e: any) {
      setDeleteError(e.message || 'An error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card
        interactive
        onClick={handleClick}
        padding="md"
        className={cn(
          'w-full relative group',
          application.status !== 'draft' && 'border-l-4',
          borderColor(application.status),
          isArchived && 'opacity-60 grayscale',
        )}
      >
        <div className="flex items-center gap-4 pr-10 sm:pr-0">
          <div className="flex-1 min-w-0">
            <p className="text-base font-display font-semibold text-text-900 truncate">
              {application.program_name}
            </p>
            <p className="text-sm text-text-400 truncate">
              {application.university_name}
            </p>
          </div>

          {application.status !== 'draft' && (
            <div className="text-sm text-text-600 shrink-0 whitespace-nowrap">
              {application.document_verified_count ?? 0}/
              {application.document_total_count ?? 0} verified
            </div>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={application.status} />
            {application.submitted_at && (
              <span className="text-xs text-text-400 hidden sm:inline">
                {formatDate(application.submitted_at)}
              </span>
            )}
          </div>
        </div>

        {canDelete && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-text-400 hover:text-danger hover:bg-danger/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteModal(true)
            }}
            aria-label="Delete Application"
          >
            <Trash2 size={20} />
          </button>
        )}
      </Card>

      <Modal
        open={showArchivedModal}
        onClose={() => setShowArchivedModal(false)}
        title="Program Unavailable"
      >
        <div className="space-y-4">
          <p className="text-text-600">
            This program is no longer available. The university has archived this program and it is no longer accepting or processing applications.
          </p>
          {canDelete && (
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowArchivedModal(false)}>
                Close
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                Delete Application
              </Button>
            </div>
          )}
          {!canDelete && (
            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowArchivedModal(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Application"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-danger/10 rounded-lg text-danger-dark">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm">
              Are you sure you want to delete this application to <strong>{application.program_name}</strong>? This action cannot be undone.
            </p>
          </div>
          {deleteError && (
            <p className="text-sm text-danger">{deleteError}</p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              disabled={isDeleting}
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isDeleting}
              onClick={handleDelete}
            >
              Delete Application
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
