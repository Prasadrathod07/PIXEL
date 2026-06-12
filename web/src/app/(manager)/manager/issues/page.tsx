'use client'

import { useState, useMemo, useCallback, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  Layers,
  X,
  CheckSquare,
  Square,
} from 'lucide-react'
import { StatusBadge, SeverityBadge, TypeBadge } from '@/components/issues/IssueBadge'
import { cn, formatRelativeTime, formatDate } from '@/lib/utils'
import { ISSUE_STATUS_LABELS, SEVERITY_LABELS } from '@/lib/constants'
import type { Issue, IssueStatus, IssueSeverity, Site, User } from '@/lib/types'
import { toast } from 'sonner'

const PAGE_SIZE = 20

const selectClass =
  'bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[130px]'

type SortKey = 'newest' | 'oldest' | 'severity' | 'status'

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const STATUS_OPTIONS: { value: IssueStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_client', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const SEVERITY_OPTIONS: { value: IssueSeverity | ''; label: string }[] = [
  { value: '', label: 'All Severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'severity', label: 'Highest severity' },
  { value: 'status', label: 'By status' },
]

type IssueWithRelations = Issue & {
  site?: { id: string; name: string }
  creator?: User
}

export default function ManagerIssuesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}>
      <ManagerIssuesInner />
    </Suspense>
  )
}

function ManagerIssuesInner() {
  const searchParams = useSearchParams()
  const initialClient = searchParams?.get('client') ?? ''
  const initialSite = searchParams?.get('site') ?? ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('')
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | ''>('')
  const [clientFilter, setClientFilter] = useState(initialClient)
  const [siteFilter, setSiteFilter] = useState(initialSite)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<IssueStatus | ''>('')

  const queryClient = useQueryClient()

  const { data: issues = [], isLoading } = useQuery<IssueWithRelations[]>({
    queryKey: ['manager-issues'],
    queryFn: async () => {
      const { data } = await axios.get('/api/issues')
      return data
    },
  })

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['manager-sites'],
    queryFn: async () => {
      const { data } = await axios.get('/api/sites')
      return data
    },
  })

  // Derive unique clients from issues
  const uniqueClients = useMemo(() => {
    const map = new Map<string, User>()
    for (const issue of issues) {
      if (issue.creator && !map.has(issue.creator.id)) {
        map.set(issue.creator.id, issue.creator)
      }
    }
    return Array.from(map.values())
  }, [issues])

  // Filter sites by selected client
  const filteredSites = useMemo(() => {
    if (!clientFilter) return sites
    return sites.filter((s) => {
      const issue = issues.find((i) => i.site_id === s.id && i.creator?.id === clientFilter)
      return !!issue
    })
  }, [sites, clientFilter, issues])

  const filtered = useMemo(() => {
    let result = issues.filter((issue) => {
      if (statusFilter && issue.status !== statusFilter) return false
      if (severityFilter && issue.severity !== severityFilter) return false
      if (siteFilter && issue.site_id !== siteFilter) return false
      if (clientFilter && issue.creator?.id !== clientFilter) return false
      if (dateFrom && new Date(issue.created_at) < new Date(dateFrom)) return false
      if (dateTo && new Date(issue.created_at) > new Date(dateTo + 'T23:59:59')) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !issue.title.toLowerCase().includes(q) &&
          !issue.description?.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })

    result = [...result].sort((a, b) => {
      if (sort === 'newest')
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'oldest')
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'severity')
        return (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      return 0
    })

    return result
  }, [
    issues,
    statusFilter,
    severityFilter,
    siteFilter,
    clientFilter,
    dateFrom,
    dateTo,
    search,
    sort,
  ])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetPage = () => setPage(1)

  const isAllSelected =
    paginated.length > 0 && paginated.every((i) => selectedIds.has(i.id))

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isAllSelected) {
        paginated.forEach((i) => next.delete(i.id))
      } else {
        paginated.forEach((i) => next.add(i.id))
      }
      return next
    })
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const bulkUpdate = useMutation({
    mutationFn: async (status: IssueStatus) => {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          axios.patch(`/api/issues/${id}`, { status })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-issues'] })
      setSelectedIds(new Set())
      setBulkStatus('')
      toast.success(`Updated ${selectedIds.size} issues`)
    },
    onError: () => toast.error('Bulk update failed'),
  })

  const hasActiveFilters =
    !!search || !!statusFilter || !!severityFilter || !!clientFilter || !!siteFilter || !!dateFrom || !!dateTo

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('')
    setSeverityFilter('')
    setClientFilter('')
    setSiteFilter('')
    setDateFrom('')
    setDateTo('')
    resetPage()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">All Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? '—' : `${filtered.length} of ${issues.length} issues`}
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-2 hover:bg-muted/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="glass rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title or description…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage() }}
              className="w-full bg-muted/50 border border-border rounded-md pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as IssueStatus | ''); resetPage() }}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value as IssueSeverity | ''); resetPage() }}
            className={selectClass}
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Client */}
          <select
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); setSiteFilter(''); resetPage() }}
            className={selectClass}
          >
            <option value="">All Clients</option>
            {uniqueClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Site */}
          <select
            value={siteFilter}
            onChange={(e) => { setSiteFilter(e.target.value); resetPage() }}
            className={selectClass}
          >
            <option value="">All Sites</option>
            {filteredSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date range + sort */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Date range:</span>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            className="bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            className="bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey) }}
            className={cn(selectClass, 'ml-auto')}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as IssueStatus | '')}
              className="bg-background border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Change status to…</option>
              {STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => bulkStatus && bulkUpdate.mutate(bulkStatus as IssueStatus)}
              disabled={!bulkStatus || bulkUpdate.isPending}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="glass rounded-lg p-10 text-center text-sm text-muted-foreground">
          Loading issues…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-lg p-14 text-center">
          <Layers className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-base font-medium text-foreground mb-2">
            {issues.length === 0 ? 'No issues yet' : 'No results'}
          </p>
          <p className="text-sm text-muted-foreground">
            {issues.length === 0
              ? 'Issues reported by clients will appear here.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <>
          <div className="glass rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={toggleAll}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  {[
                    'Title',
                    'Client',
                    'Site',
                    'Type',
                    'Severity',
                    'Status',
                    'Created',
                    'Updated',
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
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
                    onClick={() => toggleOne(issue.id)}
                    className={cn(
                      'transition-colors cursor-pointer group',
                      idx < paginated.length - 1 && 'border-b border-border/50',
                      selectedIds.has(issue.id)
                        ? 'bg-primary/5'
                        : issue.severity === 'critical'
                        ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]'
                        : issue.severity === 'high'
                        ? 'bg-orange-500/[0.03] hover:bg-orange-500/[0.06]'
                        : 'hover:bg-muted/20'
                    )}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleOne(issue.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {selectedIds.has(issue.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <Link
                        href={`/manager/issues/${issue.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
                      >
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {issue.creator?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {issue.site?.name ?? '—'}
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
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {formatDate(issue.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {formatRelativeTime(issue.updated_at)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/manager/issues/${issue.id}`}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        Manage →
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
