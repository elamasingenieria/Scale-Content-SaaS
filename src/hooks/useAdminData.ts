import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdminData = () => {
  const { toast } = useToast();
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [userIntakes, setUserIntakes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const loadWebhookLogs = useCallback(async (statusFilter: string) => {
    setLoadingData(true);
    try {
      let query = supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter !== "all") {
        query = query.eq("status", parseInt(statusFilter));
      }

      const { data, error } = await query;
      if (error) throw error;
      setWebhookLogs(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  const loadPayments = useCallback(async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*, profiles!inner(email)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  const loadUserIntakes = useCallback(async (searchEmail: string) => {
    setLoadingData(true);
    try {
      let query = supabase
        .from("user_intake")
        .select("*, profiles!inner(email)")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (searchEmail) {
        query = query.ilike("profiles.email", `%${searchEmail}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUserIntakes(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [toast]);

  return {
    webhookLogs,
    payments,
    userIntakes,
    loadingData,
    loadWebhookLogs,
    loadPayments,
    loadUserIntakes,
  };
};