import { useQuery } from '@tanstack/react-query'
import { fetchStudentStats, fetchModulDistribution, fetchFeedbackAspectAvg } from '../lib/analitik'

export function useStudentStats() {
  return useQuery({ queryKey: ['analitik', 'studentStats'], queryFn: fetchStudentStats })
}

export function useModulDistributionStats() {
  return useQuery({ queryKey: ['analitik', 'modulDistribution'], queryFn: fetchModulDistribution })
}

export function useFeedbackAspectAvg() {
  return useQuery({ queryKey: ['analitik', 'feedbackAspectAvg'], queryFn: fetchFeedbackAspectAvg })
}
