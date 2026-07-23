import { useQuery } from '@tanstack/react-query'
import { fetchFeedback } from '../lib/feedback'

export function useFeedback(moduleId: number | null, viewerRole: 'mahasiswa' | 'dosen' | null) {
  return useQuery({
    queryKey: ['feedback', moduleId, viewerRole],
    queryFn: () => fetchFeedback(moduleId, viewerRole),
  })
}
