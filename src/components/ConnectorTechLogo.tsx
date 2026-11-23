import type { ReactElement } from 'react'

export function normalizeConnectorKey(raw?: string): string {
  const k = (raw || '').toLowerCase().trim()
  if (k.includes('fabric') || k.includes('onelake')) return 'fabric'
  if (k.includes('d365') || k.includes('dynamics') || k.includes('dataverse'))
    return 'd365'
  if (k.includes('supabase')) return 'supabase'
  if (k.includes('mysql') || k.includes('mariadb')) return 'mysql'
  if (
    k.includes('postgres') ||
    k === 'pg' ||
    k.includes('cockroach') ||
    k.includes('timescale') ||
    k.includes('redshift') ||
    k.includes('postgis')
  )
    return 'postgres'
  if (k.includes('mongo') || k.includes('atlas')) return 'mongodb'
  if (k.includes('rest') || k === 'api' || k.includes('http'))
    return 'rest_api'
  if (k.includes('sqlite') || k.includes('relational')) return 'relational'
  if (
    k.includes('sheet') ||
    k.includes('csv') ||
    k.includes('excel') ||
    k === 'file'
  )
    return 'sheet'
  if (k.includes('memory') || k.includes('mock')) return 'memory'
  return 'default'
}

export function ConnectorTechLogo({
  connectorType,
  size = 'md',
}: {
  connectorType?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const key = normalizeConnectorKey(connectorType)

  const wrapperClass =
    size === 'sm'
      ? 'h-7 w-7 rounded-lg p-1.5'
      : size === 'lg'
        ? 'h-11 w-11 rounded-xl p-2'
        : 'h-9 w-9 rounded-lg p-1.5'

  const icons: Record<string, ReactElement> = {
    fabric: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M5 17.5L13.5 4h5.5L10.5 17.5H5z" fill="#117865" />
        <path d="M5 12.5L10.5 4H16l-5.5 8.5H5z" fill="#29B596" />
        <path d="M5 20l4-6h5.5l-4 6H5z" fill="#0B5345" />
      </svg>
    ),
    d365: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M5 4l9 4.5v5L5 9V4z" fill="#2A4494" />
        <path d="M5 11l14 4.5-14 4.5v-9z" fill="#0078D4" />
      </svg>
    ),
    supabase: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path
          d="M13.5 2.5L4.5 14h7.5l-1.5 7.5L19.5 10H12l1.5-7.5z"
          fill="#3ECF8E"
        />
      </svg>
    ),
    postgres: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <ellipse cx="12" cy="11" rx="7" ry="6.5" fill="#336791" />
        <path
          d="M15.5 14.5v4.5a2 2 0 01-4 0v-2"
          stroke="#336791"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx="9.8" cy="9.8" r="1.1" fill="#ffffff" />
        <circle cx="14.2" cy="9.8" r="1.1" fill="#ffffff" />
      </svg>
    ),
    mysql: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path
          d="M4 16c2.5-5.5 6.5-8.5 12-8.5 2.2 0 3.5.8 4 2-2.2.3-3.5 1.5-4 3.5 1.5.5 2.8 1.5 3.5 3"
          stroke="#00758F"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="15" cy="10.2" r="1" fill="#F29111" />
      </svg>
    ),
    mongodb: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path
          d="M12 2.5C8.5 7 7 10.2 7 13.5c0 3.2 2.2 5.4 5 6.5 2.8-1.1 5-3.3 5-6.5 0-3.3-1.5-6.5-5-11z"
          fill="#47A248"
        />
        <line
          x1="12"
          y1="11"
          x2="12"
          y2="21.5"
          stroke="#2B6B2C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    rest_api: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path
          d="M8.5 7L4 12l4.5 5M15.5 7L20 12l-4.5 5M13.5 5.5l-3 13"
          stroke="#39359D"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    relational: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <ellipse cx="12" cy="6" rx="7" ry="2.8" fill="#0F80CC" />
        <path
          d="M5 6v6c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6"
          stroke="#0F80CC"
          strokeWidth="2"
        />
        <path
          d="M5 12v6c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-6"
          stroke="#0F80CC"
          strokeWidth="2"
        />
      </svg>
    ),
    sheet: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2.5" fill="#16A34A" />
        <path
          d="M4 9.5h16M4 14.5h16M10 4v16"
          stroke="#ffffff"
          strokeWidth="1.6"
        />
      </svg>
    ),
    memory: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <rect
          x="6"
          y="6"
          width="12"
          height="12"
          rx="2.5"
          stroke="#6366F1"
          strokeWidth="2.1"
        />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="#6366F1" />
        <path
          d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"
          stroke="#6366F1"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <ellipse
          cx="12"
          cy="6.5"
          rx="7"
          ry="2.8"
          stroke="#39359D"
          strokeWidth="2"
        />
        <path
          d="M5 6.5v5.5c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6.5"
          stroke="#39359D"
          strokeWidth="2"
        />
        <path
          d="M5 12v5.5c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V12"
          stroke="#39359D"
          strokeWidth="2"
        />
      </svg>
    ),
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center border border-[#E2E8F0] bg-[#F8FAFC] ${wrapperClass}`}
    >
      {icons[key]}
    </div>
  )
}