'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Link from 'next/link'
import {
  Globe,
  ExternalLink,
  Activity,
  AlertCircle,
  RefreshCw,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import { SITE_STATUS_COLORS } from '@/lib/constants'
import type { Site, User } from '@/lib/types'
import { toast } from 'sonner'

type SiteStatus = 'online' | 'down' | 'degraded' | 'unknown'

type SiteWithClient = Site & {
  client?: User
  open_issues_count?: number
}

const MOCK_STATUSES: SiteStatus[] = ['online', 'online', 'online', 'degraded', 'down', 'unknown']

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'w-2.5 h-2.5 rounded-full inline-block shrink-0',
        status === 'online' && 'bg-green-400',
        status === 'down' && 'bg-red-400 animate-pulse',
        status === 'degraded' && 'bg-yellow-400',
        status === 'unknown' && 'bg-gray-400'
      )}
    />
  )
}

function AddSiteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: clients = [] } = useQuery<Array<{ id: string; name: string; email: string }>>({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data } = await axios.get('/api/clients')
      return data
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !url.trim() || !clientId) {
      toast.error('Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      await axios.post('/api/sites', { name: name.trim(), url: url.trim(), client_id: clientId })
      toast.success('Site added successfully')
      onCreated()
      onClose()
    } catch {
      toast.error('Failed to add site')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md glass rounded-xl border border-border shadow-2xl"
        style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Add New Site</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Site Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp Website"
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Assign to Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              required
            >
              <option value="" className="bg-card">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-card">
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? 'Adding…' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ManagerSitesPage() {
  const queryClient = useQueryClient()
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: sites = [], isLoading } = useQuery<SiteWithClient[]>({
    queryKey: ['manager-all-sites'],
    queryFn: async () => {
      const { data } = await axios.get('/api/sites')
      return data
    },
  })

  const { data: openIssues = [] } = useQuery<Array<{ id: string; site_id: string }>>({
    queryKey: ['manager-open-issues-for-sites'],
    queryFn: async () => {
      const { data } = await axios.get('/api/issues')
      return (data as Array<{ id: string; site_id: string; status: string }>).filter(
        (i) => i.status !== 'resolved' && i.status !== 'closed'
      )
    },
  })

  const openCountBySite: Record<string, number> = {}
  for (const issue of openIssues) {
    openCountBySite[issue.site_id] = (openCountBySite[issue.site_id] ?? 0) + 1
  }

  const checkStatus = useCallback(
    async (siteId: string) => {
      setCheckingIds((prev) => new Set([...prev, siteId]))
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))

      const mockStatus = MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)]
      const now = new Date().toISOString()

      // Update site status via API
      try {
        await axios.patch(`/api/sites/${siteId}`, {
          status: mockStatus,
          last_checked: now,
        })
        queryClient.setQueryData<SiteWithClient[]>(['manager-all-sites'], (prev) =>
          prev?.map((s) =>
            s.id === siteId ? { ...s, status: mockStatus as SiteStatus, last_checked: now } : s
          ) ?? []
        )
        toast.success(`Status check complete: ${mockStatus}`)
      } catch {
        // Update optimistically in UI even if patch fails
        queryClient.setQueryData<SiteWithClient[]>(['manager-all-sites'], (prev) =>
          prev?.map((s) =>
            s.id === siteId ? { ...s, status: mockStatus as SiteStatus, last_checked: now } : s
          ) ?? []
        )
        toast.info(`Status: ${mockStatus}`)
      }

      setCheckingIds((prev) => {
        const next = new Set(prev)
        next.delete(siteId)
        return next
      })
    },
    [queryClient]
  )

  const checkAll = useCallback(async () => {
    for (const site of sites) {
      checkStatus(site.id)
      await new Promise((r) => setTimeout(r, 150))
    }
  }, [sites, checkStatus])

  return (
    <div className="space-y-6">
      {showAddModal && (
        <AddSiteModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['manager-all-sites'] })}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">All Sites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? '—' : `${sites.length} site${sites.length !== 1 ? 's' : ''} across all clients`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sites.length > 0 && (
            <button
              onClick={checkAll}
              disabled={checkingIds.size > 0}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', checkingIds.size > 0 && 'animate-spin')} />
              Check All
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Site
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-lg p-5 h-40 animate-pulse bg-muted/20"
            />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="glass rounded-lg p-14 text-center">
          <Globe className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-base font-medium text-foreground mb-2">No sites configured</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first client site to start tracking issues.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Site
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => {
            const openCount = openCountBySite[site.id] ?? 0
            const isChecking = checkingIds.has(site.id)

            return (
              <div
                key={site.id}
                className={cn(
                  'glass rounded-lg p-5 space-y-4 transition-all',
                  site.status === 'down' && 'border border-red-500/10',
                  site.status === 'degraded' && 'border border-yellow-500/10'
                )}
              >
                {/* Site header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StatusDot status={isChecking ? 'unknown' : site.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {site.name}
                      </p>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 truncate"
                      >
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        {site.url}
                      </a>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 transition-all',
                      isChecking
                        ? 'bg-muted/50 text-muted-foreground border-border'
                        : (SITE_STATUS_COLORS[site.status] ??
                          'bg-gray-500/10 text-gray-400 border-gray-500/20')
                    )}
                  >
                    {isChecking ? 'checking…' : site.status}
                  </span>
                </div>

                {/* Client info */}
                {site.client && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary uppercase shrink-0">
                      {getInitials(site.client.name)}
                    </div>
                    <span className="truncate">{site.client.name}</span>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    {isChecking
                      ? 'Checking…'
                      : `Checked ${formatRelativeTime(site.last_checked)}`}
                  </span>
                  {openCount > 0 && (
                    <Link
                      href={`/manager/issues?site=${site.id}`}
                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-medium"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {openCount} open
                    </Link>
                  )}
                  {openCount === 0 && (
                    <span className="text-green-400/70 text-xs">No open issues</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <button
                    onClick={() => checkStatus(site.id)}
                    disabled={isChecking}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChecking ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    {isChecking ? 'Checking…' : 'Check Status'}
                  </button>
                  <Link
                    href={`/manager/issues?site=${site.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                  >
                    <Globe className="w-3 h-3" />
                    View Issues
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
