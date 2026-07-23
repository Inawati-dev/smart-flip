import { useQuery } from '@tanstack/react-query'
import { fetchValidasi } from '../lib/validasi'

export function useValidasi() {
  return useQuery({
    queryKey: ['validasi'],
    queryFn: fetchValidasi,
  })
}
