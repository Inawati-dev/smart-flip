import { useQuery } from '@tanstack/react-query'
import { fetchAllProgress } from '../lib/progress'

export function useAllProgress() {
  return useQuery({ queryKey: ['progress', 'all'], queryFn: fetchAllProgress })
}
