import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  Globe,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  ExternalLink,
  Plus,
  Activity,
} from 'lucide-react'
import { StatusBadge, SeverityBadge } from '@/components/issues/IssueBadge'
import { cn, formatRelativeTime } from '@/lib/utils'
import { SITE_STATUS_COLORS } from '@/lib/constants'

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: number
  icon: React.ElementType
  iconClass: string
}) {
  return (
    <div className="glass rounded-lg p-5 flex items-start gap-4 hover:glow-sm transition-all">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function SiteStatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full inline-block shrink-0',
        status === 'online' && 'bg-green-400',
        status === 'down' && 'bg-red-400 animate-pulse',
        status === 'degraded' && 'bg-yellow-400',
        status === 'unknown' && 'bg-gray-400'
      )}
    />
  )
}

export default async function ClientDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: userData }, { data: sites }, { data: rawIssues }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('sites').select('*').eq('client_id', user.id).order('created_at', { ascending: false }),
    supabase
      .from('issues')
      .select('*, site:sites(id, name)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!userData) redirect('/login')

  const issues = rawIssues ?? []
  const siteList = sites ?? []

  const openCount = issues.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length
  const inProgressCount = issues.filter((i) => i.status === 'in_progress').length
  const resolvedCount = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length

  const openBySite: Record<string, number> = {}
  for (const issue of issues) {
    if (issue.status !== 'resolved' && issue.status !== 'closed') {
      openBySite[issue.site_id] = (openBySite[issue.site_id] ?? 0) + 1
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userData.name?.split(' ')[0] ?? userData.email

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sites"
          value={siteList.length}
          icon={Globe}
          iconClass="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="Open Issues"
          value={openCount}
          icon={AlertCircle}
          iconClass="bg-red-500/10 text-red-400"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={TrendingUp}
          iconClass="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          icon={CheckCircle}
          iconClass="bg-green-500/10 text-green-400"
        />
      </div>

      {/* Sites overview grid */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">Your Sites</h2>
        {siteList.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center text-sm text-muted-foreground">
            No sites configured yet. Contact your manager to set up your sites.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {siteList.map((site) => (
              <Link
                key={site.id}
                href={`/sites/${site.id}`}
                className="glass rounded-lg p-4 hover:glow-sm transition-all block group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <SiteStatusDot status={site.status} />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {site.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0',
                      SITE_STATUS_COLORS[site.status]
                    )}
                  >
                    {site.status}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{site.url}</span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {formatRelativeTime(site.last_checked)}
                  </span>
                  {(openBySite[site.id] ?? 0) > 0 && (
                    <span className="text-amber-400 font-medium">
                      {openBySite[site.id]} open
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Issues table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">Recent Issues</h2>
          <Link href="/issues" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {issues.length === 0 ? (
          <div className="glass rounded-lg p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No issues reported yet.</p>
            <Link
              href="/issues/new"
              className="inline-flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Report your first issue
            </Link>
          </div>
        ) : (
          <div className="glass rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Site
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Severity
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Reported
                  </th>
                </tr>
              </thead>
              <tbody>
                {issues.slice(0, 5).map((issue, idx) => (
                  <tr
                    key={issue.id}
                    className={cn(
                      'hover:bg-muted/20 transition-colors',
                      idx < Math.min(issues.length, 5) - 1 && 'border-b border-border/50'
                    )}
                  >
                    <td className="px-4 py-3 max-w-[260px]">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
                      >
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(issue as { site?: { name: string } }).site?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={issue.severity} />
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
