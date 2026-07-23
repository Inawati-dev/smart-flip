import { useQuery } from '@tanstack/react-query'
import { fetchDrafts } from '../lib/draf'

export function useDrafts(isDosen: boolean, moduleId: number | null = null) {
  return useQuery({ queryKey: ['drafts', isDosen, moduleId], queryFn: () => fetchDrafts(isDosen, moduleId) })
}
