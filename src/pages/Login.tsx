import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Login = () => {
  return (
    <>
      <SEO
        title="Login | UGC Flow"
        description="Autenticación por email y Google (pendiente conexión Supabase)."
        canonical="/login"
      />
      <div className="min-h-[60vh] grid place-items-center">
        <div className="w-full max-w-sm rounded-xl border border-border p-6 surface-card">
          <h1 className="text-xl font-semibold mb-2">Inicia sesión</h1>
          <p className="text-sm text-muted-foreground mb-4">Conecta con Supabase para activar el login real.</p>
          <div className="grid gap-2">
            <Button variant="brand">Continuar con Google</Button>
            <Button variant="outline">Continuar con Email</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
