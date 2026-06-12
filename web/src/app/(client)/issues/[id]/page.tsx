import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Calendar, User2, Sparkles, Paperclip } from 'lucide-react'
import { StatusBadge, SeverityBadge, TypeBadge } from '@/components/issues/IssueBadge'
import { IssueTimeline } from '@/components/issues/IssueTimeline'
import { ClientCommentForm } from '@/components/issues/ClientCommentForm'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import type { IssueSeverity, TimelineEvent } from '@/lib/types'

export default async function ClientIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: issue, error } = await supabase
    .from('issues')
    .select(
      '*, site:sites(id, name, url), creator:users!created_by(id, name, email, avatar_url)'
    )
    .eq('id', id)
    .eq('created_by', user.id)
    .single()

  if (error || !issue) notFound()

  const { data: rawTimeline } = await supabase
    .from('timeline_events')
    .select('*, author:users(id, name, email, avatar_url)')
    .eq('issue_id', id)
    .order('created_at', { ascending: true })

  const timeline = (rawTimeline ?? []) as TimelineEvent[]

  // Parse AI recommended actions safely
  let recommendedActions: string[] = []
  if (issue.ai_recommended_actions) {
    try {
      const parsed =
        typeof issue.ai_recommended_actions === 'string'
          ? JSON.parse(issue.ai_recommended_actions)
          : issue.ai_recommended_actions
      if (Array.isArray(parsed)) recommendedActions = parsed
    } catch {
      recommendedActions = []
    }
  }

  const similarIssues: Array<{ id: string; title: string }> = Array.isArray(
    issue.ai_similar_issues
  )
    ? issue.ai_similar_issues
    : []

  const hasAI = !!issue.ai_summary

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-start gap-3">
        <Link
          href="/issues"
          className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">{issue.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reported {formatRelativeTime(issue.created_at)}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — 2/3 */}
        <div className="lg:col-span-2 space-y-5">
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
                  <Link
                    href={`/sites/${issue.site.id}`}
                    className="hover:text-foreground transition-colors truncate"
                  >
                    {issue.site.name}
                  </Link>
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
            <h2 className="text-sm font-medium text-foreground mb-3">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {issue.description}
            </p>
          </div>

          {/* Attachment */}
          {(issue.attachment_url || issue.attachment_name) && (
            <div className="glass rounded-lg p-5">
              <h2 className="text-sm font-medium text-foreground mb-3">Attachment</h2>
              {issue.attachment_url ? (
                <a
                  href={issue.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {issue.attachment_name ?? 'Download attachment'}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="w-3.5 h-3.5" />
                  {issue.attachment_name}
                </span>
              )}
            </div>
          )}

          {/* Timeline */}
          <div>
            <h2 className="text-sm font-medium text-foreground mb-4">Activity Timeline</h2>
            <IssueTimeline events={timeline} />
          </div>

          {/* Client comment form */}
          <div className="glass rounded-lg p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">Add a Comment</h2>
            <ClientCommentForm issueId={id} />
          </div>
        </div>

        {/* RIGHT — 1/3 */}
        <div className="space-y-4">
          {/* Status card */}
          <div className="glass rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Status
            </p>
            <StatusBadge status={issue.status} />
          </div>

          {/* Severity card */}
          <div className="glass rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Severity
            </p>
            <SeverityBadge severity={issue.severity} />
          </div>

          {/* Site card */}
          {issue.site && (
            <div className="glass rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Site
              </p>
              <Link
                href={`/sites/${issue.site.id}`}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors block"
              >
                {issue.site.name}
              </Link>
              <p className="text-xs text-muted-foreground mt-1 truncate">{issue.site.url}</p>
            </div>
          )}

          {/* AI Insights panel */}
          {hasAI && (
            <div className="glass rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">AI Analysis</p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{issue.ai_summary}</p>

              {issue.ai_suggested_severity && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Suggested severity</p>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={issue.ai_suggested_severity as IssueSeverity} />
                    {issue.ai_suggested_severity !== issue.severity && (
                      <span className="text-xs text-amber-400">differs from current</span>
                    )}
                  </div>
                </div>
              )}

              {recommendedActions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Recommended actions</p>
                  <ul className="space-y-1.5">
                    {recommendedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {similarIssues.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Similar issues</p>
                  <div className="flex flex-wrap gap-1.5">
                    {similarIssues.slice(0, 3).map((si) => (
                      <Link
                        key={si.id}
                        href={`/issues/${si.id}`}
                        className={cn(
                          'text-xs bg-muted/50 border border-border text-muted-foreground px-2 py-0.5 rounded',
                          'hover:text-foreground hover:border-border/80 transition-colors max-w-[180px] truncate block'
                        )}
                      >
                        {si.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
