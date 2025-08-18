'use client'

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

interface Props { children: React.ReactNode }

export const RequireAuth = ({ children }: Props) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!checking && !authenticated) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [checking, authenticated, router, pathname]);

  if (checking) return null;
  if (!authenticated) return null;
  return <>{children}</>;
};

export default RequireAuth;