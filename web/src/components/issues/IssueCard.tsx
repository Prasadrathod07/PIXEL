import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { StatusBadge, SeverityBadge } from './IssueBadge'
import type { Issue } from '@/lib/types'

interface IssueCardProps {
  issue: Issue
  href: string
}

export function IssueCard({ issue, href }: IssueCardProps) {
  return (
    <Link href={href} className="block glass rounded-lg p-4 hover:glow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{issue.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{issue.site?.name ?? 'Unknown site'}</span>
        <span>{formatRelativeTime(issue.created_at)}</span>
      </div>
    </Link>
  )
}
