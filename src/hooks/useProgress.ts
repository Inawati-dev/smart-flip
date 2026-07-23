import { useQuery } from '@tanstack/react-query'
import { fetchAllProgress, fetchTotalTimeSpent } from '../lib/progress'

export function useAllProgress() {
  return useQuery({ queryKey: ['progress', 'all'], queryFn: fetchAllProgress })
}

export function useTotalTimeSpent() {
  return useQuery({ queryKey: ['progress', 'totalTimeSpent'], queryFn: fetchTotalTimeSpent })
}
