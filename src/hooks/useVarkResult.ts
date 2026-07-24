import { useQuery } from '@tanstack/react-query'
import { fetchVarkResult } from '../lib/vark'

export function useVarkResult() {
  return useQuery({ queryKey: ['vark'], queryFn: fetchVarkResult })
}
