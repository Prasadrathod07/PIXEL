import { cn } from '@/lib/utils'
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  ISSUE_TYPE_LABELS,
} from '@/lib/constants'
import type { IssueStatus, IssueSeverity, IssueType } from '@/lib/types'

interface StatusBadgeProps {
  status: IssueStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        ISSUE_STATUS_COLORS[status],
        className
      )}
    >
      {ISSUE_STATUS_LABELS[status]}
    </span>
  )
}

interface SeverityBadgeProps {
  severity: IssueSeverity
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        SEVERITY_COLORS[severity],
        className
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  )
}

interface TypeBadgeProps {
  type: IssueType
  className?: string
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        'bg-secondary text-secondary-foreground border-border',
        className
      )}
    >
      {ISSUE_TYPE_LABELS[type]}
    </span>
  )
}
