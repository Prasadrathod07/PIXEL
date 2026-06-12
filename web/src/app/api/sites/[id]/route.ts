import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

  let query = supabase.from('sites').select('*').eq('id', id)
  if (profile?.role === 'client') query = query.eq('client_id', user.id)

  const { data: site, error } = await query.single()
  if (error || !site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: openIssues } = await supabase
    .from('issues')
    .select('id')
    .eq('site_id', id)
    .neq('status', 'resolved')
    .neq('status', 'closed')

  return NextResponse.json({
    ...site,
    open_issues_count: openIssues?.length ?? 0,
  })
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

  const body = await request.json()
  const { data, error } = await supabase
    .from('sites')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
