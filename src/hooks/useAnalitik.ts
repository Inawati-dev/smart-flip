import { useQuery } from '@tanstack/react-query'
import { fetchStudentStats, fetchModulDistribution, fetchFeedbackAspectAvg, fetchRecentActivity } from '../lib/analitik'

export function useStudentStats() {
  return useQuery({ queryKey: ['analitik', 'studentStats'], queryFn: fetchStudentStats })
}

export function useRecentActivity(limit = 5) {
  return useQuery({ queryKey: ['analitik', 'recentActivity', limit], queryFn: () => fetchRecentActivity(limit) })
}

export function useModulDistributionStats() {
  return useQuery({ queryKey: ['analitik', 'modulDistribution'], queryFn: fetchModulDistribution })
}

export function useFeedbackAspectAvg() {
  return useQuery({ queryKey: ['analitik', 'feedbackAspectAvg'], queryFn: fetchFeedbackAspectAvg })
}
