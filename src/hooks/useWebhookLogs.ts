import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WebhookLog {
  id: string;
  direction: 'incoming' | 'outgoing';
  event_type: string | null;
  status: number | null;
  payload: any;
  response_data: any;
  error: string | null;
  execution_time_ms: number | null;
  request_size_bytes: number | null;
  idempotency_key: string | null;
  request_id: string | null;
  provider: string | null;
  created_at: string;
}

interface UseWebhookLogsProps {
  direction?: 'all' | 'incoming' | 'outgoing';
  status?: 'all' | 'success' | 'error';
  eventType?: string;
  autoRefresh?: boolean;
}

export const useWebhookLogs = ({
  direction = 'all',
  status = 'all',
  eventType = '',
  autoRefresh = false
}: UseWebhookLogsProps = {}) => {
  const { data: webhookLogs, isLoading, error, refetch } = useQuery({
    queryKey: ['webhook-logs', direction, status, eventType],
    queryFn: async () => {
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (direction !== 'all') {
        query = query.eq('direction', direction);
      }

      if (status === 'success') {
        query = query.gte('status', 200).lt('status', 300);
      } else if (status === 'error') {
        query = query.or('status.gte.400,status.is.null');
      }

      if (eventType) {
        query = query.ilike('event_type', `%${eventType}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as WebhookLog[];
    },
    refetchInterval: autoRefresh ? 5000 : false, // 5 seconds when enabled
  });

  const stats = webhookLogs ? {
    total: webhookLogs.length,
    successful: webhookLogs.filter(log => log.status && log.status >= 200 && log.status < 300).length,
    failed: webhookLogs.filter(log => !log.status || log.status >= 400).length,
    averageResponseTime: webhookLogs
      .filter(log => log.execution_time_ms)
      .reduce((acc, log) => acc + (log.execution_time_ms || 0), 0) / 
      webhookLogs.filter(log => log.execution_time_ms).length || 0
  } : null;

  return {
    webhookLogs: webhookLogs || [],
    loading: isLoading,
    error,
    refetch,
    stats,
  };
};