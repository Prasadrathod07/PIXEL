import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subDays, isAfter } from 'date-fns'
import Link from 'next/link'
import {
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Users,
  Globe,
  Layers,
  ArrowRight,
  Clock,
  Activity,
} from 'lucide-react'
import { StatusBadge, SeverityBadge } from '@/components/issues/IssueBadge'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_COLORS,
  SEVERITY_COLORS,
} from '@/lib/constants'
import type { Issue, TimelineEvent, User } from '@/lib/types'

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  href,
}: {
  label: string
  value: number
  icon: React.ElementType
  iconClass: string
  href?: string
}) {
  const inner = (
    <div className="glass rounded-lg p-5 flex items-start gap-4 hover:glow-sm transition-all">
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          iconClass
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function SeverityDot({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-400',
    high: 'bg-orange-400',
    medium: 'bg-yellow-400',
    low: 'bg-green-400',
  }
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full shrink-0 inline-block',
        map[severity] ?? 'bg-gray-400'
      )}
    />
  )
}

function StatusBarChart({
  counts,
}: {
  counts: Record<string, number>
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  const statuses = [
    'open',
    'in_review',
    'in_progress',
    'waiting_for_client',
    'resolved',
    'closed',
  ]

  const barColors: Record<string, string> = {
    open: 'bg-blue-500',
    in_review: 'bg-purple-500',
    in_progress: 'bg-amber-500',
    waiting_for_client: 'bg-orange-500',
    resolved: 'bg-green-500',
    closed: 'bg-gray-500',
  }

  return (
    <div className="glass rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Issues by Status</h2>
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-px">
        {statuses.map((s) => {
          const count = counts[s] ?? 0
          const pct = (count / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={s}
              title={`${ISSUE_STATUS_LABELS[s]}: ${count}`}
              className={cn('h-full transition-all', barColors[s])}
              style={{ width: `${pct}%` }}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {statuses.map((s) => {
          const count = counts[s] ?? 0
          const pct = Math.round((count / total) * 100)
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-sm shrink-0', barColors[s])} />
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {ISSUE_STATUS_LABELS[s]}
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">
                {count}
              </span>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums w-8 text-right">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ActivityEvent extends TimelineEvent {
  issue_title?: string
  issue_id_ref?: string
}

const EVENT_LABELS: Record<string, string> = {
  created: 'reported an issue',
  status_changed: 'changed status',
  severity_changed: 'changed severity',
  comment_added: 'added a comment',
  response_added: 'sent a response',
  resolved: 'resolved an issue',
  closed: 'closed an issue',
  ai_analyzed: 'ran AI analysis',
  attachment_added: 'added an attachment',
}

export default async function ManagerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const oneWeekAgo = subDays(new Date(), 7).toISOString()

  const [
    { data: allIssues },
    { data: allClients },
    { data: allSites },
    { data: recentTimeline },
  ] = await Promise.all([
    supabase
      .from('issues')
      .select('*, site:sites(id, name), creator:users!created_by(id, name, email, avatar_url)')
      .order('created_at', { ascending: false }),
    supabase.from('users').select('*').eq('role', 'client'),
    supabase.from('sites').select('*, client:users(id, name, email, avatar_url)'),
    supabase
      .from('timeline_events')
      .select(
        '*, author:users(id, name, email, avatar_url), issue:issues(id, title)'
      )
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const issues = (allIssues ?? []) as Array<
    Issue & { site?: { id: string; name: string }; creator?: User }
  >
  const clients = (allClients ?? []) as User[]
  const sites = (allSites ?? []) as Array<{ id: string; client_id: string }>
  const timeline = (recentTimeline ?? []) as Array<
    TimelineEvent & { issue?: { id: string; title: string } }
  >

  // Stats
  const totalIssues = issues.length
  const openCount = issues.filter(
    (i) => i.status !== 'resolved' && i.status !== 'closed'
  ).length
  const inProgressCount = issues.filter((i) => i.status === 'in_progress').length
  const resolvedThisWeek = issues.filter(
    (i) =>
      (i.status === 'resolved' || i.status === 'closed') &&
      isAfter(new Date(i.updated_at), new Date(oneWeekAgo))
  ).length
  const totalClients = clients.length
  const totalSites = sites.length

  // Status counts for chart
  const statusCounts: Record<string, number> = {}
  for (const issue of issues) {
    statusCounts[issue.status] = (statusCounts[issue.status] ?? 0) + 1
  }

  // Attention: Critical or High, Open or In Review
  const attentionIssues = issues.filter(
    (i) =>
      (i.severity === 'critical' || i.severity === 'high') &&
      (i.status === 'open' || i.status === 'in_review')
  )

  // Client overview: per-client stats
  const clientStats = clients.map((c) => {
    const clientSites = sites.filter((s) => s.client_id === c.id)
    const openIssues = issues.filter(
      (i) =>
        clientSites.some((s) => s.id === i.site_id) &&
        i.status !== 'resolved' &&
        i.status !== 'closed'
    )
    return {
      client: c,
      siteCount: clientSites.length,
      openIssueCount: openIssues.length,
    }
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {greeting}, Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Issues"
          value={totalIssues}
          icon={Layers}
          iconClass="bg-blue-500/10 text-blue-400"
          href="/manager/issues"
        />
        <StatCard
          label="Open"
          value={openCount}
          icon={AlertCircle}
          iconClass="bg-red-500/10 text-red-400"
          href="/manager/issues"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={TrendingUp}
          iconClass="bg-amber-500/10 text-amber-400"
          href="/manager/issues"
        />
        <StatCard
          label="Resolved This Week"
          value={resolvedThisWeek}
          icon={CheckCircle}
          iconClass="bg-green-500/10 text-green-400"
        />
        <StatCard
          label="Total Clients"
          value={totalClients}
          icon={Users}
          iconClass="bg-purple-500/10 text-purple-400"
          href="/manager/clients"
        />
        <StatCard
          label="Total Sites"
          value={totalSites}
          icon={Globe}
          iconClass="bg-cyan-500/10 text-cyan-400"
          href="/manager/sites"
        />
      </div>

      {/* Middle row: Attention + Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Issues requiring attention */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Requires Attention
            </h2>
            <Link
              href="/manager/issues"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          {attentionIssues.length === 0 ? (
            <div className="glass rounded-lg p-6 text-center text-sm text-muted-foreground">
              No critical or high severity open issues.
            </div>
          ) : (
            <div className="space-y-2">
              {attentionIssues.slice(0, 6).map((issue) => (
                <Link
                  key={issue.id}
                  href={`/manager/issues/${issue.id}`}
                  className={cn(
                    'glass rounded-lg p-3.5 flex items-start gap-3 hover:glow-sm transition-all block group',
                    issue.severity === 'critical' &&
                      'border border-red-500/10 bg-red-500/3',
                    issue.severity === 'high' &&
                      'border border-orange-500/10 bg-orange-500/3'
                  )}
                >
                  <SeverityDot severity={issue.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {issue.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {issue.site?.name ?? '—'} ·{' '}
                      {formatRelativeTime(issue.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SeverityBadge severity={issue.severity} />
                    <StatusBadge status={issue.status} />
                  </div>
                </Link>
              ))}
              {attentionIssues.length > 6 && (
                <Link
                  href="/manager/issues"
                  className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors py-2"
                >
                  +{attentionIssues.length - 6} more
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Status chart */}
        <StatusBarChart counts={statusCounts} />
      </div>

      {/* Bottom row: Recent Activity + Client Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            Recent Activity
          </h2>

          {timeline.length === 0 ? (
            <div className="glass rounded-lg p-6 text-center text-sm text-muted-foreground">
              No recent activity.
            </div>
          ) : (
            <div className="glass rounded-lg divide-y divide-border/50 overflow-hidden">
              {timeline.map((event) => (
                <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase shrink-0 mt-0.5">
                    {event.author ? getInitials(event.author.name) : 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">
                        {event.author?.name ?? 'System'}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {EVENT_LABELS[event.event_type] ?? event.event_type}
                      </span>
                      {event.issue && (
                        <>
                          {' '}
                          <Link
                            href={`/manager/issues/${event.issue.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {event.issue.title}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelativeTime(event.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Client Overview
            </h2>
            <Link
              href="/manager/clients"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          {clientStats.length === 0 ? (
            <div className="glass rounded-lg p-6 text-center text-sm text-muted-foreground">
              No clients yet.
            </div>
          ) : (
            <div className="glass rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Client
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sites
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Open Issues
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {clientStats.map(({ client, siteCount, openIssueCount }, idx) => (
                    <tr
                      key={client.id}
                      className={cn(
                        'hover:bg-muted/20 transition-colors',
                        idx < clientStats.length - 1 && 'border-b border-border/50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0 uppercase">
                            {getInitials(client.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {client.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {client.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-foreground font-medium tabular-nums">
                          {siteCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'text-sm font-medium tabular-nums',
                            openIssueCount > 0
                              ? 'text-amber-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          {openIssueCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/manager/issues?client=${client.id}`}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
