'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { FileText, Upload, Eye, Download } from 'lucide-react'
import type { ApplicationDocument, DocumentChecklistItem } from '@/lib/api'

type DocumentUploadCardProps = {
  item: DocumentChecklistItem
  document: ApplicationDocument | null
  isUploading: boolean
  onUpload: (type: string, file: File) => void
}

export function DocumentUploadCard({ item, document, isUploading, onUpload }: DocumentUploadCardProps) {
  const [showViewer, setShowViewer] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    setFileError(null)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File exceeds 10MB limit. Please choose a smaller file.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFileError(null)
    onUpload(item.type, file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const fileUrl = document?.file ?? null
  const fileExtension = fileUrl ? fileUrl.split('.').pop()?.toLowerCase() : null
  const isImage = fileExtension ? ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension) : false
  const isPdf = fileExtension === 'pdf'

  return (
    <Card padding="md" className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-start gap-4">
        {/* Thumbnail / icon */}
        <div className="shrink-0 w-20 h-24 bg-background rounded border border-border flex items-center justify-center overflow-hidden">
          {document && fileUrl && isImage ? (
            <img
              src={fileUrl}
              alt="Uploaded file"
              className="w-full h-full object-cover"
            />
          ) : document && fileUrl && isPdf ? (
            <div className="flex flex-col items-center gap-1">
              <FileText size={28} className="text-danger" />
              <span className="text-[10px] text-text-400 font-medium">PDF</span>
            </div>
          ) : document && fileUrl ? (
            <FileText size={28} className="text-text-400" />
          ) : (
            <FileText size={28} className="text-text-300" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-text-900">{item.label}</p>
            <StatusBadge
              status={
                document?.status === 'flagged'
                  ? 'flagged'
                  : item.status || (item.uploaded ? 'pending' : 'draft')
              }
            />
          </div>

          {item.uploaded && document && (
            <p className="text-xs text-text-400 truncate">
              Uploaded {new Date(document.created_at).toLocaleDateString()}
            </p>
          )}

          {isUploading && (
            <p className="text-xs text-text-400 flex items-center gap-1.5">
              <span className="animate-pulse">Uploading...</span>
            </p>
          )}

          {fileError && (
            <Alert variant="danger" className="mt-2 text-xs">{fileError}</Alert>
          )}

          {document?.flagged_reason && (
            <p className="text-xs text-danger mt-1">
              {document.flagged_reason}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={item.uploaded ? 'secondary' : 'primary'}
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
          loading={isUploading}
          icon={<Upload size={14} />}
        >
          {item.uploaded ? 'Re-upload' : 'Upload File'}
        </Button>

        {document && fileUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowViewer(true)}
            icon={<Eye size={14} />}
          >
            View
          </Button>
        )}
      </div>

      {/* Document viewer modal */}
      <Modal
        open={showViewer}
        onClose={() => setShowViewer(false)}
        title={item.label}
      >
        <div className="space-y-4">
          {isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded border border-border"
              title={item.label}
            />
          ) : isImage && fileUrl ? (
            <img
              src={fileUrl}
              alt={item.label}
              className="max-w-full rounded border border-border mx-auto"
            />
          ) : fileUrl ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <FileText size={48} className="text-text-400" />
              <p className="text-sm text-text-600">
                Preview not available for this file type.
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Button variant="primary" icon={<Download size={14} />}>
                  Download File
                </Button>
              </a>
            </div>
          ) : null}
        </div>
      </Modal>
    </Card>
  )
}
