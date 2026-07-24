import { useQuery } from '@tanstack/react-query'
import { getKelasByDosen } from '../lib/kelas'

export function useKelasByDosen(dosenId: string | undefined) {
  return useQuery({
    queryKey: ['kelas', 'byDosen', dosenId],
    queryFn: () => getKelasByDosen(dosenId as string),
    enabled: Boolean(dosenId),
  })
}
