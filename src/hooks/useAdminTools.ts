import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WEBHOOK_TYPES } from '@/lib/types/webhook';

export const useAdminTools = () => {
  const { toast } = useToast();
  
  // Credit granting
  const [email, setEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState<number>(10);
  const [grantLoading, setGrantLoading] = useState(false);

  // n8n webhook testing
  const [n8nBody, setN8nBody] = useState<string>(
    JSON.stringify({ source: "admin-ui", ts: Date.now() }, null, 2)
  );
  const [n8nLoading, setN8nLoading] = useState(false);

  const grantCredits = useCallback(async () => {
    try {
      setGrantLoading(true);
      // Find user by email
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", email)
        .limit(1);
      
      if (pErr) throw pErr;
      if (!profiles || profiles.length === 0) throw new Error("Usuario no encontrado");
      
      const userId = profiles[0].id as string;
      const eventId = `admin:grant:${userId}:${Date.now()}`;
      
      const { error: rpcErr } = await supabase.rpc("rpc_grant_credits", {
        p_user_id: userId,
        p_amount: grantAmount,
        p_source: "purchase" as any,
        p_event_id: eventId,
        p_note: `Grant manual desde Admin a ${email}`,
      });
      
      if (rpcErr) throw rpcErr;
      toast({ title: "Créditos acreditados", description: `+${grantAmount} a ${email}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || String(e), variant: "destructive" });
    } finally {
      setGrantLoading(false);
    }
  }, [email, grantAmount, toast]);

  const sendN8n = useCallback(async () => {
    const n8nUrl = "https://devwebhookn8n.ezequiellamas.com/webhook/f4914fae-9e10-442f-88bc-f80ee2a5f244";
    
    if (!n8nBody.trim()) {
      toast({
        title: 'Error',
        description: 'El cuerpo del webhook no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(n8nBody);
    } catch {
      toast({
        title: 'Error',
        description: 'El JSON no es válido',
        variant: 'destructive'
      });
      return;
    }
    
    const idempotencyKey = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      setN8nLoading(true);
      const requestSizeBytes = new TextEncoder().encode(n8nBody).length;

      // Log outgoing webhook
      await supabase.from('webhook_logs').insert({
        direction: 'outgoing',
        event_type: WEBHOOK_TYPES.ADMIN_TEST,
        status: 0, // Will be updated after response
        payload: parsedBody,
        provider: 'admin_panel',
        idempotency_key: idempotencyKey,
        request_size_bytes: requestSizeBytes
      });

      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Contract-Version": "1",
          "Idempotency-Key": idempotencyKey
        },
        body: n8nBody,
      });

      const executionTime = Date.now() - startTime;
      const responseText = await res.text();

      // Update webhook log with response
      await supabase.from('webhook_logs').update({
        status: res.status,
        response_data: responseText,
        execution_time_ms: executionTime
      }).eq('idempotency_key', idempotencyKey);

      toast({ 
        title: `n8n webhook: ${res.status}`, 
        description: responseText || 'Enviado correctamente'
      });
      
    } catch (e: any) {
      const executionTime = Date.now() - startTime;
      
      // Log error
      try {
        await supabase.from('webhook_logs').update({
          error: e.message,
          status: 500,
          execution_time_ms: executionTime
        }).eq('idempotency_key', idempotencyKey);
      } catch {}

      toast({ 
        title: "Error n8n", 
        description: e.message || String(e), 
        variant: "destructive" 
      });
    } finally {
      setN8nLoading(false);
    }
  }, [n8nBody, toast]);

  return {
    email,
    setEmail,
    grantAmount,
    setGrantAmount,
    grantLoading,
    grantCredits,
    n8nBody,
    setN8nBody,
    n8nLoading,
    sendN8n,
  };
};