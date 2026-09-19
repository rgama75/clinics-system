import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Building2, ChevronDown, LogOut, Menu, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { modules, administration, dashboardItem } from "@/lib/clinicflow";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Org = { id: string; trade_name: string };
type Unit = { id: string; name: string; organization_id: string };

export function AppShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow?: string }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [orgId, setOrgId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [userName, setUserName] = useState("Minha conta");
  const [email, setEmail] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setEmail(auth.user.email ?? "");
      const [{ data: profile }, { data: organizations }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle(),
        supabase.from("organizations").select("id, trade_name").order("created_at"),
      ]);
      setUserName(profile?.full_name ?? auth.user.user_metadata?.["full_name"] ?? "Minha conta");
      const nextOrgs = organizations ?? [];
      setOrgs(nextOrgs);
      const stored = window.localStorage.getItem("clinicflow-org");
      const selected = nextOrgs.find((o) => o.id === stored)?.id ?? nextOrgs[0]?.id ?? "";
      setOrgId(selected);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    window.localStorage.setItem("clinicflow-org", orgId);
    void supabase.from("units").select("id, name, organization_id").eq("organization_id", orgId).eq("active", true).order("is_headquarters", { ascending: false }).then(({ data }) => {
      const next = data ?? [];
      setUnits(next);
      setUnitId(next[0]?.id ?? "");
    });
  }, [orgId]);

  const initials = useMemo(() => userName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase(), [userName]);
  const nav = (slug: string) => slug === "dashboard" ? "/dashboard" : `/${slug}`;
  const signOut = async () => { await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); };

  const sidebar = <div className="flex h-full flex-col">
    <div className="flex h-18 items-center gap-3 border-b border-sidebar-border px-5">
      <div className="grid size-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><span className="text-lg font-semibold">C</span></div>
      <div><div className="font-display text-base font-semibold">ClinicFlow</div><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">Inteligência clínica</div></div>
    </div>
    <nav className="flex-1 overflow-y-auto px-3 py-5">
      <NavItem item={dashboardItem} href="/dashboard" active={pathname === "/dashboard"} />
      <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40">Operação</p>
      {modules.map((item) => <NavItem key={item.slug} item={item} href={nav(item.slug)} active={pathname === nav(item.slug)} />)}
      <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40">Administração</p>
      {administration.map((item) => <NavItem key={item.slug} item={item} href={nav(item.slug)} active={pathname === nav(item.slug)} />)}
    </nav>
    <div className="border-t border-sidebar-border p-3"><div className="rounded-md bg-sidebar-accent px-3 py-3 text-xs leading-relaxed text-sidebar-accent-foreground"><b>ClinicFlow AI</b><br/><span className="opacity-65">Ambiente protegido da sua clínica</span></div></div>
  </div>;

  return <div className="min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-72 bg-sidebar text-sidebar-foreground">{sidebar}</aside></div>}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-7">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></Button>
        <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-md border bg-muted/45 px-3 md:flex"><Search className="size-4 text-muted-foreground"/><input className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Buscar pacientes, agenda..." /></div>
        <div className="ml-auto flex items-center gap-2">
          {orgs.length > 0 && <Select value={orgId} onValueChange={setOrgId}><SelectTrigger className="hidden h-9 w-44 md:flex"><Building2 className="size-4"/><SelectValue /></SelectTrigger><SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.trade_name}</SelectItem>)}</SelectContent></Select>}
          {units.length > 0 && <Select value={unitId} onValueChange={setUnitId}><SelectTrigger className="hidden h-9 w-40 sm:flex"><SelectValue /></SelectTrigger><SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>}
          <Button variant="ghost" size="icon" aria-label="Notificações"><Bell /></Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 px-2"><Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar><span className="hidden max-w-28 truncate text-sm sm:block">{userName}</span><ChevronDown className="size-3"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel><span className="block truncate">{userName}</span><span className="block truncate text-xs font-normal text-muted-foreground">{email}</span></DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onClick={() => void signOut()}><LogOut/> Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </header>
      <main className="px-4 py-7 md:px-7 lg:px-9"><div className="mx-auto max-w-[1480px]"><div className="mb-7"><p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-primary">{eyebrow ?? "ClinicFlow AI"}</p><h1 className="font-display text-2xl font-semibold md:text-3xl">{title}</h1></div>{children}</div></main>
    </div>
  </div>;
}

function NavItem({ item, href, active }: { item: { label: string; icon: React.ComponentType<{className?: string}> }; href: string; active: boolean }) {
  const Icon = item.icon;
  return <Link to={href} className={cn("mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors", active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}><Icon className="size-4"/><span>{item.label}</span></Link>;
}
