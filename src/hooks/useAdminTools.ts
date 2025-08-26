import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    
    try {
      setN8nLoading(true);
      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: n8nBody,
      });
      toast({ title: `n8n: ${res.status}`, description: await res.text() });
    } catch (e: any) {
      toast({ title: "Error n8n", description: e.message || String(e), variant: "destructive" });
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