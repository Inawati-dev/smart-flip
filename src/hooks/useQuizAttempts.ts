import { useQuery } from '@tanstack/react-query'
import { fetchQuizAttempts } from '../lib/quizAttempts'

export function useQuizAttempts(moduleId: number) {
  return useQuery({
    queryKey: ['quizAttempts', moduleId],
    queryFn: () => fetchQuizAttempts(moduleId),
  })
}
