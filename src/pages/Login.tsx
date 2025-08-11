import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({ title: "Revisa tu email", description: "Te enviamos un enlace para confirmar tu cuenta." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Sesión iniciada", description: "Bienvenido/a" });
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Error de autenticación", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Error con Google", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Login | UGC Flow"
        description="Autenticación por email y Google"
        canonical="/login"
      />
      <div className="min-h-[60vh] grid place-items-center">
        <div className="w-full max-w-sm rounded-xl border border-border p-6 surface-card">
          <h1 className="text-xl font-semibold mb-2">{isSignUp ? "Crea tu cuenta" : "Inicia sesión"}</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {isSignUp
              ? "Regístrate con email y contraseña."
              : "Accede con tu cuenta o usa Google."}
          </p>

          <div className="grid gap-2 mb-4">
            <Button variant="brand" onClick={handleGoogle} disabled={loading}>Continuar con Google</Button>
          </div>

          <form onSubmit={handleEmailAuth} className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>{isSignUp ? "Crear cuenta" : "Entrar"}</Button>
          </form>

          <div className="mt-4 text-sm text-muted-foreground">
            {isSignUp ? (
              <span>
                ¿Ya tienes cuenta? <button className="underline" onClick={() => setIsSignUp(false)}>Inicia sesión</button>
              </span>
            ) : (
              <span>
                ¿No tienes cuenta? <button className="underline" onClick={() => setIsSignUp(true)}>Regístrate</button>
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Nota: configura el proveedor de Google en Supabase y revisa Site/Redirect URLs.
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
