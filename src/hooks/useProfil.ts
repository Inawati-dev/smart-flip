import { useQuery } from '@tanstack/react-query'
import { fetchProfilExtra } from '../lib/profil'

export function useProfilExtra() {
  return useQuery({ queryKey: ['profil', 'extra'], queryFn: fetchProfilExtra })
}
