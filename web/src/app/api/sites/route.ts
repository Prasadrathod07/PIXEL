import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
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
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let query = supabase.from('sites').select('*')
  if (profile.role === 'client') query = query.eq('client_id', user.id)

  const { data: sites, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!sites || sites.length === 0) return NextResponse.json([])

  // Compute open_issues_count per site
  const { data: openIssues } = await supabase
    .from('issues')
    .select('site_id')
    .in(
      'site_id',
      sites.map((s) => s.id)
    )
    .neq('status', 'resolved')
    .neq('status', 'closed')

  const countMap: Record<string, number> = {}
  for (const issue of openIssues ?? []) {
    countMap[issue.site_id] = (countMap[issue.site_id] ?? 0) + 1
  }

  return NextResponse.json(
    sites.map((site) => ({ ...site, open_issues_count: countMap[site.id] ?? 0 }))
  )
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()

  const body = await request.json()
  // Managers can assign a site to any client; clients always own their own sites
  const clientId = profile?.role === 'manager' && body.client_id ? body.client_id : user.id

  const { data, error } = await supabase
    .from('sites')
    .insert({ name: body.name, url: body.url, client_id: clientId, status: 'unknown' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
