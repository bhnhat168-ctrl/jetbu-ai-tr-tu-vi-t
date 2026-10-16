import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { Bot, Building2, Gauge, Scale, Library, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type Company } from "@/lib/workspace-store";

const NAV = [
  { to: "/", label: "Không gian AI Đa năng", icon: Bot },
  { to: "/chien-luoc", label: "Buồng lái Chiến lược 6 Chuyên gia", icon: Gauge },
  { to: "/phap-ly", label: "Cố vấn Pháp lý & Hợp đồng", icon: Scale },
  { to: "/tri-thuc", label: "Kho Tri thức Nhân loại", icon: Library },
  { to: "/quan-tri", label: "Trung tâm Quản trị Admin & GPS", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { company, switchCompany } = useWorkspace();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: companies = [], error, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id,name,code").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  useEffect(() => {
    if (!company && companies[0]) switchCompany(companies[0]);
  }, [companies, company, switchCompany]);

  const onSwitch = (id: string) => {
    const c = companies.find((x) => x.id === id);
    if (!c || c.id === company?.id) return;
    switchCompany(c);
    toast.success("Đã chuyển pháp nhân và làm sạch bộ nhớ đệm an toàn!");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-5 border-b border-border bg-sidebar p-4 text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r">
        <div>
          <p className="font-display text-xl font-bold text-primary">JETBU AI</p>
          <p className="text-xs text-muted-foreground">Siêu trí tuệ quản trị & cố vấn chiến lược</p>
        </div>
        <label className="block rounded-xl bg-card p-3 text-card-foreground shadow-sm">
          <span className="mb-1 flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" />Chuyển đổi Công ty</span>
          <select
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-base"
            value={company?.id ?? ""}
            onChange={(e) => onSwitch(e.target.value)}
            disabled={isLoading || !companies.length}
          >
            {isLoading && <option>Đang tải...</option>}
            {!isLoading && !companies.length && <option value="">{error ? "Lỗi tải danh sách" : "Chưa có công ty nào"}</option>}
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </label>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
