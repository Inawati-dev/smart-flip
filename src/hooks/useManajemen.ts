import { useQuery } from '@tanstack/react-query'
import { getModulOrder, getModulCustomMap } from '../lib/manajemen'

export function useModulOrder() {
  return useQuery({ queryKey: ['manajemen', 'order'], queryFn: getModulOrder })
}

export function useModulCustoms(moduleIds: number[]) {
  return useQuery({
    queryKey: ['manajemen', 'customs', moduleIds],
    queryFn: () => getModulCustomMap(moduleIds),
    enabled: moduleIds.length > 0,
  })
}
