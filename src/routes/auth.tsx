import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Acesse sua conta — ClinicFlow AI" }, { name: "description", content: "Entre ou crie sua conta ClinicFlow AI." },
    { property: "og:title", content: "Acesse sua conta — ClinicFlow AI" }, { property: "og:description", content: "Entre ou crie sua conta ClinicFlow AI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}), component: AuthPage,
});
function AuthPage() {
  const navigate = useNavigate(); const [mode,setMode]=useState<"login"|"signup"|"forgot">("login");
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [show,setShow]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{ void supabase.auth.getUser().then(({data})=>{ if(data.user) void navigate({to:"/dashboard",replace:true}); }); },[navigate]);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError("");setMessage(""); try {
    if(mode==="forgot"){const {error:err}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`}); if(err) throw err; setMessage("Enviamos as instruções de recuperação para o seu e-mail."); return;}
    if(mode==="signup"){const {data,error:err}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin,data:{full_name:name}}}); if(err) throw err; if(data.user) await supabase.from("profiles").upsert({id:data.user.id,full_name:name}); if(!data.session){setMessage("Conta criada. Confirme seu e-mail para continuar.");return;} await navigate({to:"/onboarding"});return;}
    const {error:err}=await supabase.auth.signInWithPassword({email,password}); if(err) throw err; await navigate({to:"/dashboard"});
  } catch(err){setError(err instanceof Error?err.message:"Não foi possível continuar.");} finally{setBusy(false)}};
  const google=async()=>{setError("");const result=await lovable.auth.signInWithOAuth("google",{redirect_uri:window.location.origin});if(result.error)setError(result.error.message);};
  return <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-brand-ink p-14 text-brand-ink-foreground lg:flex lg:flex-col">
      <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground text-xl font-bold">C</div><span className="font-display text-xl font-semibold">ClinicFlow AI</span></div>
      <div className="my-auto max-w-xl"><p className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-brand-mint">Gestão clínica, sem ruído</p><h1 className="font-display text-5xl font-semibold leading-[1.1]">Sua clínica inteira em um só fluxo.</h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-brand-ink-foreground/65">Cuide da operação, da equipe e dos pacientes com clareza — da primeira avaliação ao financeiro.</p><div className="mt-10 grid gap-4 text-sm text-brand-ink-foreground/75">{["Visão unificada de todas as unidades","Rotinas seguras para cada perfil da equipe","Indicadores práticos para decisões melhores"].map(x=><div key={x} className="flex items-center gap-3"><CheckCircle2 className="size-5 text-brand-mint"/>{x}</div>)}</div></div>
      <p className="text-xs text-brand-ink-foreground/40">Tecnologia que acompanha o cuidado.</p>
    </section>
    <section className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-md">
      <div className="mb-9 lg:hidden"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">C</div><span className="font-display text-lg font-semibold">ClinicFlow AI</span></div></div>
      <p className="text-sm font-semibold text-primary">{mode==="login"?"Bem-vindo de volta":mode==="signup"?"Comece agora":"Recupere seu acesso"}</p><h2 className="mt-2 font-display text-3xl font-semibold">{mode==="login"?"Entre na sua conta":mode==="signup"?"Crie sua conta":"Esqueceu sua senha?"}</h2><p className="mt-2 text-sm text-muted-foreground">{mode==="forgot"?"Informe seu e-mail e enviaremos um link seguro.":"Acesse o ambiente da sua clínica com segurança."}</p>
      <form onSubmit={submit} className="mt-8 space-y-5">{mode==="signup"&&<div><Label htmlFor="name">Nome completo</Label><Input id="name" className="mt-2 h-11" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120}/></div>}<div><Label htmlFor="email">E-mail profissional</Label><Input id="email" type="email" className="mt-2 h-11" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={255}/></div>{mode!=="forgot"&&<div><div className="flex items-center justify-between"><Label htmlFor="password">Senha</Label>{mode==="login"&&<button type="button" className="text-xs font-semibold text-primary" onClick={()=>setMode("forgot")}>Esqueci minha senha</button>}</div><div className="relative mt-2"><Input id="password" type={show?"text":"password"} className="h-11 pr-11" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} maxLength={72}/><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={()=>setShow(!show)} aria-label="Mostrar senha">{show?<EyeOff/>:<Eye/>}</Button></div></div>}
        {error&&<p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{message&&<p className="rounded-md bg-success/10 p-3 text-sm text-success">{message}</p>}<Button className="h-11 w-full" disabled={busy}>{busy?"Aguarde...":mode==="login"?"Entrar":mode==="signup"?"Criar conta":"Enviar link"}<ArrowRight/></Button>
      </form>{mode!=="forgot"&&<><div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-border"/><span className="text-xs text-muted-foreground">ou continue com</span><div className="h-px flex-1 bg-border"/></div><Button variant="outline" className="h-11 w-full" onClick={()=>void google()}><span className="text-base font-bold">G</span> Google</Button></>}
      <p className="mt-7 text-center text-sm text-muted-foreground">{mode==="login"?"Ainda não tem uma conta? ":"Já possui uma conta? "}<button className="font-semibold text-primary" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Criar conta":"Entrar"}</button></p>
    </div></section>
  </div>;
}
