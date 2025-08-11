import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, CircleDollarSign } from "lucide-react";
import AdminPanel from "@/components/admin/AdminPanel";
import { useCreditBalance } from "@/hooks/useCreditBalance";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { balance, loading } = useCreditBalance();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? "text-brand" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded hover:bg-foreground/5" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-gradient-brand" aria-hidden />
              <span className="text-sm font-semibold tracking-wide">UGC Flow</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass} end>
              Dashboard
            </NavLink>
            <NavLink to="/videos" className={navLinkClass}>Videos</NavLink>
            <NavLink to="/branding" className={navLinkClass}>Branding</NavLink>
            <NavLink to="/billing" className={navLinkClass}>Billing</NavLink>
            <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border border-foreground/10">
              Créditos: <span className="ml-1 font-semibold">{loading ? '—' : (balance ?? 0)}</span>
            </Badge>
            <Button variant="brand" size="sm" asChild>
              <Link to="/billing" aria-label="Ir a Billing">
                <CircleDollarSign className="mr-1" /> Comprar
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
      <AdminPanel />
    </div>
  );
};

export default AppShell;
