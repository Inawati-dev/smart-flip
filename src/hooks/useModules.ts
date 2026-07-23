import { useQuery } from '@tanstack/react-query'
import { fetchModules, fetchModuleById } from '../lib/modules'

export function useModules() {
  return useQuery({ queryKey: ['modules'], queryFn: fetchModules })
}

export function useModule(id: number) {
  return useQuery({ queryKey: ['modules', id], queryFn: () => fetchModuleById(id) })
}
