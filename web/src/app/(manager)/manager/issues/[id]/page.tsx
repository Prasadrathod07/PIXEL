'use client'

import { use, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Link from 'next/link'
import {
  ArrowLeft,
  Globe,
  Calendar,
  User2,
  ExternalLink,
  Mail,
  Hash,
} from 'lucide-react'
import { StatusBadge, SeverityBadge, TypeBadge } from '@/components/issues/IssueBadge'
import { IssueTimeline } from '@/components/issues/IssueTimeline'
import { IssueManagementPanel } from '@/components/issues/IssueManagementPanel'
import { AIInsightsPanel } from '@/components/ai/AIInsightsPanel'
import { cn, formatDate, formatDateTime, formatRelativeTime, getInitials } from '@/lib/utils'
import { SITE_STATUS_COLORS } from '@/lib/constants'
import type { Issue, TimelineEvent, IssueStatus, IssueSeverity } from '@/lib/types'

type IssueWithAll = Issue & {
  site?: {
    id: string
    name: string
    url: string
    status: string
    last_checked: string
  }
  creator?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  assignee?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  timeline?: TimelineEvent[]
}

export default function ManagerIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <IssueDetailInner id={id} />
}

function IssueDetailInner({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const [responseText, setResponseText] = useState('')

  const { data: issue, isLoading, error } = useQuery<IssueWithAll>({
    queryKey: ['manager-issue', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/issues/${id}`)
      return data
    },
  })

  const handleUpdated = useCallback(
    (updates: { status?: IssueStatus; severity?: IssueSeverity }) => {
      queryClient.setQueryData<IssueWithAll>(['manager-issue', id], (prev) =>
        prev ? { ...prev, ...updates } : prev
      )
    },
    [id, queryClient]
  )

  const handleResponseSent = useCallback(
    (event: unknown) => {
      queryClient.setQueryData<IssueWithAll>(['manager-issue', id], (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'waiting_for_client' as IssueStatus,
          timeline: [...(prev.timeline ?? []), event as TimelineEvent],
        }
      })
    },
    [id, queryClient]
  )

  const handleCopyToResponse = useCallback((text: string) => {
    setResponseText(text)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading issue…
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Issue not found.
      </div>
    )
  }

  const timeline = issue.timeline ?? []

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-start gap-3">
        <Link
          href="/manager/issues"
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground leading-tight flex-1 min-w-0">
              {issue.title}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <SeverityBadge severity={issue.severity} />
              <StatusBadge status={issue.status} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {id.slice(0, 8)}
            </span>
            <span>·</span>
            <span>Reported {formatRelativeTime(issue.created_at)}</span>
            {issue.creator && (
              <>
                <span>·</span>
                <span>{issue.creator.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px_280px] gap-6">
        {/* LEFT: Description + Timeline */}
        <div className="space-y-5 min-w-0">
          {/* Badges + meta */}
          <div className="glass rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={issue.status} />
              <SeverityBadge severity={issue.severity} />
              <TypeBadge type={issue.type} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
              {issue.site && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{issue.site.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{formatDate(issue.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User2 className="w-3.5 h-3.5 shrink-0" />
                <span>{issue.creator?.name ?? 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {issue.description}
            </p>
          </div>

          {/* Attachment */}
          {issue.attachment_url && (
            <div className="glass rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3">Attachment</h2>
              <a
                href={issue.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                {issue.attachment_name ?? 'Download attachment'}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-4">Activity Timeline</h2>
            <IssueTimeline events={timeline} />
          </div>
        </div>

        {/* MIDDLE: Management panel */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Manage</h2>
          <IssueManagementPanel
            issueId={id}
            initialStatus={issue.status}
            initialSeverity={issue.severity}
            onUpdated={handleUpdated}
            onResponseSent={handleResponseSent}
            prefillResponse={responseText || undefined}
          />
        </div>

        {/* RIGHT: AI + info */}
        <div className="space-y-4">
          {/* AI Insights */}
          <AIInsightsPanel
            issue={issue}
            onCopyToResponse={handleCopyToResponse}
          />

          {/* Client info */}
          {issue.creator && (
            <div className="glass rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Client
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 uppercase">
                  {getInitials(issue.creator.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {issue.creator.name}
                  </p>
                  <a
                    href={`mailto:${issue.creator.email}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 truncate"
                  >
                    <Mail className="w-2.5 h-2.5 shrink-0" />
                    {issue.creator.email}
                  </a>
                </div>
              </div>
              <Link
                href={`/manager/issues?client=${issue.creator.id}`}
                className="text-xs text-primary hover:underline block"
              >
                View all their issues →
              </Link>
            </div>
          )}

          {/* Site info */}
          {issue.site && (
            <div className="glass rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Site
              </p>
              <div>
                <p className="text-sm font-medium text-foreground">{issue.site.name}</p>
                <a
                  href={issue.site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-1 truncate"
                >
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  {issue.site.url}
                </a>
              </div>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                  SITE_STATUS_COLORS[issue.site.status] ??
                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                )}
              >
                {issue.site.status}
              </span>
            </div>
          )}

          {/* Metadata */}
          <div className="glass rounded-lg p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Metadata
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-foreground text-[11px]">
                  {id.slice(0, 12)}…
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground text-right">
                  {formatDate(issue.created_at)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-foreground text-right">
                  {formatRelativeTime(issue.updated_at)}
                </span>
              </div>
              {issue.assignee && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Assigned to</span>
                  <span className="text-foreground">{issue.assignee.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
