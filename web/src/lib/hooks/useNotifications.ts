'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification as AppNotification } from '@/lib/types'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  // useMemo with [] ensures one stable client instance across all renders
  const supabase = useMemo(() => createClient(), [])
  // useRef always comes after useMemo — order never changes conditionally
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('notifications')
      .select('*, issue:issues(id, title, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error && data) {
      setNotifications(data as AppNotification[])
      setUnreadCount(data.filter((n) => !n.read).length)
    }
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    if (!userId) return

    fetchNotifications()

    // Tear down any stale channel from a previous render (handles React Strict
    // Mode's double-invoke and userId changes without leaking subscriptions).
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Random suffix guarantees a fresh channel name even when the effect fires
    // multiple times within the same millisecond (Strict Mode).
    const channelName = `notif-${userId}-${Math.random().toString(36).slice(2)}`

    // .on() MUST be chained before .subscribe() — the Supabase client rejects
    // any .on() call made after the channel is already in subscribing/subscribed state.
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, fetchNotifications, supabase])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    [supabase]
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [userId, supabase])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
