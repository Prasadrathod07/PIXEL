'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCheck,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Activity,
  ChevronLeft,
  ChevronRight,
  Zap,
  Megaphone,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

const PAGE_SIZE = 15

const notificationIcons: Record<string, React.ElementType> = {
  resolved: CheckCircle,
  response: MessageSquare,
  response_added: MessageSquare,
  status: Activity,
  new_issue: Zap,
  client_update: MessageSquare,
  info: Info,
  announcement: Megaphone,
}

const notificationIconColors: Record<string, string> = {
  resolved: 'bg-green-500/10 text-green-400',
  response: 'bg-blue-500/10 text-blue-400',
  response_added: 'bg-blue-500/10 text-blue-400',
  status: 'bg-purple-500/10 text-purple-400',
  new_issue: 'bg-amber-500/10 text-amber-400',
  client_update: 'bg-cyan-500/10 text-cyan-400',
  info: 'bg-muted text-muted-foreground',
  announcement: 'bg-primary/10 text-primary',
}

type Filter = 'all' | 'unread' | 'read'

interface NotificationsViewProps {
  role: 'client' | 'manager'
}

export function NotificationsView({ role }: NotificationsViewProps) {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string>()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [supabase])

  const fetchPage = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    let query = supabase
      .from('notifications')
      .select('*, issue:issues(id, title, status)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (filter === 'unread') query = query.eq('read', false)
    if (filter === 'read') query = query.eq('read', true)

    const { data, count, error } = await query
    if (!error && data) {
      setNotifications(data as Notification[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [userId, filter, page, supabase])

  useEffect(() => { fetchPage() }, [fetchPage])
  useEffect(() => { setPage(0) }, [filter])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications-page:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchPage())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase, fetchPage])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = async () => {
    if (!userId) return
    setMarkingAll(true)
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    await fetchPage()
    setMarkingAll(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const unreadInList = notifications.filter((n) => !n.read).length

  const issueHref = (n: Notification) => {
    if (!n.issue_id) return '#'
    return role === 'manager' ? `/manager/issues/${n.issue_id}` : `/issues/${n.issue_id}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Notifications</h1>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">({total} total)</span>
          )}
        </div>
        {unreadInList > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-border/50 w-fit">
        {(['all', 'unread', 'read'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium capitalize transition-all duration-150',
              filter === f
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted/50 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted/50 rounded w-3/4" />
                  <div className="h-2.5 bg-muted/30 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Bell className="w-10 h-10 opacity-15" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs opacity-60">
              {filter !== 'all' ? `No ${filter} notifications` : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {notifications.map((n) => {
              const Icon = notificationIcons[n.type] ?? AlertCircle
              const iconColor = notificationIconColors[n.type] ?? notificationIconColors.info
              return (
                <Link
                  key={n.id}
                  href={issueHref(n)}
                  onClick={() => { if (!n.read) markAsRead(n.id) }}
                  className={cn(
                    'flex items-start gap-4 px-5 py-4 transition-colors hover:bg-accent/20 border-l-2 group',
                    !n.read ? 'bg-primary/5 border-l-blue-500/60' : 'border-l-transparent'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', iconColor)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{n.message}</p>
                    {n.issue && (
                      <p className="text-xs text-primary/70 mt-1 font-medium truncate">{n.issue.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1" title={formatDateTime(n.created_at)}>
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                    page === pageNum
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
