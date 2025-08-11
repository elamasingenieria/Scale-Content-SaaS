import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Settings } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
}

interface LedgerRow {
  id: string;
  amount: number;
  source: string;
  event_id: string | null;
  created_at: string;
}

const AdminPanel = () => {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [grantAmount, setGrantAmount] = useState<number>(10);
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Check admin role
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!error) {
        setIsAdmin((data || []).some((r: any) => r.role === "admin"));
      }
    };
    load();
  }, []);

  const canShow = isAdmin;

  // Search profiles by email
  useEffect(() => {
    const run = async () => {
      if (!canShow) return;
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .ilike("email", `%${query}%`)
        .limit(10);
      if (!error) setResults(data as any);
    };
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [query, canShow]);

  const refreshUserData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: balData } = await supabase
        .from("v_credit_balances")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      setBalance(balData?.balance ?? 0);

      const { data: ledgerData } = await supabase
        .from("credits_ledger")
        .select("id, amount, source, event_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      setLedger((ledgerData as any) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selected) {
      refreshUserData(selected.id);
    } else {
      setBalance(null);
      setLedger([]);
    }
  }, [selected]);

  const grant = async () => {
    if (!selected) return;
    if (!grantAmount || grantAmount <= 0) {
      toast({ title: "Monto inválido", description: "Ingresa un número mayor a 0" });
      return;
    }
    const eventId = `admin_grant:${selected.id}:${Date.now()}`;
    const { error } = await supabase.rpc("rpc_grant_credits", {
      p_user_id: selected.id,
      p_amount: grantAmount,
      p_source: "admin_grant",
      p_event_id: eventId,
      p_note: "Asignación manual desde Admin Panel",
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message });
      return;
    }
    toast({ title: "Créditos asignados", description: `+${grantAmount} a ${selected.email}` });
    refreshUserData(selected.id);
  };

  if (!canShow) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full shadow-md">
            <Settings className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[420px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Admin · Créditos</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Buscar usuario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Email contiene..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {results.length > 0 && (
                  <div className="max-h-48 overflow-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="truncate max-w-[180px]">{p.email}</TableCell>
                            <TableCell className="truncate max-w-[120px]">{p.display_name}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => setSelected(p)}>
                                Elegir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {selected && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Saldo y asignación</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{selected.email}</div>
                        <div className="text-muted-foreground">{selected.id}</div>
                      </div>
                      <Badge variant="secondary">Saldo: {balance ?? 0}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={grantAmount}
                        onChange={(e) => setGrantAmount(parseInt(e.target.value, 10))}
                        className="w-28"
                      />
                      <Button onClick={grant} disabled={loading}>
                        Asignar créditos
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Movimientos recientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-72 overflow-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Fuente</TableHead>
                            <TableHead>Evento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledger.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-nowrap">
                                {new Date(row.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell className={row.amount > 0 ? "text-green-600" : "text-red-600"}>
                                {row.amount > 0 ? `+${row.amount}` : row.amount}
                              </TableCell>
                              <TableCell>{row.source}</TableCell>
                              <TableCell className="truncate max-w-[200px]">{row.event_id}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminPanel;
