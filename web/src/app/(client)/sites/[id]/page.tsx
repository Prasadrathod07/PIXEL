'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Link from 'next/link'
import { ExternalLink, ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import { StatusBadge, SeverityBadge, TypeBadge } from '@/components/issues/IssueBadge'
import { cn, formatRelativeTime } from '@/lib/utils'
import { SITE_STATUS_COLORS } from '@/lib/constants'
import type { Site, Issue } from '@/lib/types'

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()

  const {
    data: site,
    refetch: refetchSite,
    isLoading: siteLoading,
  } = useQuery<Site>({
    queryKey: ['site', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/sites/${id}`)
      return data
    },
    enabled: !!id,
  })

  const { data: issues = [], isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ['issues', { site_id: id }],
    queryFn: async () => {
      const { data } = await axios.get(`/api/issues?site_id=${id}`)
      return data
    },
    enabled: !!id,
  })

  // Auto-refresh site status every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => refetchSite(), 30_000)
    return () => clearInterval(timer)
  }, [refetchSite])

  if (siteLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading site…
      </div>
    )
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Site not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard"
            className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{site.name}</h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border',
                  SITE_STATUS_COLORS[site.status]
                )}
              >
                {site.status === 'down' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
                {site.status}
              </span>
            </div>

            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {site.url}
              <ExternalLink className="w-3 h-3" />
            </a>

            <p className="text-xs text-muted-foreground mt-1">
              Last checked {formatRelativeTime(site.last_checked)}
              {' '}· auto-refreshes every 30s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchSite()}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href={`/issues/new?site_id=${site.id}`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Report Issue
          </Link>
        </div>
      </div>

      {/* Issues table */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">
          Issues
          {issues.length > 0 && (
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              ({issues.length})
            </span>
          )}
        </h2>

        {issuesLoading ? (
          <div className="glass rounded-lg p-8 text-center text-sm text-muted-foreground">
            Loading issues…
          </div>
        ) : issues.length === 0 ? (
          <div className="glass rounded-lg p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No issues reported for this site.</p>
            <Link
              href={`/issues/new?site_id=${site.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Report the first issue
            </Link>
          </div>
        ) : (
          <div className="glass rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  {['Title', 'Type', 'Severity', 'Status', 'Reported'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, idx) => (
                  <tr
                    key={issue.id}
                    className={cn(
                      'hover:bg-muted/20 transition-colors',
                      idx < issues.length - 1 && 'border-b border-border/50'
                    )}
                  >
                    <td className="px-4 py-3 max-w-[280px]">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
                      >
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={issue.type} />
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={issue.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(issue.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
