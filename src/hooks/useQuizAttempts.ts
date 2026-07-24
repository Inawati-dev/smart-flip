import { useQuery } from '@tanstack/react-query'
import { fetchQuizAttempts, fetchAllQuizAttempts } from '../lib/quizAttempts'
import { TOTAL_MODULES } from '../lib/progress'

export function useQuizAttempts(moduleId: number) {
  return useQuery({
    queryKey: ['quizAttempts', moduleId],
    queryFn: () => fetchQuizAttempts(moduleId),
  })
}

export function useAllQuizAttempts() {
  return useQuery({
    queryKey: ['quizAttempts', 'all'],
    queryFn: () => fetchAllQuizAttempts(TOTAL_MODULES),
  })
}
