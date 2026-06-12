'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, CheckCheck, X, AlertCircle, CheckCircle, MessageSquare, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { useNotifications } from '@/lib/hooks/useNotifications'
import type { Notification } from '@/lib/types'

const notificationIcons: Record<string, React.ElementType> = {
  resolved: CheckCircle,
  response: MessageSquare,
  response_added: MessageSquare,
  status: Activity,
  info: AlertCircle,
}

const notificationIconColors: Record<string, string> = {
  resolved: 'bg-green-500/10 text-green-400',
  response: 'bg-blue-500/10 text-blue-400',
  response_added: 'bg-blue-500/10 text-blue-400',
  status: 'bg-purple-500/10 text-purple-400',
  info: 'bg-muted text-muted-foreground',
}

interface NotificationBellProps {
  userId: string
  role?: 'client' | 'manager'
}

export function NotificationBell({ userId, role = 'client' }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [bouncing, setBouncing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevUnreadRef = useRef(0)

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId)

  useEffect(() => { setMounted(true) }, [])

  // Trigger bounce animation whenever unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBouncing(true)
      const t = setTimeout(() => setBouncing(false), 2000)
      prevUnreadRef.current = unreadCount
      return () => clearTimeout(t)
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount])

  // Close on outside click — must check both button and portal dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!buttonRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen((v) => !v)
  }

  const issueHref = (n: Notification) => {
    if (!n.issue_id) return '#'
    return role === 'manager' ? `/manager/issues/${n.issue_id}` : `/issues/${n.issue_id}`
  }

  const handleClickNotification = (n: Notification) => {
    if (!n.read) markAsRead(n.id)
    setOpen(false)
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      className="fixed w-80 rounded-xl overflow-hidden animate-slide-up"
      style={{
        top: dropdownPos.top,
        right: dropdownPos.right,
        zIndex: 9999,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">Notifications</span>
          {unreadCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              title="Mark all read"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
            <Bell className="w-7 h-7 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 8).map((n) => {
            const Icon = notificationIcons[n.type] ?? AlertCircle
            const iconColor = notificationIconColors[n.type] ?? notificationIconColors.info
            return (
              <Link
                key={n.id}
                href={issueHref(n)}
                onClick={() => handleClickNotification(n)}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 border-l-2',
                  !n.read
                    ? 'bg-blue-50/60 border-l-blue-500'
                    : 'border-l-transparent'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    iconColor
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                  {n.issue && (
                    <p className="text-xs text-blue-600 mt-0.5 truncate font-medium">
                      {n.issue.title}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </Link>
            )
          })
        )}
      </div>

      {notifications.length > 8 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <Link
            href={role === 'manager' ? '/manager/notifications' : '/notifications'}
            onClick={() => setOpen(false)}
            className="text-xs text-blue-600 hover:underline w-full text-center block"
          >
            View all {notifications.length} notifications
          </Link>
        </div>
      )}
    </div>
  ) : null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          'relative p-2 rounded-lg transition-all duration-150',
          open
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Bell className={cn('w-4 h-4', bouncing && 'animate-bounce')} />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 bg-destructive text-[9px] font-bold text-white rounded-full flex items-center justify-center ring-[1.5px] ring-card leading-none',
              bouncing && 'animate-bounce'
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {mounted && createPortal(dropdown, document.body)}
    </div>
  )
}
