import { useEffect } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface ConfirmDeleteModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = 'Delete Connector',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, loading, onClose])

  if (!open) return null

  return (
    <div
      onClick={() => !loading && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1.5px] animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="text-[15px] font-semibold text-[#0F172A]"
              >
                {title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] bg-[#FAFAFA] px-5 py-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[12.5px] font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[12.5px] font-medium text-white shadow-2xs transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}