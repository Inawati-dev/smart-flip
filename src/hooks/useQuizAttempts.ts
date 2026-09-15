import { useQuery } from '@tanstack/react-query'
import { fetchQuizAttempts, fetchAllQuizAttemptsOnce } from '../lib/quizAttempts'

export function useQuizAttempts(moduleId: number) {
  return useQuery({
    queryKey: ['quizAttempts', moduleId],
    queryFn: () => fetchQuizAttempts(moduleId),
  })
}

export function useAllQuizAttempts() {
  return useQuery({
    queryKey: ['quizAttempts', 'all'],
    queryFn: () => fetchAllQuizAttemptsOnce(),
  })
}
