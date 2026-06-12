import { cn } from '@/lib/utils'
import {
  ISSUE_STATUS_COLORS,
  ISSUE_STATUS_LABELS,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  SITE_STATUS_COLORS,
  ISSUE_TYPE_LABELS,
} from '@/lib/constants'

type StatusBadgeType = 'issue_status' | 'severity' | 'site_status' | 'issue_type'

interface StatusBadgeProps {
  type: StatusBadgeType
  value: string
  className?: string
  dot?: boolean
}

const colorMaps: Record<StatusBadgeType, Record<string, string>> = {
  issue_status: ISSUE_STATUS_COLORS,
  severity: SEVERITY_COLORS,
  site_status: SITE_STATUS_COLORS,
  issue_type: {
    bug: 'bg-red-500/10 text-red-400 border-red-500/20',
    feedback: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    suggestion: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    improvement: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
}

const labelMaps: Record<StatusBadgeType, Record<string, string>> = {
  issue_status: ISSUE_STATUS_LABELS,
  severity: SEVERITY_LABELS,
  site_status: { online: 'Online', down: 'Down', degraded: 'Degraded', unknown: 'Unknown' },
  issue_type: ISSUE_TYPE_LABELS,
}

const dotColorMap: Record<string, string> = {
  online: 'bg-green-400 animate-pulse',
  down: 'bg-red-400',
  degraded: 'bg-yellow-400',
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  open: 'bg-blue-400',
  resolved: 'bg-green-400',
}

export function StatusBadge({ type, value, className, dot }: StatusBadgeProps) {
  const colors = colorMaps[type]?.[value] ?? 'bg-muted/50 text-muted-foreground border-transparent'
  const label = labelMaps[type]?.[value] ?? value
  const dotColor = dotColorMap[value]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
        colors,
        className
      )}
    >
      {dot && dotColor && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
      )}
      {label}
    </span>
  )
}
