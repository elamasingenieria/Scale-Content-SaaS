'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, CircleDollarSign } from "lucide-react";
import AdminPanel from "@/components/admin/AdminPanel";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { useAdminRole } from "@/hooks/useAdminRole";
import UserMenu from "./UserMenu";

export const AppShell = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const {
    balance,
    loading
  } = useCreditBalance();
  const { isAdmin } = useAdminRole();
  
  const navLinkClass = (href: string) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "text-brand" : "text-muted-foreground hover:text-foreground"}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded hover:bg-foreground/5" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-gradient-brand" aria-hidden />
              <span className="text-sm font-semibold tracking-wide">UGC Flow</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className={navLinkClass('/')}>
              Dashboard
            </Link>
            <Link href="/videos" className={navLinkClass('/videos')}>Videos</Link>
            <Link href="/formularios" className={navLinkClass('/formularios')}>Formularios</Link>
            <Link href="/branding" className={navLinkClass('/branding')}>Branding</Link>
            <Link href="/billing" className={navLinkClass('/billing')}>Billing</Link>
            {isAdmin && <Link href="/admin" className={navLinkClass('/admin')}>Admin</Link>}
          </nav>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border border-foreground/10">
              Créditos: <span className="ml-1 font-semibold">{loading ? '—' : balance ?? 0}</span>
            </Badge>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/billing">
                <CircleDollarSign className="w-4 h-4 mr-1" />
                Comprar Créditos
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
      <AdminPanel />
    </div>
  );
};

export default AppShell;