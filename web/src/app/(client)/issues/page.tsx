'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Link from 'next/link'
import { Plus, Search, FileText } from 'lucide-react'
import { StatusBadge, SeverityBadge, TypeBadge } from '@/components/issues/IssueBadge'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Issue, Site } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_client', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severity' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const PAGE_SIZE = 10

const selectClass =
  'bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary'

export default function ClientIssuesPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ['issues'],
    queryFn: async () => {
      const { data } = await axios.get('/api/issues')
      return data
    },
  })

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get('/api/sites')
      return data
    },
  })

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (statusFilter && issue.status !== statusFilter) return false
      if (severityFilter && issue.severity !== severityFilter) return false
      if (siteFilter && issue.site_id !== siteFilter) return false
      if (search && !issue.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [issues, statusFilter, severityFilter, siteFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetPage() {
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? '—' : `${issues.length} total issue${issues.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/issues/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Report Issue
        </Link>
      </div>

      {/* Filter bar */}
      <div className="glass rounded-lg p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            className="w-full bg-muted/50 border border-border rounded-md pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage() }}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); resetPage() }}
          className={selectClass}
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={siteFilter}
          onChange={(e) => { setSiteFilter(e.target.value); resetPage() }}
          className={selectClass}
        >
          <option value="">All Sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="glass rounded-lg p-10 text-center text-sm text-muted-foreground">
          Loading issues…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-lg p-14 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
          <p className="text-base font-medium text-foreground mb-2">
            {issues.length === 0 ? 'No issues yet' : 'No results'}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {issues.length === 0
              ? "You haven't reported any issues yet."
              : 'Try adjusting your filters.'}
          </p>
          {issues.length === 0 && (
            <Link
              href="/issues/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Report your first issue
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="glass rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  {['Title', 'Site', 'Type', 'Severity', 'Status', 'Reported', ''].map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((issue, idx) => (
                  <tr
                    key={issue.id}
                    className={cn(
                      'hover:bg-muted/20 transition-colors',
                      idx < paginated.length - 1 && 'border-b border-border/50'
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
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {(issue as Issue & { site?: { name: string } }).site?.name ?? '—'}
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
                    <td className="px-4 py-3">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-border rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-border rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
