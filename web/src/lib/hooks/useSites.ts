import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { Site } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL || ''

export function useSites() {
  return useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/sites`)
      return data
    },
  })
}

export function useSite(id: string) {
  return useQuery<Site>({
    queryKey: ['sites', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/api/sites/${id}`)
      return data
    },
    enabled: !!id,
  })
}
