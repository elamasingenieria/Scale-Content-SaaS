import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchBalance = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { data, error } = await supabase
      .from("v_credit_balances")
      .select("balance")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      setError(error.message);
    } else {
      setBalance(data?.balance ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      userIdRef.current = uid;
      if (!mounted) return;
      await fetchBalance();

      if (uid) {
        // Subscribe to ledger changes to refresh balance in real time
        const channel = supabase
          .channel(`credits-${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'credits_ledger' },
            (payload) => {
              const row: any = payload.new || payload.old;
              if (row && row.user_id === uid) {
                fetchBalance();
              }
            }
          )
          .subscribe();
        channelRef.current = channel;
      }

      // React to auth changes
      const { data: authSub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
        userIdRef.current = session?.user?.id ?? null;
        await fetchBalance();
      });

      return () => {
        authSub.subscription.unsubscribe();
      };
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { balance, loading, error, refresh: fetchBalance };
}
