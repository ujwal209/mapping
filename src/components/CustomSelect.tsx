import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  id,
}: {
  value: string
  onChange: (val: string) => void
  options: readonly (string | SelectOption)[]
  placeholder?: string
  disabled?: boolean
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const normalized: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )

  const selected = normalized.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border px-3 text-left text-[13.5px] transition-all outline-none ${
          open
            ? 'border-[#39359D] bg-white ring-2 ring-[#39359D]/12'
            : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
        } ${disabled ? 'cursor-not-allowed opacity-55' : ''}`}
      >
        <span
          className={`truncate ${
            selected ? 'font-medium text-[#0F172A]' : 'text-[#94A3B8]'
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-[#64748B] transition-transform duration-150 ${
            open ? 'rotate-180 text-[#39359D]' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)]"
        >
          {normalized.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                  isSelected
                    ? 'bg-[#39359D]/[0.08] font-semibold text-[#39359D]'
                    : 'font-normal text-[#1E293B] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate">{opt.label}</div>
                  {opt.hint && (
                    <div className="truncate text-[11px] text-[#64748B]">
                      {opt.hint}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#39359D]" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}