import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface ReportMeta {
  id: string;
  filename: string;
  author: string;
  topic: string;
  report_type: string;
  date: string;
  size_bytes: number;
  project_id?: string;
  task_id?: string;
  team_id?: string;
}

export interface ReportDetail extends ReportMeta {
  content: string;
}

export function useReports(reportType?: string, author?: string, projectId?: string) {
  const params = new URLSearchParams();
  if (reportType) params.set('report_type', reportType);
  if (author) params.set('author', author);
  if (projectId) params.set('project_id', projectId);
  const qs = params.toString();
  return useQuery({
    queryKey: ['reports', reportType, author, projectId],
    queryFn: () => apiFetch<ReportMeta[]>(`/api/reports${qs ? `?${qs}` : ''}`),
  });
}

export function useReportDetail(reportId: string | null) {
  return useQuery({
    queryKey: ['reports', 'detail', reportId],
    queryFn: () => apiFetch<ReportDetail>(`/api/reports/${reportId!}`),
    enabled: !!reportId,
  });
}
