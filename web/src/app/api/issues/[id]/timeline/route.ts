import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyManagersClientUpdate } from '@/lib/utils/notifications'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*, author:users(*)')
    .eq('issue_id', id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('timeline_events')
    .insert({ ...body, issue_id: id, author_id: user.id })
    .select('*, author:users(id, name, email, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If a client added a comment, notify all managers
  if (profile.role === 'client') {
    const { data: issue } = await supabase
      .from('issues')
      .select('title')
      .eq('id', id)
      .single()

    if (issue) {
      await notifyManagersClientUpdate(id, issue.title, profile.name)
    }
  }

  return NextResponse.json(data, { status: 201 })
}
