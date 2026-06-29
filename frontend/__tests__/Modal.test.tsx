import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('returns nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">
        content
      </Modal>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders content when open', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test">
        content
      </Modal>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders the title', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Confirm Action">
        content
      </Modal>,
    )
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
  })

  it('calls onClose when clicking the overlay background', () => {
    const handleClose = vi.fn()
    const { container } = render(
      <Modal open={true} onClose={handleClose} title="Test">
        content
      </Modal>,
    )
    const overlay = container.firstChild!.firstChild as HTMLElement
    fireEvent.click(overlay)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when pressing Escape', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose} title="Test">
        content
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the close button', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose} title="Test">
        content
      </Modal>,
    )
    fireEvent.click(screen.getByLabelText('Close'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll when open and restores on close', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}} title="Test">
        content
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal open={false} onClose={() => {}} title="Test">
        content
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('sets aria-modal and aria-label on the dialog', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Delete Item">
        content
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Delete Item')
  })

  it('cleans up event listener when unmounted while open', () => {
    const handleClose = vi.fn()
    const { unmount } = render(
      <Modal open={true} onClose={handleClose} title="Test">
        content
      </Modal>,
    )
    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('restores body scroll on unmount while open', () => {
    document.body.style.overflow = ''
    const { unmount } = render(
      <Modal open={true} onClose={() => {}} title="Test">
        content
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
