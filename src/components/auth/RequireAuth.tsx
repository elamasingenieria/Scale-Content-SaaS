import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props { children: React.ReactNode }

const RequireAuth = ({ children }: Props) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

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

  if (checking) return null;
  if (!authenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
};

export default RequireAuth;
