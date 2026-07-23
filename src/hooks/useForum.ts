import { useQuery } from '@tanstack/react-query'
import { fetchPosts } from '../lib/forum'

export function useForumPosts(moduleId: number | null = null) {
  return useQuery({ queryKey: ['forum', 'posts', moduleId], queryFn: () => fetchPosts(moduleId) })
}
