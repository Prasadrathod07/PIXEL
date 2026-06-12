import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyIssueResolved, notifyStatusChange } from '@/lib/utils/notifications'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: issue, error } = await supabase
    .from('issues')
    .select(
      '*, site:sites(*), creator:users!created_by(id, name, email, avatar_url), assignee:users!assigned_to(id, name, email, avatar_url)'
    )
    .eq('id', id)
    .single()

  if (error || !issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (profile?.role === 'client' && issue.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: timeline } = await supabase
    .from('timeline_events')
    .select('*, author:users(id, name, email, avatar_url)')
    .eq('issue_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ ...issue, timeline: timeline ?? [] })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden — manager only' }, { status: 403 })
  }

  const { data: current } = await supabase
    .from('issues')
    .select('status, severity, created_by, title')
    .eq('id', id)
    .single()

  const body = await request.json()

  const { data, error } = await supabase
    .from('issues')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (current) {
    if (body.status && body.status !== current.status) {
      const eventType =
        body.status === 'resolved'
          ? 'resolved'
          : body.status === 'closed'
          ? 'closed'
          : 'status_changed'

      await supabase.from('timeline_events').insert({
        issue_id: id,
        event_type: eventType,
        old_value: current.status,
        new_value: body.status,
        author_id: user.id,
      })

      if (body.status === 'resolved') {
        await notifyIssueResolved(id, current.title, current.created_by)
      } else {
        await notifyStatusChange(id, current.title, current.created_by, body.status)
      }
    }

    if (body.severity && body.severity !== current.severity) {
      await supabase.from('timeline_events').insert({
        issue_id: id,
        event_type: 'severity_changed',
        old_value: current.severity,
        new_value: body.severity,
        author_id: user.id,
      })
    }
  }

  return NextResponse.json(data)
}
